import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get("accountId")
    const where = accountId ? { accountId } : {}
    const posts = await prisma.competitorPost.findMany({
      where,
      orderBy: { savedAt: "desc" },
    })
    return NextResponse.json(posts)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const post = await prisma.competitorPost.create({
      data: {
        accountId: body.accountId,
        platform: body.platform || "threads",
        url: body.url || null,
        content: body.content,
        authorName: body.authorName || null,
        memo: body.memo || null,
      },
    })
    return NextResponse.json(post)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
