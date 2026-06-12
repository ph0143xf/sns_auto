import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const idea = await prisma.contentIdea.findUnique({ where: { id } })
    if (!idea) return NextResponse.json({ error: "idea not found" }, { status: 404 })

    const post = await prisma.post.create({
      data: {
        accountId: body.accountId || idea.accountId,
        content: idea.content,
        postDate: new Date(body.date),
        timeSlot: body.timeSlot,
        status: "scheduled",
        memo: idea.memo || null,
      },
    })

    await prisma.contentIdea.update({
      where: { id },
      data: { status: "used" },
    })

    return NextResponse.json({ post })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
