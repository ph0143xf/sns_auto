import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "..", "..", "data", "threads")

const TIME_SLOT_BY_HOUR: Record<number, string> = {
  5: "morning", 6: "morning", 7: "morning", 8: "morning", 9: "morning",
  10: "noon", 11: "noon", 12: "noon", 13: "noon",
  14: "night1", 15: "night1", 16: "night1", 17: "night1", 18: "night1",
  19: "night2", 20: "night2", 21: "night2", 22: "night2", 23: "night2",
}

function guessTimeSlot(taken_at: number): string {
  const date = new Date(taken_at * 1000)
  const hour = date.getHours()
  return TIME_SLOT_BY_HOUR[hour] || "night1"
}

export async function POST() {
  try {
    // 既存データがあればスキップ
    const existingCount = await prisma.account.count()
    if (existingCount > 0) {
      return NextResponse.json({ message: "既にシードデータが存在します", skipped: true })
    }

    // アカウント作成
    const account = await prisma.account.create({
      data: {
        name: "uwaki_happy（メイン）",
        snsType: "threads",
        username: "uwaki_happy",
        target: "浮気・別れを経験した20〜30代女性。共感・癒し・勇気を求めている層。",
        worldview: "浮気された26歳女性がリアルタイムで感情をさらけ出す日記体SNS。「今この瞬間の感情」を武器にする。",
        theme: "浮気・別れ・自分軸・立ち直り・恋愛心理",
        isActive: true,
      },
    })

    // デフォルトシリーズ
    const series = await prisma.series.create({
      data: {
        accountId: account.id,
        name: "浮気発覚〜別れまで",
        description: "1年半の彼氏の浮気発覚から別れを決断するまでの記録",
        isActive: true,
      },
    })

    // インサイトデータ読み込み（インサイト付き版が最も充実）
    const insightsPath = path.join(DATA_DIR, "insights_uwaki_happy_2026-06-11T20-04-45.json")
    const insightsRaw = JSON.parse(fs.readFileSync(insightsPath, "utf-8"))

    // pkでインデックス化
    const insightsMap = new Map<string, typeof insightsRaw[0]>()
    for (const item of insightsRaw) {
      insightsMap.set(item.pk, item)
    }

    // 投稿データ読み込み
    const postsPath = path.join(DATA_DIR, "posts_uwaki_happy_all_2026-06-05T02-38-04.json")
    const postsRaw = JSON.parse(fs.readFileSync(postsPath, "utf-8"))

    // PKのユニオンで全投稿を取得
    const allPks = new Set([
      ...insightsRaw.map((i: { pk: string }) => i.pk),
      ...postsRaw.map((p: { pk: string }) => p.pk),
    ])

    let createdPosts = 0
    let createdInsights = 0

    for (const pk of allPks) {
      const insightData = insightsMap.get(pk)
      const postData = postsRaw.find((p: { pk: string }) => p.pk === pk)
      const source = insightData || postData
      if (!source) continue

      const takenAt = source.taken_at
      const text = source.text

      if (!text || !takenAt) continue

      const postDate = new Date(takenAt * 1000)
      const timeSlot = guessTimeSlot(takenAt)

      const post = await prisma.post.create({
        data: {
          accountId: account.id,
          seriesId: series.id,
          content: text,
          postDate,
          timeSlot,
          status: "posted",
          isPosted: true,
          externalId: pk,
          externalUrl: postData?.url || `https://www.threads.com/@uwaki_happy/post/${source.code}`,
        },
      })
      createdPosts++

      // インサイトがある場合は登録
      if (insightData) {
        const imp = insightData.impressions || 0
        const followerGain = insightData.new_follows || 0
        const likes = insightData.likes || 0
        const comments = insightData.replies || 0
        const reposts = insightData.reposts || 0

        const followRate = imp > 0 ? (followerGain / imp) * 100 : 0
        const likeRate = imp > 0 ? (likes / imp) * 100 : 0
        const commentRate = imp > 0 ? (comments / imp) * 100 : 0
        const isViral = imp >= 5000 || followerGain >= 5

        await prisma.postInsight.create({
          data: {
            postId: post.id,
            impressions: imp,
            likes,
            saves: null,
            comments,
            reposts,
            followerGain,
            followRate,
            likeRate,
            commentRate,
            isViral,
          },
        })
        createdInsights++
      }
    }

    // 投稿テンプレートを登録
    const templates = [
      {
        timeSlot: "morning",
        promptText: `朝投稿テンプレート（uwaki_happy）

【キャラ】26歳女性。1年半付き合った33歳の彼氏に浮気された。現在: 別れを決断・立ち直り中。

【口調】現在進行形・日記体・短文・改行多め

【朝の投稿方針】
- 前夜から続く感情の余韻
- 朝起きて最初に思ったこと
- 「今日も頑張ろう」という前向きさ
- 共感・応援を集める内容

【締め方】「がんばれ、私。」「今日も一日、お疲れ様でした。」「誰かに共感してほしい。」

投稿パターン: ①リアルタイム体験告白型 または ③共感あるある型 を優先`,
      },
      {
        timeSlot: "noon",
        promptText: `昼投稿テンプレート（uwaki_happy）

【キャラ】26歳女性。1年半付き合った33歳の彼氏に浮気された。現在: 別れを決断・立ち直り中。

【口調】現在進行形・日記体・短文・改行多め

【昼の投稿方針】
- 日常の中でふと思い出した感情
- 「あるある」「わかる」と思わせるリスト系
- 昼休みにスマホを見る人への刺さる内容
- 保存されやすい「まとめ系」も有効

投稿パターン: ③共感あるある型 または ⑤引用・言葉型 を優先`,
      },
      {
        timeSlot: "night1",
        promptText: `夜①投稿テンプレート（uwaki_happy）

【キャラ】26歳女性。1年半付き合った33歳の彼氏に浮気された。現在: 別れを決断・立ち直り中。

【口調】現在進行形・日記体・短文・改行多め

【夜①の投稿方針】
- 仕事終わり〜帰宅の時間帯
- 疲れた人の感情に刺さる内容
- 「誰かに話したい」気持ちを代弁
- コメントを誘いやすい質問型も有効

投稿パターン: ④質問・返信誘導型 または ①リアルタイム体験告白型 を優先`,
      },
      {
        timeSlot: "night2",
        promptText: `夜②投稿テンプレート（uwaki_happy）

【キャラ】26歳女性。1年半付き合った33歳の彼氏に浮気された。現在: 別れを決断・立ち直り中。

【口調】現在進行形・日記体・短文・改行多め

【夜②の投稿方針】
- 深夜帯・眠れない人へ
- 一言ぶっ刺し型が深夜に刺さりやすい
- 「分かる」「救われた」と感じる内容
- 保存・シェアされやすい名言型

投稿パターン: ②一言ぶっ刺し型 または ⑤引用・言葉型 を優先`,
      },
    ]

    for (const t of templates) {
      await prisma.postTemplate.create({
        data: { accountId: account.id, ...t },
      })
    }

    return NextResponse.json({
      message: "シードデータ登録完了",
      account: account.id,
      createdPosts,
      createdInsights,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
