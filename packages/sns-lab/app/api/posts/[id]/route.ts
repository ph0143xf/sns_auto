import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        series: true,
        insights: { orderBy: { recordedAt: "desc" } },
        postTags: { include: { tag: true } },
        account: { select: { name: true, snsType: true } },
      },
    })
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(post)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}
    if (body.content !== undefined) updateData.content = body.content
    if (body.postDate !== undefined) updateData.postDate = new Date(body.postDate)
    if (body.timeSlot !== undefined) updateData.timeSlot = body.timeSlot
    if (body.status !== undefined) updateData.status = body.status
    if (body.isPosted !== undefined) updateData.isPosted = body.isPosted
    if (body.patternType !== undefined) updateData.patternType = body.patternType ? Number(body.patternType) : null
    if (body.memo !== undefined) updateData.memo = body.memo
    if (body.learningMemo !== undefined) updateData.learningMemo = body.learningMemo
    if (body.seriesId !== undefined) updateData.seriesId = body.seriesId || null

    const post = await prisma.post.update({ where: { id }, data: updateData })
    return NextResponse.json(post)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.post.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
