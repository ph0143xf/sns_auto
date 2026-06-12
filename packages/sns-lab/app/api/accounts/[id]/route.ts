import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        postTemplates: { orderBy: { timeSlot: "asc" } },
        series: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
        tags: { orderBy: { name: "asc" } },
      },
    })
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(account)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const account = await prisma.account.update({
      where: { id },
      data: {
        name: body.name,
        snsType: body.snsType,
        username: body.username,
        target: body.target,
        worldview: body.worldview,
        theme: body.theme,
        isActive: body.isActive,
      },
    })
    return NextResponse.json(account)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.account.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
