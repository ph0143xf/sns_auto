import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { callClaude, extractJSON } from "@/lib/ai"
import { addDays, format, startOfDay, subDays } from "date-fns"

export const maxDuration = 120

interface GeneratedPost {
  date: string
  timeSlot: "morning" | "noon" | "night1" | "night2"
  content: string
  patternType: number | null
  memo: string
}

function extractHook(content: string): string {
  return content.split(/[\n。！!？?]/)[0].trim().slice(0, 60)
}

function extractThemeKeywords(content: string): string {
  const keywords: string[] = []
  const patterns = [
    /浮気/, /別れ/, /復縁/, /自分軸/, /立ち直り/, /依存/, /毒/, /感情/, /涙/, /怒り/,
    /孤独/, /愛/, /彼氏/, /彼女/, /結婚/, /恋愛/, /心理/, /傷/, /前向き/, /幸せ/,
  ]
  for (const p of patterns) {
    if (p.test(content)) keywords.push(p.source)
  }
  return keywords.join(",")
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { accountId, days = 7, startDate } = body as {
      accountId: string
      days: number
      startDate?: string
    }

    if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 })

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { postTemplates: true },
    })
    if (!account) return NextResponse.json({ error: "account not found" }, { status: 404 })

    const start = startDate ? new Date(startDate) : addDays(startOfDay(new Date()), 1)

    // ---- コンテキスト収集 ----
    const viralInsights = await prisma.postInsight.findMany({
      where: { post: { accountId }, isViral: true },
      include: {
        post: { select: { content: true, timeSlot: true, patternType: true, learningMemo: true } },
      },
      orderBy: [
        { followerGain: "desc" },
        { followRate: "desc" },
        { saveRate: "desc" },
        { impressions: "desc" },
      ],
      take: 15,
    })

    const nonViralInsights = await prisma.postInsight.findMany({
      where: { post: { accountId }, isViral: false },
      include: {
        post: { select: { content: true, learningMemo: true, patternType: true } },
      },
      take: 15,
    })

    const competitorPosts = await prisma.competitorPost.findMany({
      where: { accountId },
      orderBy: { savedAt: "desc" },
      take: 10,
    })

    const recentPosts = await prisma.post.findMany({
      where: { accountId, isPosted: true, learningMemo: { not: null } },
      orderBy: { postDate: "desc" },
      take: 10,
      select: { learningMemo: true },
    })

    // ---- 直近60日の重複回避データ ----
    const sixtyDaysAgo = subDays(new Date(), 60)
    const recent60Posts = await prisma.post.findMany({
      where: {
        accountId,
        postDate: { gte: sixtyDaysAgo },
      },
      orderBy: { postDate: "desc" },
      select: { content: true, postDate: true },
      take: 200,
    })

    const recentHooks = recent60Posts.map((p) => extractHook(p.content)).filter(Boolean)
    const recentThemeKeywords = [...new Set(recent60Posts.flatMap((p) => extractThemeKeywords(p.content).split(",").filter(Boolean)))]
    const recentFirstLines = recent60Posts.map((p) => p.content.split("\n")[0].trim().slice(0, 40))

    // ---- 最新の週次分析から回避パターン ----
    const latestAnalysis = await prisma.weeklyAnalysis.findFirst({
      where: { accountId },
      orderBy: { createdAt: "desc" },
    })

    // ---- 最新の改善提案（運用改善ループの核心） ----
    const latestImprovement = await prisma.improvementSuggestion.findFirst({
      where: { accountId },
      orderBy: { createdAt: "desc" },
    })

    // ---- プロンプト構築 ----
    const slotTemplates: Record<string, string> = {}
    for (const t of account.postTemplates) slotTemplates[t.timeSlot] = t.promptText

    const templateSection = Object.entries(slotTemplates)
      .map(([slot, text]) => {
        const labels: Record<string, string> = { morning: "朝", noon: "昼", night1: "夜①", night2: "夜②" }
        return `【${labels[slot] ?? slot}の投稿方針】\n${text}`
      })
      .join("\n\n")

    const winningSection = viralInsights.slice(0, 10)
      .map((ins) =>
        `・フォロワー:+${ins.followerGain ?? 0} 保存率:${ins.saveRate?.toFixed(3) ?? 0}\n${ins.post.content}`
      )
      .join("\n\n")

    const avoidSection = nonViralInsights
      .map((ins) =>
        `・${ins.post.content.slice(0, 80)}${ins.post.learningMemo ? `\n 学び: ${ins.post.learningMemo}` : ""}`
      )
      .join("\n")

    const competitorSection = competitorPosts
      .map((p) => `・[${p.platform}] ${p.content.slice(0, 100)}\n  メモ: ${p.memo ?? "なし"}`)
      .join("\n\n")

    const learningSection = recentPosts.map((p) => `・${p.learningMemo}`).join("\n")

    const avoidFromAnalysis = latestAnalysis?.losingThemesJson
      ? `・過去分析「負けテーマ」: ${(JSON.parse(latestAnalysis.losingThemesJson) as string[]).slice(0, 5).join("、")}`
      : ""
    const avoidHooksFromAnalysis = latestAnalysis?.losingHooksJson
      ? `・過去分析「負けフック」: ${(JSON.parse(latestAnalysis.losingHooksJson) as string[]).slice(0, 5).join("、")}`
      : ""
    const nextWeekAvoid = latestAnalysis?.nextWeekAvoidJson
      ? `・来週避けるべきテーマ: ${(JSON.parse(latestAnalysis.nextWeekAvoidJson) as string[]).slice(0, 5).join("、")}`
      : ""

    // ---- 改善提案から優先テーマ・回避テーマを抽出 ----
    type DoThemeEntry    = { theme: string; kpi: string }
    type AvoidThemeEntry = { theme: string }
    const improvDoThemes: DoThemeEntry[] = latestImprovement?.doThemesJson
      ? (JSON.parse(latestImprovement.doThemesJson) as DoThemeEntry[]).slice(0, 5)
      : []
    const improvAvoidThemes: AvoidThemeEntry[] = latestImprovement?.avoidThemesJson
      ? (JSON.parse(latestImprovement.avoidThemesJson) as AvoidThemeEntry[]).slice(0, 5)
      : []

    const improvementBlock = latestImprovement
      ? `
【改善提案AI 優先指示（最重要・必ず反映してください）】
この指示は直近のAI分析に基づく最優先ガイドラインです。生成する${days}日分の投稿に必ず組み込んでください。

≪来週やるべきテーマ（積極的に使う）≫
${improvDoThemes.map((t, i) => `${i + 1}. 「${t.theme}」 → 狙いKPI: ${t.kpi}`).join("\n")}

≪来週避けるべきテーマ（絶対に使わない）≫
${improvAvoidThemes.map((t, i) => `${i + 1}. 「${t.theme}」`).join("\n")}

≪投稿配分の指示≫
- ${days}日分の投稿のうち、最低60%は「やるべきテーマ」のいずれかを使うこと
- 「避けるべきテーマ」は一切使わないこと
- フォロー獲得を狙う投稿を最低${Math.ceil(days / 3)}件含めること
- 保存率を狙うリスト・まとめ形式を最低${Math.ceil(days / 4)}件含めること`.trim()
      : ""

    const dateList = Array.from({ length: days }, (_, i) => format(addDays(start, i), "yyyy-MM-dd"))

    const deduplicationBlock = `
【重複回避ルール（必須）】
以下は直近60日以内に投稿済みのフック・テーマです。絶対に重複させないでください。

≪使用済みフック（冒頭の書き出し）≫
${recentFirstLines.slice(0, 30).map((h) => `「${h}」`).join("\n")}

≪使用済みテーマキーワード（過剰頻出のもの）≫
${recentThemeKeywords.slice(0, 20).join("、")}

≪回避ルール≫
- 上記の書き出しと同じ或いは類似した文から始めない
- 同じテーマが3日以上連続しないようにする
- フック（書き出し）は必ず毎回異なるパターンを使う
- 構造（問いかけ→答え型、列挙型、告白型など）も全${days * 4}投稿で分散させる
${avoidFromAnalysis}
${avoidHooksFromAnalysis}
${nextWeekAvoid}
`.trim()

    const prompt = `あなたは日本語SNS投稿の専門家です。以下のコンテキストに基づき、${days}日分の投稿を生成してください。

【アカウント情報】
- 名前: ${account.name}
- SNS: ${account.snsType}
- ターゲット: ${account.target ?? "未設定"}
- 世界観: ${account.worldview ?? "未設定"}
- テーマ: ${account.theme ?? "未設定"}

【KPI優先順位（最重要）】
フォロワー増加 > フォロー率 > 保存率 > コメント率 > いいね率 > インプレッション
フォロワーを増やすことを最優先に生成してください。

${improvementBlock ? `${improvementBlock}\n` : ""}
${winningSection ? `【勝ち投稿パターン（参考にすべき最重要データ）】\n${winningSection}` : ""}

${avoidSection ? `【伸びなかった投稿（このパターンは避ける）】\n${avoidSection}` : ""}

${competitorSection ? `【競合投稿データ（手動登録・最重要参考データ）】\n${competitorSection}` : ""}

${learningSection ? `【学びメモ（過去の振り返り）】\n${learningSection}` : ""}

${templateSection ? `【時間帯別投稿方針】\n${templateSection}` : ""}

${deduplicationBlock}

【生成する日付と時間帯】
${dateList.map((d) => `${d}: morning, noon, night1, night2`).join("\n")}

【投稿パターン】
1: リアルタイム体験告白型（今まさに起きていることをリアルに）
2: 一言ぶっ刺し型（短く刺さる言葉）
3: 共感あるある型（あるある・共感を呼ぶ）
4: 質問・返信誘導型（コメントを誘う問いかけ）
5: 引用・言葉型（名言・教訓・学び）

以下のJSON形式で${days * 4}件の投稿を生成してください（コードブロック不要、JSONのみ）：
[
  {
    "date": "YYYY-MM-DD",
    "timeSlot": "morning",
    "content": "投稿本文",
    "patternType": 1,
    "memo": "この投稿のポイント・使用フックの種類"
  }
]`

    const raw = await callClaude(prompt, 10000)
    const posts = extractJSON<GeneratedPost[]>(raw)

    return NextResponse.json({ posts })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
