import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get("accountId")
    const status = searchParams.get("status")
    const where: Record<string, unknown> = {}
    if (accountId) where.accountId = accountId
    if (status) where.status = status

    const ideas = await prisma.contentIdea.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(ideas)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const idea = await prisma.contentIdea.create({
      data: {
        accountId: body.accountId,
        content: body.content,
        url: body.url || null,
        category: body.category || null,
        insight: body.insight || null,
        memo: body.memo || null,
        status: body.status || "unused",
        sourceType: body.sourceType || "manual",
        generatedFrom: body.generatedFrom || null,
      },
    })
    return NextResponse.json(idea)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
