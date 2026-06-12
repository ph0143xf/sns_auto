import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get("accountId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {}
    if (accountId) where.accountId = accountId
    if (status) where.status = status
    if (dateFrom || dateTo) {
      where.postDate = {}
      if (dateFrom) (where.postDate as Record<string, unknown>).gte = new Date(dateFrom)
      if (dateTo) (where.postDate as Record<string, unknown>).lte = new Date(dateTo)
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: [{ postDate: "asc" }, { timeSlot: "asc" }],
      include: {
        series: { select: { name: true } },
        insights: { orderBy: { recordedAt: "desc" }, take: 1 },
        postTags: { include: { tag: true } },
      },
    })
    return NextResponse.json(posts)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const post = await prisma.post.create({
      data: {
        accountId: body.accountId,
        seriesId: body.seriesId || null,
        content: body.content,
        postDate: new Date(body.postDate),
        timeSlot: body.timeSlot,
        status: body.status || "draft",
        patternType: body.patternType ? Number(body.patternType) : null,
        memo: body.memo || null,
        learningMemo: body.learningMemo || null,
        externalId: body.externalId || null,
        externalUrl: body.externalUrl || null,
      },
    })
    return NextResponse.json(post)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
