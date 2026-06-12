import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get("accountId")
    const series = await prisma.series.findMany({
      where: accountId ? { accountId, isActive: true } : { isActive: true },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { posts: true } } },
    })
    return NextResponse.json(series)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const series = await prisma.series.create({
      data: {
        accountId: body.accountId,
        name: body.name,
        description: body.description || null,
      },
    })
    return NextResponse.json(series)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
