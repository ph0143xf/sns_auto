import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { posts: true } },
      },
    })
    return NextResponse.json(accounts)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const account = await prisma.account.create({
      data: {
        name: body.name,
        snsType: body.snsType,
        username: body.username,
        target: body.target || null,
        worldview: body.worldview || null,
        theme: body.theme || null,
      },
    })
    return NextResponse.json(account)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
