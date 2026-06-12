"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, ExternalLink, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface CompetitorPost {
  id: string
  platform: string
  url: string | null
  content: string
  authorName: string | null
  memo: string | null
  analysis: string | null
  savedAt: string
}

const defaultForm = {
  platform: "threads",
  url: "",
  content: "",
  authorName: "",
  memo: "",
}

export function CompetitorContent() {
  const [posts, setPosts] = useState<CompetitorPost[]>([])
  const [accountId, setAccountId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CompetitorPost | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")

  const load = async (accId: string) => {
    const res = await fetch(`/api/competitor?accountId=${accId}`)
    const data = await res.json()
    setPosts(data)
  }

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((accounts) => {
      if (accounts?.length > 0) {
        setAccountId(accounts[0].id)
        load(accounts[0].id)
      }
    })
  }, [])

  const handleOpen = (post?: CompetitorPost) => {
    if (post) {
      setEditTarget(post)
      setForm({ platform: post.platform, url: post.url || "", content: post.content, authorName: post.authorName || "", memo: post.memo || "" })
    } else {
      setEditTarget(null)
      setForm(defaultForm)
    }
    setOpen(true)
  }

  const handleSave = async () => {
    if (!accountId || !form.content.trim()) return
    setSaving(true)
    if (editTarget) {
      await fetch(`/api/competitor/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
    } else {
      await fetch("/api/competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, accountId }),
      })
    }
    setSaving(false)
    setOpen(false)
    load(accountId)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return
    await fetch(`/api/competitor/${id}`, { method: "DELETE" })
    if (accountId) load(accountId)
  }

  const filtered = posts.filter((p) =>
    !search || p.content.includes(search) || (p.authorName ?? "").includes(search) || (p.memo ?? "").includes(search)
  )

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Input
          placeholder="検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
        <span className="text-xs text-[var(--muted-foreground)] ml-1">{filtered.length}件</span>
        <Button size="sm" onClick={() => handleOpen()} className="ml-auto">
          <Plus className="h-4 w-4" />
          競合投稿を追加
        </Button>
      </div>

      <div className="text-xs text-[var(--muted-foreground)] bg-indigo-50 border border-indigo-100 rounded-md px-3 py-2">
        💡 競合投稿の手動保存が最優先の分析データです。URLと本文を保存するだけでAI分析・投稿生成に自動反映されます。
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[var(--muted-foreground)] text-sm">
          競合投稿がありません。バズった競合の投稿を追加してください。
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <Card key={post.id} className="group">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">
                        {post.platform === "threads" ? "Threads" : post.platform === "x" ? "X" : "other"}
                      </Badge>
                      {post.authorName && (
                        <span className="text-xs text-[var(--muted-foreground)]">@{post.authorName}</span>
                      )}
                      {post.url && (
                        <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-[var(--muted-foreground)] hover:text-[var(--primary)]">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">
                        {new Date(post.savedAt).toLocaleDateString("ja-JP")}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">{post.content}</p>

                    {post.memo && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-2 bg-gray-50 rounded px-2 py-1">
                        📝 {post.memo}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpen(post)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDelete(post.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "競合投稿を編集" : "競合投稿を追加"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>プラットフォーム</Label>
                <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="threads">Threads</SelectItem>
                    <SelectItem value="x">X (Twitter)</SelectItem>
                    <SelectItem value="other">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>投稿者名（@なし）</Label>
                <Input value={form.authorName} onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))} placeholder="例: rival_account" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>投稿URL</Label>
              <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://www.threads.net/..." />
            </div>
            <div className="space-y-1.5">
              <Label>投稿本文 <span className="text-red-500">*</span></Label>
              <Textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="バズった投稿の本文をコピペしてください" className="min-h-[120px]" />
            </div>
            <div className="space-y-1.5">
              <Label>分析メモ</Label>
              <Textarea value={form.memo} onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} placeholder="なぜバズったか？どこを参考にするか？" className="min-h-[60px]" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
              <Button onClick={handleSave} disabled={saving || !form.content.trim()}>
                {saving ? "保存中..." : "保存する"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
