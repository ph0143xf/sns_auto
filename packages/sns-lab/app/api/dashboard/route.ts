import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { calculateStock } from "@/lib/stock"
import { subDays, format, startOfWeek, addWeeks, startOfMonth, addMonths } from "date-fns"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get("accountId")
    if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 })

    const today = new Date()
    const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0)
    const todayEnd   = new Date(today); todayEnd.setHours(23, 59, 59, 999)

    // ---- 今日の投稿 ----
    const todayPosts = await prisma.post.findMany({
      where: { accountId, postDate: { gte: todayStart, lte: todayEnd } },
      orderBy: { timeSlot: "asc" },
      include: { insights: { orderBy: { recordedAt: "desc" }, take: 1 } },
    })

    // ---- 在庫 ----
    const allPosts = await prisma.post.findMany({
      where: { accountId },
      select: { postDate: true, isPosted: true, status: true },
    })
    const stock = calculateStock(allPosts, today)

    // ---- 今週の勝ち投稿 ----
    const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - 7)
    const weeklyWinners = await prisma.postInsight.findMany({
      where: { post: { accountId }, isViral: true, recordedAt: { gte: weekStart } },
      include: { post: { select: { content: true, timeSlot: true, postDate: true, patternType: true } } },
      orderBy: { followerGain: "desc" },
      take: 3,
    })
    const weekPosted = await prisma.post.count({
      where: { accountId, isPosted: true, postDate: { gte: weekStart, lte: todayEnd } },
    })

    // ---- 総計KPI ----
    const totals = await prisma.postInsight.aggregate({
      where: { post: { accountId } },
      _sum: { impressions: true, likes: true, saves: true, comments: true, followerGain: true },
    })

    // ---- 日次グラフ（直近30日・投稿済みのみ） ----
    const thirtyDaysAgo = subDays(today, 29)
    const dailyInsights = await prisma.postInsight.findMany({
      where: { post: { accountId }, recordedAt: { gte: thirtyDaysAgo } },
      select: { impressions: true, likes: true, followerGain: true, recordedAt: true },
      orderBy: { recordedAt: "asc" },
    })
    const dailyMap = new Map<string, { impressions: number; likes: number; followerGain: number }>()
    for (let i = 0; i < 30; i++) {
      const d = subDays(today, 29 - i)
      dailyMap.set(format(d, "yyyy-MM-dd"), { impressions: 0, likes: 0, followerGain: 0 })
    }
    for (const ins of dailyInsights) {
      const key = format(new Date(ins.recordedAt), "yyyy-MM-dd")
      const cur = dailyMap.get(key)
      if (cur) {
        cur.impressions  += ins.impressions  ?? 0
        cur.likes        += ins.likes        ?? 0
        cur.followerGain += ins.followerGain ?? 0
      }
    }
    const dailyChart = [...dailyMap.entries()].map(([date, v]) => ({ date, ...v }))

    // ---- 週次グラフ（直近8週） ----
    const weeklyChart: { label: string; impressions: number; followerGain: number }[] = []
    for (let w = 7; w >= 0; w--) {
      const ws = startOfWeek(subDays(today, w * 7), { weekStartsOn: 1 })
      const we = addWeeks(ws, 1)
      const sum = await prisma.postInsight.aggregate({
        where: { post: { accountId }, recordedAt: { gte: ws, lt: we } },
        _sum: { impressions: true, followerGain: true },
      })
      weeklyChart.push({
        label: format(ws, "M/d"),
        impressions:  sum._sum.impressions  ?? 0,
        followerGain: sum._sum.followerGain ?? 0,
      })
    }

    // ---- 月次グラフ（直近6ヶ月） ----
    const monthlyChart: { label: string; impressions: number; followerGain: number }[] = []
    for (let m = 5; m >= 0; m--) {
      const ms = startOfMonth(subDays(today, m * 30))
      const me = addMonths(ms, 1)
      const sum = await prisma.postInsight.aggregate({
        where: { post: { accountId }, recordedAt: { gte: ms, lt: me } },
        _sum: { impressions: true, followerGain: true },
      })
      monthlyChart.push({
        label: format(ms, "M月"),
        impressions:  sum._sum.impressions  ?? 0,
        followerGain: sum._sum.followerGain ?? 0,
      })
    }

    return NextResponse.json({
      todayPosts,
      stock,
      weeklyWinners,
      weekPosted,
      totals: totals._sum,
      dailyChart,
      weeklyChart,
      monthlyChart,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
