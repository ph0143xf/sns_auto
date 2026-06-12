"use client"

import { useEffect, useState } from "react"
import { format, addDays, startOfDay } from "date-fns"
import { ja } from "date-fns/locale"
import { Loader2, BookOpen, Calendar, Zap, Edit3, Check, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { PATTERN_TYPES, TIME_SLOTS } from "@/lib/constants"

interface Account { id: string; name: string; snsType: string }

interface GeneratedPost {
  date: string
  timeSlot: "morning" | "noon" | "night1" | "night2"
  content: string
  patternType: number | null
  memo: string
  _saved?: "ideas" | "scheduled"
  _timeSlotLabel?: string
  _dateLabel?: string
}

const TIME_SLOTS_LIST = [
  { value: "morning", label: "🌅 朝" },
  { value: "noon",    label: "☀️ 昼" },
  { value: "night1",  label: "🌙 夜①" },
  { value: "night2",  label: "🌃 夜②" },
]

export function GenerateContent() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState("")
  const [days, setDays] = useState<7 | 14 | 30>(7)
  const [step, setStep] = useState<"config" | "generating" | "review">("config")
  const [posts, setPosts] = useState<GeneratedPost[]>([])
  const [editTarget, setEditTarget] = useState<{ index: number; post: GeneratedPost } | null>(null)
  const [editContent, setEditContent] = useState("")
  const [scheduleTarget, setScheduleTarget] = useState<{ index: number; post: GeneratedPost } | null>(null)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleSlot, setScheduleSlot] = useState("morning")
  const [saving, setSaving] = useState<number | null>(null)
  const [savingAll, setSavingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((data) => {
      setAccounts(data || [])
      if (data?.length > 0) setAccountId(data[0].id)
    })
  }, [])

  const handleGenerate = async () => {
    setError(null)
    setStep("generating")
    const startDate = format(addDays(startOfDay(new Date()), 1), "yyyy-MM-dd")
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, days, startDate }),
    })
    const data = await res.json()
    if (data.error) {
      setError(data.error.includes("ANTHROPIC_API_KEY") ? "ANTHROPIC_API_KEY が未設定です" : data.error)
      setStep("config")
      return
    }
    setPosts(data.posts || [])
    setStep("review")
  }

  const handleSaveToIdeas = async (index: number) => {
    const post = posts[index]
    if (!post) return
    setSaving(index)
    await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, content: post.content, memo: post.memo, sourceType: "generated", status: "unused" }),
    })
    setPosts((prev) => prev.map((p, i) => i === index ? { ...p, _saved: "ideas" } : p))
    setSaving(null)
  }

  const handleScheduleDirect = async () => {
    if (!scheduleTarget || !scheduleDate) return
    const { index, post } = scheduleTarget
    setSaving(index)
    await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        content: post.content,
        postDate: scheduleDate,
        timeSlot: scheduleSlot,
        status: "scheduled",
        memo: post.memo,
        patternType: post.patternType,
      }),
    })
    setPosts((prev) => prev.map((p, i) => i === index ? { ...p, _saved: "scheduled" } : p))
    setSaving(null)
    setScheduleTarget(null)
  }

  const handleSaveAllToIdeas = async () => {
    setSavingAll(true)
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i]
      if (p._saved) continue
      await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, content: p.content, memo: p.memo, sourceType: "generated", status: "unused" }),
      })
    }
    setPosts((prev) => prev.map((p) => ({ ...p, _saved: p._saved ?? "ideas" })))
    setSavingAll(false)
    alert(`${posts.length}件をネタ保管庫に保存しました`)
  }

  const handleScheduleAll = async () => {
    setSavingAll(true)
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i]
      if (p._saved) continue
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          content: p.content,
          postDate: p.date,
          timeSlot: p.timeSlot,
          status: "scheduled",
          memo: p.memo,
          patternType: p.patternType,
        }),
      })
    }
    setPosts((prev) => prev.map((p) => ({ ...p, _saved: p._saved ?? "scheduled" })))
    setSavingAll(false)
    alert(`${posts.length}件を投稿予定に追加しました`)
  }

  const handleEditSave = () => {
    if (!editTarget) return
    setPosts((prev) => prev.map((p, i) => i === editTarget.index ? { ...p, content: editContent } : p))
    setEditTarget(null)
  }

  const account = accounts.find((a) => a.id === accountId)
  const savedCount = posts.filter((p) => p._saved).length

  return (
    <div className="p-6 max-w-3xl space-y-5">

      {/* ---- Step: Config ---- */}
      {step === "config" && (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>投稿生成設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>アカウント</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.snsType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>生成日数</Label>
                <div className="flex gap-2">
                  {([7, 14, 30] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${
                        days === d
                          ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]"
                          : "border-[var(--border)] text-[var(--foreground)] hover:border-indigo-200"
                      }`}
                    >
                      {d}日分
                      <span className="text-[10px] text-[var(--muted-foreground)] block">({d * 4}投稿)</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-[var(--muted)] rounded-md px-4 py-3 space-y-1">
            <p className="text-xs font-medium text-[var(--foreground)]">生成時の参照データ</p>
            <ul className="text-xs text-[var(--muted-foreground)] space-y-0.5">
              <li>① 自アカウントの勝ち投稿DB（フォロワー増加順）</li>
              <li>② 伸びなかった投稿（避けるパターン抽出）</li>
              <li>③ 手動登録した競合投稿（最重要データ）</li>
              <li>④ 学びメモ（直近30投稿分）</li>
              <li>⑤ 最新のAI分析結果</li>
              <li>⑥ アカウント別の時間帯プロンプト</li>
              <li className="text-indigo-600 font-medium">⑦ 改善提案AIの優先テーマ・回避テーマ（最優先反映）</li>
            </ul>
            <p className="text-[10px] text-[var(--muted-foreground)] pt-1">
              KPI優先: フォロワー増加 → フォロー率 → 保存率 → コメント率 → いいね率
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button className="w-full h-11" onClick={handleGenerate} disabled={!accountId}>
            <Zap className="h-4 w-4 mr-2" />
            {days}日分（{days * 4}投稿）を生成する
          </Button>
        </div>
      )}

      {/* ---- Step: Generating ---- */}
      {step === "generating" && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
          <p className="text-sm font-medium text-[var(--foreground)]">投稿を生成しています...</p>
          <div className="text-xs text-[var(--muted-foreground)] text-center space-y-1">
            <p>勝ち投稿・競合データ・学びメモを分析中</p>
            <p>通常20〜40秒かかります</p>
          </div>
        </div>
      )}

      {/* ---- Step: Review ---- */}
      {step === "review" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {posts.length}件 生成完了 ({account?.name})
              {savedCount > 0 && <span className="text-[var(--muted-foreground)] ml-2">— {savedCount}件保存済み</span>}
            </p>
            <Button variant="outline" size="sm" onClick={() => { setStep("config"); setPosts([]) }}>
              再生成
            </Button>
          </div>

          {/* 一括操作 */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" disabled={savingAll} onClick={handleSaveAllToIdeas}>
              {savingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5 mr-1" />}
              一括: ネタ保管庫へ
            </Button>
            <Button size="sm" className="flex-1" disabled={savingAll} onClick={handleScheduleAll}>
              {savingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5 mr-1" />}
              一括: 投稿予定へ
            </Button>
          </div>

          {/* 投稿リスト */}
          <div className="space-y-2">
            {posts.map((post, i) => {
              const date = new Date(post.date)
              return (
                <div
                  key={i}
                  className={`border rounded-md p-3 transition-colors ${
                    post._saved === "scheduled" ? "border-green-200 bg-green-50" :
                    post._saved === "ideas"     ? "border-indigo-200 bg-[var(--primary-light)]" :
                    "border-[var(--border)] bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-medium text-[var(--foreground)]">
                      {format(date, "M/d（E）", { locale: ja })}
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {TIME_SLOTS[post.timeSlot]?.emoji} {TIME_SLOTS[post.timeSlot]?.label}
                    </span>
                    {post.patternType && (
                      <span className={`text-[10px] px-1.5 rounded-full ${PATTERN_TYPES[post.patternType as keyof typeof PATTERN_TYPES]?.color ?? ""}`}>
                        P{post.patternType}
                      </span>
                    )}
                    {post._saved === "scheduled" && <span className="text-[10px] text-green-600 font-medium ml-auto">✓ 投稿予定</span>}
                    {post._saved === "ideas"     && <span className="text-[10px] text-indigo-600 font-medium ml-auto">✓ 保管庫</span>}
                  </div>

                  <p className="text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">{post.content}</p>

                  {post.memo && (
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-1.5 bg-gray-50 rounded px-2 py-1">📝 {post.memo}</p>
                  )}

                  {!post._saved && (
                    <div className="flex gap-1.5 mt-2">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => { setEditTarget({ index: i, post }); setEditContent(post.content) }}>
                        <Edit3 className="h-3 w-3 mr-1" />編集
                      </Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" disabled={saving === i} onClick={() => handleSaveToIdeas(i)}>
                        {saving === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookOpen className="h-3 w-3 mr-1" />}
                        ネタ保管庫
                      </Button>
                      <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => { setScheduleTarget({ index: i, post }); setScheduleDate(post.date); setScheduleSlot(post.timeSlot) }}>
                        <Calendar className="h-3 w-3 mr-1" />
                        投稿予定
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 編集ダイアログ */}
      {editTarget && (
        <Dialog open onOpenChange={() => setEditTarget(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>投稿を編集</DialogTitle>
            </DialogHeader>
            <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-[160px] font-mono text-sm" />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditTarget(null)}>キャンセル</Button>
              <Button onClick={handleEditSave}>
                <Check className="h-4 w-4 mr-1" />保存
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* スケジュールダイアログ */}
      {scheduleTarget && (
        <Dialog open onOpenChange={() => setScheduleTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>投稿予定に追加</DialogTitle>
            </DialogHeader>
            <div className="rounded-md bg-gray-50 border border-[var(--border)] p-3 text-xs line-clamp-3">
              {scheduleTarget.post.content}
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>投稿日</Label>
                <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="space-y-1.5">
                <Label>時間帯</Label>
                <Select value={scheduleSlot} onValueChange={setScheduleSlot}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS_LIST.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setScheduleTarget(null)}>キャンセル</Button>
                <Button className="flex-1" disabled={!scheduleDate || saving === scheduleTarget.index} onClick={handleScheduleDirect}>
                  {saving === scheduleTarget.index ? <Loader2 className="h-4 w-4 animate-spin" /> : "追加する"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
