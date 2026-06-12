import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { callClaude, extractJSON } from "@/lib/ai"

const VARIANT_PROMPTS: Record<string, { label: string; prompt: string; count: number }> = {
  similar10: {
    label: "類似10件",
    count: 10,
    prompt: `以下の勝ち投稿と同じテーマ・構造で、表現を変えた類似投稿を10件生成してください。
元投稿のバズった要素（感情・構造・CTA）を維持しながら、言い回しや切り口を変えてください。
10件それぞれ異なるフック（書き出し）を使い、構造も分散させてください。`,
  },
  paradox: {
    label: "逆説版",
    count: 3,
    prompt: `以下の勝ち投稿を「逆説・意外性」に特化した投稿に変換してください。
一般的な常識や期待を裏切る逆説的な切り口で書いてください。
例: 「〜なのに〜」「普通は〜だけど、私は違う」「〜だと思っていた。でも実は」「〜すべきじゃない」`,
  },
  anger: {
    label: "怒り版",
    count: 3,
    prompt: `以下の勝ち投稿を「怒り・共感」に特化した投稿に変換してください。
読者が「わかる！！腹立つ！」と感じる感情的な表現にしてください。怒りは浮気・裏切り・都合のいい扱いへの怒りです。`,
  },
  empathy: {
    label: "共感版",
    count: 3,
    prompt: `以下の勝ち投稿を「共感・寄り添い」に特化した投稿に変換してください。
「あなただけじゃない、私もそうだった」という温かいトーンにしてください。
読んだ人が「私のことだ」と思えるような言葉を選んでください。`,
  },
  save: {
    label: "保存狙い版",
    count: 3,
    prompt: `以下の勝ち投稿を「保存狙い」に特化した投稿に変換してください。
「これは保存しておきたい！」と思わせるリスト形式、まとめ形式、チェックリスト形式にしてください。
「〇つのサイン」「〇つの方法」「〇つのこと」などの構造が効果的です。`,
  },
  follow: {
    label: "フォロー獲得版",
    count: 3,
    prompt: `以下の勝ち投稿を「フォロー獲得」に特化した投稿に変換してください。
「続きが気になる」「この人をフォローしたい」と思わせる自己開示・続き予告・問いかけを入れてください。
「続きはプロフから」「フォローして続きを見て」などのCTAを自然に組み込んでください。`,
  },
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params
    const body = await req.json()
    const variantType: string = body.variantType

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { content: true, patternType: true },
    })
    if (!post) return NextResponse.json({ error: "post not found" }, { status: 404 })

    const variant = VARIANT_PROMPTS[variantType]
    if (!variant) return NextResponse.json({ error: "invalid variantType" }, { status: 400 })

    const prompt = `${variant.prompt}

【元の勝ち投稿】
${post.content}

以下のJSON形式で${variant.count}件生成してください（コードブロック不要、JSONのみ）：
[
  {
    "content": "投稿本文",
    "memo": "この投稿のポイント・変更点・使用フック"
  }
]`

    const raw = await callClaude(prompt, 5000)
    const variants = extractJSON<{ content: string; memo: string }[]>(raw)

    return NextResponse.json({ variants, variantLabel: variant.label })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
