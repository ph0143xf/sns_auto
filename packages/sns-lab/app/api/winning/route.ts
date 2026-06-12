import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get("accountId")
    if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 })

    const insights = await prisma.postInsight.findMany({
      where: {
        isViral: true,
        post: { accountId },
      },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            timeSlot: true,
            postDate: true,
            patternType: true,
            learningMemo: true,
          },
        },
      },
      orderBy: [
        { followerGain: "desc" },
        { followRate: "desc" },
        { saveRate: "desc" },
        { impressions: "desc" },
      ],
    })
    return NextResponse.json(insights)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
