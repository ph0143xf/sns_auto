import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const post = await prisma.competitorPost.update({
      where: { id },
      data: {
        platform: body.platform,
        url: body.url ?? undefined,
        content: body.content,
        authorName: body.authorName ?? undefined,
        memo: body.memo ?? undefined,
        analysis: body.analysis ?? undefined,
      },
    })
    return NextResponse.json(post)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.competitorPost.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
