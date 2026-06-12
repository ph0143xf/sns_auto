"use client"

import { useEffect, useState, useCallback } from "react"
import { format } from "date-fns"
import { Plus, Trash2, Calendar, Check, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface Idea {
  id: string
  content: string
  memo: string | null
  status: string
  sourceType: string
  category: string | null
  createdAt: string
}

const SOURCE_LABELS: Record<string, string> = {
  manual: "手動",
  generated: "AI生成",
  winning_variant: "派生",
}

const TIME_SLOTS_LIST = [
  { value: "morning", label: "🌅 朝" },
  { value: "noon",    label: "☀️ 昼" },
  { value: "night1",  label: "🌙 夜①" },
  { value: "night2",  label: "🌃 夜②" },
]

export function IdeasContent() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [accountId, setAccountId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "unused" | "used">("unused")
  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ content: "", memo: "" })
  const [scheduleTarget, setScheduleTarget] = useState<Idea | null>(null)
  const [scheduleForm, setScheduleForm] = useState({ date: "", timeSlot: "morning" })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (accId: string, st: string) => {
    const q = st === "all" ? "" : `&status=${st}`
    const res = await fetch(`/api/ideas?accountId=${accId}${q}`)
    const data = await res.json()
    setIdeas(data)
  }, [])

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((accounts) => {
      if (accounts?.length > 0) {
        setAccountId(accounts[0].id)
        load(accounts[0].id, filter)
      }
    })
  }, [])

  useEffect(() => {
    if (accountId) load(accountId, filter)
  }, [filter, accountId, load])

  const handleAddSave = async () => {
    if (!accountId || !addForm.content.trim()) return
    setSaving(true)
    await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, content: addForm.content, memo: addForm.memo, sourceType: "manual" }),
    })
    setSaving(false)
    setAddOpen(false)
    setAddForm({ content: "", memo: "" })
    load(accountId, filter)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return
    await fetch(`/api/ideas/${id}`, { method: "DELETE" })
    if (accountId) load(accountId, filter)
  }

  const handleMarkUsed = async (id: string) => {
    await fetch(`/api/ideas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "used" }),
    })
    if (accountId) load(accountId, filter)
  }

  const handleSchedule = async () => {
    if (!scheduleTarget || !accountId || !scheduleForm.date) return
    setSaving(true)
    await fetch(`/api/ideas/${scheduleTarget.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, date: scheduleForm.date, timeSlot: scheduleForm.timeSlot }),
    })
    setSaving(false)
    setScheduleTarget(null)
    if (accountId) load(accountId, filter)
    alert("投稿予定に追加しました")
  }

  const filtered = ideas.filter((idea) =>
    !search || idea.content.includes(search) || (idea.memo ?? "").includes(search)
  )

  return (
    <div className="p-6 max-w-3xl">
      {/* フィルター + アクション */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex rounded-md border border-[var(--border)] overflow-hidden">
          {(["unused", "all", "used"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
              }`}
            >
              {f === "unused" ? "未使用" : f === "used" ? "使用済み" : "すべて"}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="検索..." className="pl-7 h-8 text-sm w-40" />
        </div>
        <span className="text-xs text-[var(--muted-foreground)]">{filtered.length}件</span>
        <Button size="sm" onClick={() => setAddOpen(true)} className="ml-auto">
          <Plus className="h-4 w-4" />
          手動追加
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[var(--muted-foreground)] text-sm">
          {filter === "unused" ? "未使用のネタがありません。投稿生成や派生生成でネタを貯めましょう。" : "ネタがありません"}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((idea) => (
            <Card key={idea.id} className={`group ${idea.status === "used" ? "opacity-60" : ""}`}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={idea.sourceType === "generated" ? "default" : "secondary"} className="text-[10px]">
                        {SOURCE_LABELS[idea.sourceType] ?? idea.sourceType}
                      </Badge>
                      {idea.status === "used" && <Badge variant="success" className="text-[10px]">使用済み</Badge>}
                      <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">
                        {format(new Date(idea.createdAt), "M/d")}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">{idea.content}</p>
                    {idea.memo && (
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-1.5 bg-gray-50 rounded px-2 py-1">
                        📝 {idea.memo}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {idea.status === "unused" && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={() => { setScheduleTarget(idea); setScheduleForm({ date: "", timeSlot: "morning" }) }}>
                          <Calendar className="h-3 w-3 mr-1" />投稿予定
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2" onClick={() => handleMarkUsed(idea.id)}>
                          <Check className="h-3 w-3 mr-1" />使用済み
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100" onClick={() => handleDelete(idea.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 手動追加ダイアログ */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ネタを手動追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>投稿ネタ <span className="text-red-500">*</span></Label>
              <Textarea value={addForm.content} onChange={(e) => setAddForm((f) => ({ ...f, content: e.target.value }))} placeholder="投稿アイデアを入力..." className="min-h-[100px]" />
            </div>
            <div className="space-y-1.5">
              <Label>メモ</Label>
              <Input value={addForm.memo} onChange={(e) => setAddForm((f) => ({ ...f, memo: e.target.value }))} placeholder="このネタのポイントなど" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddOpen(false)}>キャンセル</Button>
              <Button onClick={handleAddSave} disabled={saving || !addForm.content.trim()}>
                {saving ? "保存中..." : "追加する"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* スケジュールダイアログ */}
      {scheduleTarget && (
        <Dialog open onOpenChange={() => setScheduleTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>投稿予定に追加</DialogTitle>
            </DialogHeader>
            <div className="rounded-md bg-gray-50 border border-[var(--border)] p-3 text-xs line-clamp-3">
              {scheduleTarget.content}
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>投稿日</Label>
                <Input type="date" value={scheduleForm.date} onChange={(e) => setScheduleForm((f) => ({ ...f, date: e.target.value }))} min={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="space-y-1.5">
                <Label>時間帯</Label>
                <Select value={scheduleForm.timeSlot} onValueChange={(v) => setScheduleForm((f) => ({ ...f, timeSlot: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS_LIST.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setScheduleTarget(null)}>キャンセル</Button>
                <Button className="flex-1" disabled={!scheduleForm.date || saving} onClick={handleSchedule}>
                  {saving ? "追加中..." : "追加する"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
