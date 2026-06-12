import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { callClaude, extractJSON } from "@/lib/ai"

export const maxDuration = 120

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get("accountId")
    if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 })

    const analysis = await prisma.weeklyAnalysis.findFirst({
      where: { accountId },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(analysis)
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

    const weekEnd = new Date()
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekStart.getDate() - 30)

    const viralInsights = await prisma.postInsight.findMany({
      where: { post: { accountId }, isViral: true, recordedAt: { gte: weekStart } },
      include: {
        post: { select: { content: true, timeSlot: true, patternType: true, learningMemo: true } },
      },
      orderBy: { followerGain: "desc" },
      take: 20,
    })

    const nonViralInsights = await prisma.postInsight.findMany({
      where: { post: { accountId }, isViral: false, recordedAt: { gte: weekStart } },
      include: {
        post: { select: { content: true, timeSlot: true, patternType: true, learningMemo: true } },
      },
      take: 20,
    })

    const competitorPosts = await prisma.competitorPost.findMany({
      where: { accountId },
      orderBy: { savedAt: "desc" },
      take: 10,
    })

    const winningSection = viralInsights
      .map((ins, i) =>
        `[勝ち${i + 1}] imp:${ins.impressions ?? 0} フォロワー:+${ins.followerGain ?? 0} 保存率:${ins.saveRate?.toFixed(3) ?? 0}\n内容: ${ins.post.content}\n冒頭フック: ${ins.post.content.split(/[\n。]/)[0].slice(0, 50)}`
      )
      .join("\n\n")

    const losingSection = nonViralInsights
      .map((ins, i) =>
        `[非バズ${i + 1}] 内容: ${ins.post.content.slice(0, 100)}\n冒頭フック: ${ins.post.content.split(/[\n。]/)[0].slice(0, 50)}\n学び: ${ins.post.learningMemo ?? "なし"}`
      )
      .join("\n\n")

    const competitorSection = competitorPosts
      .map((p, i) =>
        `[競合${i + 1}] ${p.platform} ${p.authorName ?? ""}\n内容: ${p.content.slice(0, 100)}\nメモ: ${p.memo ?? "なし"}`
      )
      .join("\n\n")

    const prompt = `SNSアカウント「${account.name}」（${account.snsType}）の投稿データを週次分析してください。

【アカウント情報】
ターゲット: ${account.target ?? "未設定"}
テーマ: ${account.theme ?? "未設定"}
世界観: ${account.worldview ?? "未設定"}

【KPI優先順位】
フォロワー増加 > フォロー率 > 保存率 > コメント率 > いいね率 > インプレッション

【勝ち投稿（直近30日・バズったもの）】
${winningSection || "データなし"}

【伸びなかった投稿（直近30日）】
${losingSection || "データなし"}

【競合投稿データ（手動登録・最重要参考データ）】
${competitorSection || "データなし"}

以下の週次分析を行い、JSON形式で出力してください：

{
  "winningThemes": ["バズったテーマ5〜8個"],
  "losingThemes": ["伸びなかったテーマ5〜8個"],
  "winningHooks": ["効果的だった冒頭フック・書き出しパターン5〜8個（例: 「昨日、彼から...」「正直に言う。」「浮気された私が気づいたこと」など）"],
  "losingHooks": ["効果なかった冒頭フック・書き出しパターン3〜5個"],
  "winningStructures": ["効果的な投稿構造3〜5個"],
  "bestTimeSlots": ["最も効果的な時間帯と理由2〜4個"],
  "winningCtas": ["効果的なCTA2〜4個"],
  "competitorInsights": ["競合データから得られた洞察3〜5個"],
  "nextWeekThemes": ["来週推奨テーマ（バズ可能性が高い）5個"],
  "nextWeekAvoid": ["来週避けるべきテーマ・フック（飽きられる・疲れる）3〜5個"],
  "improvementSuggestions": "今後のコンテンツ改善提案（200〜400文字）"
}`

    const raw = await callClaude(prompt, 4000)
    const parsed = extractJSON<{
      winningThemes: string[]
      losingThemes: string[]
      winningHooks: string[]
      losingHooks: string[]
      winningStructures: string[]
      bestTimeSlots: string[]
      winningCtas: string[]
      competitorInsights: string[]
      nextWeekThemes: string[]
      nextWeekAvoid: string[]
      improvementSuggestions: string
    }>(raw)

    const analysis = await prisma.weeklyAnalysis.create({
      data: {
        accountId,
        weekStart,
        weekEnd,
        winningThemesJson:     JSON.stringify(parsed.winningThemes ?? []),
        losingThemesJson:      JSON.stringify(parsed.losingThemes ?? []),
        winningHooksJson:      JSON.stringify(parsed.winningHooks ?? []),
        losingHooksJson:       JSON.stringify(parsed.losingHooks ?? []),
        winningStructuresJson: JSON.stringify(parsed.winningStructures ?? []),
        bestTimeSlotsJson:     JSON.stringify(parsed.bestTimeSlots ?? []),
        winningCtasJson:       JSON.stringify(parsed.winningCtas ?? []),
        nextWeekThemesJson:    JSON.stringify(parsed.nextWeekThemes ?? []),
        nextWeekAvoidJson:     JSON.stringify(parsed.nextWeekAvoid ?? []),
        improvementSuggestions: parsed.improvementSuggestions ?? "",
      },
    })

    return NextResponse.json({ analysis, competitorInsights: parsed.competitorInsights ?? [] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
