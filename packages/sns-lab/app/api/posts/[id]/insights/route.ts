import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { calculateKpiRates } from "@/lib/stock"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const isViral = body.isViral ?? false

    if (!isViral) {
      // 😢 伸びなかったボタン: 記録のみ
      const insight = await prisma.postInsight.create({
        data: {
          postId: id,
          isViral: false,
        },
      })
      // 投稿をpostedに更新
      await prisma.post.update({
        where: { id },
        data: { isPosted: true, status: "posted" },
      })
      return NextResponse.json(insight)
    }

    // 伸びた投稿: 数値入力
    const rates = calculateKpiRates({
      impressions: body.impressions || null,
      likes: body.likes || null,
      saves: body.saves || null,
      comments: body.comments || null,
      followerGain: body.followerGain || null,
    })

    const insight = await prisma.postInsight.create({
      data: {
        postId: id,
        impressions: body.impressions ? Number(body.impressions) : null,
        likes: body.likes ? Number(body.likes) : null,
        saves: body.saves ? Number(body.saves) : null,
        comments: body.comments ? Number(body.comments) : null,
        reposts: body.reposts ? Number(body.reposts) : null,
        followerGain: body.followerGain ? Number(body.followerGain) : null,
        followRate: rates.followRate,
        saveRate: rates.saveRate,
        commentRate: rates.commentRate,
        likeRate: rates.likeRate,
        isViral: true,
      },
    })

    await prisma.post.update({
      where: { id },
      data: { isPosted: true, status: "posted" },
    })

    return NextResponse.json(insight)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
