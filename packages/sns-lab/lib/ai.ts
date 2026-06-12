const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"

export async function callClaude(prompt: string, maxTokens = 6000): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set")

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return (data.content[0] as { text: string }).text
}

export function extractJSON<T>(text: string): T {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]+?)```/)
  if (codeBlock) return JSON.parse(codeBlock[1])
  const jsonMatch = text.match(/(\[[\s\S]+\]|\{[\s\S]+\})/)
  if (jsonMatch) return JSON.parse(jsonMatch[0])
  return JSON.parse(text)
}
