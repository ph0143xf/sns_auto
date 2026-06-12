import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { TIME_SLOTS } from "@/lib/constants"

const SLOT_ALIASES: Record<string, keyof typeof TIME_SLOTS> = {
  morning: "morning", 朝: "morning", "8:00": "morning",
  noon:    "noon",    昼: "noon",    "12:30": "noon",
  night1:  "night1",  夜1: "night1", "夜①": "night1", "18:20": "night1",
  night2:  "night2",  夜2: "night2", "夜②": "night2", "20:30": "night2",
}

function parseSlot(raw: string): keyof typeof TIME_SLOTS | null {
  return SLOT_ALIASES[raw.trim()] ?? null
}

function buildPostDate(dateStr: string, slot: keyof typeof TIME_SLOTS): Date {
  const { hour, minute } = TIME_SLOTS[slot]
  const [y, m, d] = dateStr.split("-").map(Number)
  const dt = new Date(y, m - 1, d, hour, minute, 0, 0)
  return dt
}

// RFC 4180 準拠CSVパーサー（改行・カンマを含む引用フィールド対応）
function parseCSVRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  // 改行コードを統一
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (inQuotes) {
      if (ch === '"' && s[i + 1] === '"') {
        field += '"'; i += 2           // エスケープされた引用符 ""
      } else if (ch === '"') {
        inQuotes = false; i++           // 引用終了
      } else {
        field += ch; i++               // 引用内の文字（改行含む）
      }
    } else {
      if (ch === '"') {
        inQuotes = true; i++
      } else if (ch === ',') {
        row.push(field); field = ""; i++
      } else if (ch === '\n') {
        row.push(field)
        if (row.some((f) => f.trim())) rows.push(row)
        row = []; field = ""; i++
      } else {
        field += ch; i++
      }
    }
  }
  // 最後のフィールド・行
  row.push(field)
  if (row.some((f) => f.trim())) rows.push(row)
  return rows
}

function parseCSV(text: string): { date: string; timeSlot: string; content: string; memo: string }[] {
  const rows = parseCSVRows(text)
  if (rows.length < 2) return []
  const header = rows[0].map((h) => h.trim().toLowerCase())
  const dateIdx    = header.findIndex((h) => ["date", "日付"].includes(h))
  const slotIdx    = header.findIndex((h) => ["timeslot", "time_slot", "slot", "時間帯"].includes(h))
  const contentIdx = header.findIndex((h) => ["content", "本文", "投稿内容", "text"].includes(h))
  const memoIdx    = header.findIndex((h) => ["memo", "メモ", "note"].includes(h))
  if (dateIdx === -1 || slotIdx === -1 || contentIdx === -1) return []

  const result: { date: string; timeSlot: string; content: string; memo: string }[] = []
  for (let i = 1; i < rows.length; i++) {
    const cols    = rows[i]
    const date    = (cols[dateIdx]    ?? "").trim()
    const slot    = (cols[slotIdx]    ?? "").trim()
    const content = (cols[contentIdx] ?? "").trim()
    const memo    = memoIdx >= 0 ? (cols[memoIdx] ?? "").trim() : ""
    if (date && slot && content) result.push({ date, timeSlot: slot, content, memo })
  }
  return result
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get("accountId")
    if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 })

    const body = await req.json() as { csv: string; skipDuplicates?: boolean; overwrite?: boolean }
    const rows = parseCSV(body.csv)
    if (rows.length === 0) {
      return NextResponse.json({ error: "有効な行が見つかりません。ヘッダー形式を確認してください。" }, { status: 400 })
    }

    const errors: string[] = []
    const created: { date: string; slot: string }[] = []
    let skipped = 0
    let updated = 0

    for (const row of rows) {
      const slot = parseSlot(row.timeSlot)
      if (!slot) {
        errors.push(`行 "${row.date} ${row.timeSlot}": 時間帯が不正（morning/noon/night1/night2 または 朝/昼/夜①/夜②）`)
        continue
      }
      const postDate = buildPostDate(row.date, slot)
      if (isNaN(postDate.getTime())) {
        errors.push(`行 "${row.date}": 日付形式が不正（YYYY-MM-DD形式で入力）`)
        continue
      }

      // 既存チェック
      const existing = await prisma.post.findFirst({
        where: { accountId, postDate, timeSlot: slot },
      })

      if (existing) {
        if (body.overwrite) {
          // 上書きモード: 既存の内容を更新（投稿済みフラグは保持）
          await prisma.post.update({
            where: { id: existing.id },
            data: { content: row.content, memo: row.memo || existing.memo },
          })
          updated++
        } else if (body.skipDuplicates) {
          skipped++
        } else {
          // 強制追加モード（重複あり）
          await prisma.post.create({
            data: {
              accountId,
              content: row.content,
              postDate,
              timeSlot: slot,
              status: "scheduled",
              isPosted: false,
              memo: row.memo || null,
            },
          })
          created.push({ date: row.date, slot })
        }
      } else {
        await prisma.post.create({
          data: {
            accountId,
            content: row.content,
            postDate,
            timeSlot: slot,
            status: "scheduled",
            isPosted: false,
            memo: row.memo || null,
          },
        })
        created.push({ date: row.date, slot })
      }
    }

    return NextResponse.json({ created: created.length, updated, skipped, errors: errors.slice(0, 10) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
