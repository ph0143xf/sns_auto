import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { callClaude, extractJSON } from "@/lib/ai"

export const maxDuration = 120

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get("accountId")
    if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 })

    const suggestion = await prisma.improvementSuggestion.findFirst({
      where: { accountId },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(suggestion)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get("accountId")
    if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 })

    const account = await prisma.account.findUnique({ where: { id: accountId } })
    if (!account) return NextResponse.json({ error: "account not found" }, { status: 404 })

    // 最新の週次分析を取得
    const latestAnalysis = await prisma.weeklyAnalysis.findFirst({
      where: { accountId },
      orderBy: { createdAt: "desc" },
    })

    // 勝ち投稿を取得（KPI上位）
    const viralInsights = await prisma.postInsight.findMany({
      where: { post: { accountId }, isViral: true },
      include: {
        post: { select: { content: true, timeSlot: true, patternType: true } },
      },
      orderBy: [{ followerGain: "desc" }, { saveRate: "desc" }],
      take: 10,
    })

    // 競合投稿を取得
    const competitorPosts = await prisma.competitorPost.findMany({
      where: { accountId },
      orderBy: { savedAt: "desc" },
      take: 8,
    })

    const parse = (json: string | null): unknown[] => {
      if (!json) return []
      try { return JSON.parse(json) } catch { return [] }
    }

    const analysisContext = latestAnalysis
      ? `
【週次分析結果（最新）】
勝ちテーマ: ${(parse(latestAnalysis.winningThemesJson) as string[]).join("、") || "なし"}
負けテーマ: ${(parse(latestAnalysis.losingThemesJson) as string[]).join("、") || "なし"}
勝ちフック: ${(parse(latestAnalysis.winningHooksJson) as string[]).join("、") || "なし"}
負けフック: ${(parse(latestAnalysis.losingHooksJson) as string[]).join("、") || "なし"}
来週推奨テーマ: ${(parse(latestAnalysis.nextWeekThemesJson) as string[]).join("、") || "なし"}
来週回避テーマ: ${(parse(latestAnalysis.nextWeekAvoidJson) as string[]).join("、") || "なし"}
改善提案: ${latestAnalysis.improvementSuggestions ?? "なし"}`
      : "【週次分析結果】まだ分析が実行されていません。投稿データから判断してください。"

    const viralSection = viralInsights
      .slice(0, 5)
      .map((ins) => `+${ins.followerGain ?? 0}フォロワー 保存率${((ins.saveRate ?? 0) * 100).toFixed(2)}%\n${ins.post.content.slice(0, 100)}`)
      .join("\n\n")

    const competitorSection = competitorPosts
      .map((p) => `[${p.platform}] ${p.authorName ?? ""}: ${p.content.slice(0, 80)}`)
      .join("\n")

    const prompt = `あなたは日本語SNS戦略の専門家です。
アカウント「${account.name}」（${account.snsType}・ターゲット: ${account.target ?? "未設定"}）の
データを分析し、来週の運用改善提案を生成してください。

${analysisContext}

【過去の勝ち投稿（参考）】
${viralSection || "なし（データ不足）"}

【競合投稿（参考）】
${competitorSection || "なし"}

【アカウント情報】
テーマ: ${account.theme ?? "未設定"}
世界観: ${account.worldview ?? "未設定"}

【KPI優先順位】
フォロワー増加 > フォロー率 > 保存率 > コメント率 > いいね率 > インプレッション

以下のJSON形式で改善提案を生成してください（コードブロック不要、JSONのみ）:
{
  "doThemes": [
    { "theme": "来週やるべきテーマ名", "reason": "理由（データ根拠・期待効果）", "kpi": "狙うKPI" }
  ],
  "avoidThemes": [
    { "theme": "来週避けるべきテーマ名", "reason": "理由（疲弊・飽き・低パフォーマンスの根拠）" }
  ],
  "followPosts": [
    {
      "content": "フォロー獲得を最大化する投稿本文（完全な本文・150〜280文字）",
      "hook": "書き出しの一文",
      "patternType": 1,
      "reason": "フォロー獲得狙いの根拠・テクニック",
      "ctaHint": "使用するCTA（例: フォローして続きを見て）"
    }
  ],
  "savePosts": [
    {
      "content": "保存率を最大化する投稿本文（リスト・まとめ形式・完全な本文）",
      "hook": "書き出しの一文",
      "patternType": 3,
      "reason": "保存狙いの根拠・テクニック",
      "format": "使用するフォーマット（例: ○○3つのサイン）"
    }
  ],
  "experimentPosts": [
    {
      "content": "実験として試す新しい切り口の投稿本文（完全な本文）",
      "hook": "書き出しの一文",
      "angle": "試す新しい角度・切り口",
      "hypothesis": "仮説（これがバズると思う理由）",
      "successMetric": "成功の定義（例: インプレッション5000超）"
    }
  ]
}

制約:
- doThemes: 10件
- avoidThemes: 10件
- followPosts: 5件（完全な投稿本文を必ず含める）
- savePosts: 5件（完全な投稿本文を必ず含める）
- experimentPosts: 3件（完全な投稿本文を必ず含める）
- 各投稿はアカウントの世界観・ターゲットに沿っていること
- データがない場合でもアカウント情報から推察して必ず出力する`

    const raw = await callClaude(prompt, 8000)
    const parsed = extractJSON<{
      doThemes: { theme: string; reason: string; kpi: string }[]
      avoidThemes: { theme: string; reason: string }[]
      followPosts: { content: string; hook: string; patternType: number; reason: string; ctaHint: string }[]
      savePosts: { content: string; hook: string; patternType: number; reason: string; format: string }[]
      experimentPosts: { content: string; hook: string; angle: string; hypothesis: string; successMetric: string }[]
    }>(raw)

    const suggestion = await prisma.improvementSuggestion.create({
      data: {
        accountId,
        weeklyAnalysisId: latestAnalysis?.id ?? null,
        doThemesJson:        JSON.stringify(parsed.doThemes ?? []),
        avoidThemesJson:     JSON.stringify(parsed.avoidThemes ?? []),
        followPostsJson:     JSON.stringify(parsed.followPosts ?? []),
        savePostsJson:       JSON.stringify(parsed.savePosts ?? []),
        experimentPostsJson: JSON.stringify(parsed.experimentPosts ?? []),
      },
    })

    return NextResponse.json({ suggestion })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
