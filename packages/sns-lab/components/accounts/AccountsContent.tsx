"use client"

import { useEffect, useState } from "react"
import { Plus, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface Account {
  id: string
  name: string
  snsType: string
  username: string
  target: string | null
  worldview: string | null
  theme: string | null
  isActive: boolean
  _count: { posts: number }
}

const defaultForm = {
  name: "",
  snsType: "threads",
  username: "",
  target: "",
  worldview: "",
  theme: "",
}

export function AccountsContent() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Account | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [templateOpen, setTemplateOpen] = useState<string | null>(null)
  const [templates, setTemplates] = useState<{ id: string; timeSlot: string; promptText: string }[]>([])
  const [templateForm, setTemplateForm] = useState<Record<string, string>>({})

  const load = () => {
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts)
  }

  useEffect(() => { load() }, [])

  const handleOpen = (account?: Account) => {
    if (account) {
      setEditTarget(account)
      setForm({
        name: account.name,
        snsType: account.snsType,
        username: account.username,
        target: account.target || "",
        worldview: account.worldview || "",
        theme: account.theme || "",
      })
    } else {
      setEditTarget(null)
      setForm(defaultForm)
    }
    setOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    if (editTarget) {
      await fetch(`/api/accounts/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
    } else {
      await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
    }
    setSaving(false)
    setOpen(false)
    load()
  }

  const handleTemplateOpen = async (accountId: string) => {
    setTemplateOpen(accountId)
    const res = await fetch(`/api/accounts/${accountId}`)
    const data = await res.json()
    const temps = data.postTemplates || []
    setTemplates(temps)
    const m: Record<string, string> = {}
    for (const t of temps) m[t.timeSlot] = t.promptText
    setTemplateForm(m)
  }

  const handleTemplateSave = async () => {
    if (!templateOpen) return
    setSaving(true)
    for (const [slot, text] of Object.entries(templateForm)) {
      const existing = templates.find((t) => t.timeSlot === slot)
      if (existing) {
        await fetch(`/api/accounts/${templateOpen}/templates/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ promptText: text }),
        })
      } else if (text) {
        await fetch(`/api/accounts/${templateOpen}/templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timeSlot: slot, promptText: text }),
        })
      }
    }
    setSaving(false)
    setTemplateOpen(null)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => handleOpen()}>
          <Plus className="h-4 w-4" />
          アカウントを追加
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-20 text-[var(--muted-foreground)] text-sm">
          アカウントが登録されていません
        </div>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--secondary)] text-[var(--muted-foreground)]">
                        {account.snsType === "threads" ? "Threads" : "X"}
                      </span>
                      {account.name}
                    </CardTitle>
                    <CardDescription className="mt-0.5">
                      @{account.username} · {account._count.posts}投稿
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleTemplateOpen(account.id)}>
                      テンプレート
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(account)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {(account.target || account.worldview || account.theme) && (
                <CardContent className="space-y-2 pt-0">
                  {account.target && (
                    <div>
                      <span className="text-[10px] text-[var(--muted-foreground)]">ターゲット</span>
                      <p className="text-xs mt-0.5">{account.target}</p>
                    </div>
                  )}
                  {account.theme && (
                    <div>
                      <span className="text-[10px] text-[var(--muted-foreground)]">テーマ</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {account.theme.split("・").map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {account.worldview && (
                    <div>
                      <span className="text-[10px] text-[var(--muted-foreground)]">世界観</span>
                      <p className="text-xs mt-0.5 text-[var(--muted-foreground)]">{account.worldview}</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* アカウント作成/編集ダイアログ */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "アカウントを編集" : "新規アカウント"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>アカウント名</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="例: uwaki_happy" />
              </div>
              <div className="space-y-1.5">
                <Label>SNS種別</Label>
                <Select value={form.snsType} onValueChange={(v) => setForm((f) => ({ ...f, snsType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="threads">Threads</SelectItem>
                    <SelectItem value="x">X (Twitter)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ユーザー名 (@なし)</Label>
              <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="例: uwaki_happy" />
            </div>
            <div className="space-y-1.5">
              <Label>ターゲット</Label>
              <Textarea value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} placeholder="例: 浮気・別れを経験した20〜30代女性" className="min-h-[60px]" />
            </div>
            <div className="space-y-1.5">
              <Label>世界観</Label>
              <Textarea value={form.worldview} onChange={(e) => setForm((f) => ({ ...f, worldview: e.target.value }))} placeholder="例: 浮気された26歳女性がリアルタイムで感情をさらけ出す..." className="min-h-[60px]" />
            </div>
            <div className="space-y-1.5">
              <Label>発信テーマ（・区切り）</Label>
              <Input value={form.theme} onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))} placeholder="例: 浮気・別れ・自分軸・立ち直り" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
              <Button onClick={handleSave} disabled={saving || !form.name || !form.username}>
                {saving ? "保存中..." : "保存する"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* テンプレート編集ダイアログ */}
      <Dialog open={!!templateOpen} onOpenChange={() => setTemplateOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>投稿テンプレート設定</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(["morning", "noon", "night1", "night2"] as const).map((slot) => {
              const labels = { morning: "🌅 朝", noon: "☀️ 昼", night1: "🌙 夜①", night2: "🌃 夜②" }
              return (
                <div key={slot} className="space-y-1.5">
                  <Label>{labels[slot]}</Label>
                  <Textarea
                    value={templateForm[slot] || ""}
                    onChange={(e) => setTemplateForm((f) => ({ ...f, [slot]: e.target.value }))}
                    placeholder={`${labels[slot]}の投稿プロンプト...`}
                    className="min-h-[100px] text-xs font-mono"
                  />
                </div>
              )
            })}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setTemplateOpen(null)}>キャンセル</Button>
              <Button onClick={handleTemplateSave} disabled={saving}>
                {saving ? "保存中..." : "保存する"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
