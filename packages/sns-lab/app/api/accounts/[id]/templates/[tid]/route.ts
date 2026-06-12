import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; tid: string }> }) {
  try {
    const { tid } = await params
    const body = await req.json()
    const template = await prisma.postTemplate.update({
      where: { id: tid },
      data: { promptText: body.promptText },
    })
    return NextResponse.json(template)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; tid: string }> }) {
  try {
    const { tid } = await params
    await prisma.postTemplate.delete({ where: { id: tid } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
