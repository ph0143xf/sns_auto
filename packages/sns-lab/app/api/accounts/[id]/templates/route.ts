import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const template = await prisma.postTemplate.create({
      data: {
        accountId: id,
        timeSlot: body.timeSlot,
        promptText: body.promptText,
      },
    })
    return NextResponse.json(template)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
