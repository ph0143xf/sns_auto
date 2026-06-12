"use client"

import { useEffect, useRef, useState } from "react"
import { Upload, AlertTriangle, CheckCircle2, Copy, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ParsedRow { date: string; timeSlot: string; content: string; memo: string }

const SAMPLE_CSV = `date,timeSlot,content,memo
2026-06-13,morning,"自慢の彼氏がいる人、どうやって出会ったの？
毎日不安で眠れない私に教えてほしい。",朝フック
2026-06-13,noon,"浮気って、された側だけが傷つくと思ってた。
でも気づいたら自分の心まで壊れてた。",昼共感
2026-06-13,night1,今日も頑張って生きてる。それだけで十分だって、誰かに言ってほしい。,夜①
2026-06-13,night2,"「もう好きじゃない」って言えたら楽なのに。
好きなまま傷ついてる。",夜②`

function parseCSVRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (inQuotes) {
      if (ch === '"' && s[i + 1] === '"') { field += '"'; i += 2 }
      else if (ch === '"') { inQuotes = false; i++ }
      else { field += ch; i++ }
    } else {
      if (ch === '"') { inQuotes = true; i++ }
      else if (ch === ',') { row.push(field); field = ""; i++ }
      else if (ch === '\n') {
        row.push(field)
        if (row.some((f) => f.trim())) rows.push(row)
        row = []; field = ""; i++
      } else { field += ch; i++ }
    }
  }
  row.push(field)
  if (row.some((f) => f.trim())) rows.push(row)
  return rows
}

function parseCSVPreview(csv: string): ParsedRow[] {
  const rows = parseCSVRows(csv)
  if (rows.length < 2) return []
  const header = rows[0].map((h) => h.trim().toLowerCase())
  const dateIdx    = header.findIndex((h) => ["date", "日付"].includes(h))
  const slotIdx    = header.findIndex((h) => ["timeslot", "time_slot", "slot", "時間帯"].includes(h))
  const contentIdx = header.findIndex((h) => ["content", "本文", "投稿内容", "text"].includes(h))
  const memoIdx    = header.findIndex((h) => ["memo", "メモ", "note"].includes(h))
  if (dateIdx === -1 || slotIdx === -1 || contentIdx === -1) return []
  return rows.slice(1).map((cols) => ({
    date:     (cols[dateIdx]    ?? "").trim(),
    timeSlot: (cols[slotIdx]    ?? "").trim(),
    content:  (cols[contentIdx] ?? "").trim(),
    memo:     memoIdx >= 0 ? (cols[memoIdx] ?? "").trim() : "",
  })).filter((r) => r.date && r.timeSlot && r.content)
}

const SLOT_LABEL: Record<string, string> = {
  morning: "🌅 朝 8:00", noon: "☀️ 昼 12:30",
  night1: "🌙 夜① 18:20", night2: "🌃 夜② 20:30",
  朝: "🌅 朝 8:00", 昼: "☀️ 昼 12:30", "夜①": "🌙 夜① 18:20", "夜②": "🌃 夜② 20:30",
}

export function ImportContent() {
  const [accountId, setAccountId] = useState<string | null>(null)
  const [csvText, setCsvText] = useState("")
  const [preview, setPreview] = useState<ParsedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ created: number; updated?: number; skipped: number; errors: string[]; error?: string } | null>(null)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [overwrite, setOverwrite] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((accounts) => {
      if (accounts?.length > 0) setAccountId(accounts[0].id)
    })
  }, [])

  const handleCsvChange = (text: string) => {
    setCsvText(text)
    setPreview(parseCSVPreview(text))
    setResult(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => handleCsvChange(ev.target?.result as string ?? "")
    reader.readAsText(file, "utf-8")
  }

  const handleImport = async () => {
    if (!accountId || !csvText.trim()) return
    setLoading(true)
    setResult(null)
    const res = await fetch(`/api/import?accountId=${accountId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: csvText, skipDuplicates: overwrite ? false : skipDuplicates, overwrite }),
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "投稿スケジュール_サンプル.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopySample = () => { navigator.clipboard.writeText(SAMPLE_CSV) }

  return (
    <div className="px-3 py-4 sm:p-6 max-w-3xl space-y-4">

      {/* CSVアップロードエリア（最優先） */}
      <Card>
        <CardHeader className="pb-3 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-sm">CSVを選択 / 貼り付け</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 sm:px-6">
          {/* ファイル選択（大きなタップターゲット） */}
          <div
            className="border-2 border-dashed border-[var(--border)] rounded-xl p-5 text-center cursor-pointer hover:border-[var(--primary)] active:bg-gray-50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-7 w-7 mx-auto mb-2 text-[var(--muted-foreground)]" />
            <p className="text-sm font-medium text-[var(--foreground)]">タップしてCSVを選択</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">または下のテキスト欄に貼り付け</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
          </div>

          <textarea
            className="w-full h-36 text-xs font-mono border border-[var(--border)] rounded-xl p-3 resize-y bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            placeholder={"date,timeSlot,content,memo\n2026-06-13,morning,投稿内容...,"}
            value={csvText}
            onChange={(e) => handleCsvChange(e.target.value)}
          />

          {/* オプション */}
          <div className="space-y-2 pt-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                id="overwrite"
                type="checkbox"
                checked={overwrite}
                onChange={(e) => { setOverwrite(e.target.checked); if (e.target.checked) setSkipDuplicates(false) }}
                className="mt-0.5 w-4 h-4 rounded"
              />
              <span className="text-xs font-medium text-amber-700 leading-relaxed">
                ⚠️ 上書きモード：既存の投稿内容を新しい内容で上書き（投稿済みフラグは保持）
              </span>
            </label>
            {!overwrite && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  id="skipDup"
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded"
                />
                <span className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  同じ日付・時間帯が既に存在する場合はスキップ
                </span>
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {/* プレビュー */}
      {preview.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-4 sm:px-6">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>プレビュー</span>
              <span className="text-[var(--muted-foreground)] font-normal text-xs">{preview.length}行を認識</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {preview.slice(0, 20).map((row, i) => (
                <div key={i} className="text-xs border-b border-[var(--border)] pb-2 last:border-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[var(--muted-foreground)] w-5 flex-shrink-0">{i + 1}</span>
                    <span className="text-[var(--muted-foreground)]">{row.date}</span>
                    <span className="text-indigo-600 font-medium">{SLOT_LABEL[row.timeSlot] ?? row.timeSlot}</span>
                  </div>
                  <p className="text-[var(--foreground)] line-clamp-2 pl-7 leading-relaxed">{row.content}</p>
                </div>
              ))}
              {preview.length > 20 && (
                <p className="text-[10px] text-[var(--muted-foreground)] text-center pt-1">… 他 {preview.length - 20} 行</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* インポートボタン（大きなタップターゲット） */}
      {preview.length > 0 && !result && (
        <Button
          className="w-full min-h-[52px] text-base font-semibold rounded-xl"
          disabled={loading}
          onClick={handleImport}
        >
          {loading ? "インポート中..." : `${preview.length}件をインポートする`}
        </Button>
      )}

      {/* CSVフォーマット説明（折りたたみ） */}
      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium text-[var(--foreground)] list-none">
          <span>📋 CSVフォーマットを確認する</span>
          <span className="text-[var(--muted-foreground)] text-xs group-open:hidden">▼</span>
          <span className="text-[var(--muted-foreground)] text-xs hidden group-open:inline">▲</span>
        </summary>
        <div className="mt-2 space-y-3 px-1">
          <div className="font-mono text-[11px] bg-gray-50 border border-[var(--border)] rounded-xl p-3 overflow-x-auto whitespace-pre">
            {SAMPLE_CSV}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleDownloadSample} className="min-h-[44px] flex-1 sm:flex-none">
              <Download className="h-3.5 w-3.5 mr-1.5" />サンプル DL
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopySample} className="min-h-[44px] flex-1 sm:flex-none">
              <Copy className="h-3.5 w-3.5 mr-1.5" />コピー
            </Button>
          </div>
          <div className="text-xs text-[var(--muted-foreground)] space-y-1.5 bg-gray-50 rounded-xl p-3">
            <p className="font-medium text-[var(--foreground)]">timeSlot の値</p>
            <p>🌅 morning / 朝 → 8:00</p>
            <p>☀️ noon / 昼 → 12:30</p>
            <p>🌙 night1 / 夜① → 18:20</p>
            <p>🌃 night2 / 夜② → 20:30</p>
            <p className="mt-2 font-medium text-[var(--foreground)]">注意</p>
            <p>日付は YYYY-MM-DD 形式。改行やカンマを含む場合は " で囲む。</p>
          </div>
        </div>
      </details>

      {/* 結果 */}
      {result && (
        <Card>
          <CardContent className="pt-5 space-y-4 px-4 sm:px-6">
            {result.error ? (
              <div className="flex items-start gap-2 text-red-600 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{result.error}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-green-600 text-base font-semibold">
                  <CheckCircle2 className="h-5 w-5" />
                  インポート完了
                </div>
                <div className="text-sm text-[var(--muted-foreground)] space-y-1">
                  {result.created > 0 && <p>✅ 追加: <strong className="text-[var(--foreground)]">{result.created}件</strong></p>}
                  {(result.updated ?? 0) > 0 && <p>✏️ 上書き更新: <strong className="text-[var(--foreground)]">{result.updated}件</strong></p>}
                  {result.skipped > 0 && <p>⏭ スキップ: {result.skipped}件（重複）</p>}
                  {result.errors?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-amber-600 font-medium">エラー行:</p>
                      {result.errors.map((e, i) => <p key={i} className="text-red-500 text-xs">{e}</p>)}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="w-full min-h-[48px] text-sm rounded-xl"
                  onClick={() => window.location.href = "/posts/calendar"}
                >
                  カレンダーで確認
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
