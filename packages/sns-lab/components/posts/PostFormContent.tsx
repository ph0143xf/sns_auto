"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TIME_SLOTS, PATTERN_TYPES } from "@/lib/constants"
import { InsightModal } from "@/components/posts/InsightModal"
import { Trash2, ExternalLink } from "lucide-react"

interface PostFormContentProps {
  mode: "create" | "edit"
  paramsPromise?: Promise<{ id: string }>
}

export function PostFormContent({ mode, paramsPromise }: PostFormContentProps) {
  const router = useRouter()
  const resolvedParams = paramsPromise ? use(paramsPromise) : null
  const postId = resolvedParams?.id

  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([])
  const [series, setSeries] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(mode === "edit")
  const [saving, setSaving] = useState(false)
  const [showInsight, setShowInsight] = useState(false)

  const [form, setForm] = useState({
    accountId: "",
    seriesId: "",
    content: "",
    postDate: format(new Date(), "yyyy-MM-dd"),
    timeSlot: "morning",
    status: "draft",
    patternType: "",
    memo: "",
    learningMemo: "",
    externalUrl: "",
    isPosted: false,
  })

  const [existingInsight, setExistingInsight] = useState<{
    impressions: number | null; isViral: boolean; followerGain: number | null
  } | null>(null)

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((data) => {
      setAccounts(data || [])
      if (data?.length > 0 && !form.accountId) {
        setForm((f) => ({ ...f, accountId: data[0].id }))
        fetch(`/api/series?accountId=${data[0].id}`)
          .then((r) => r.json()).then(setSeries)
      }
    })
  }, [])

  useEffect(() => {
    if (mode === "edit" && postId) {
      fetch(`/api/posts/${postId}`)
        .then((r) => r.json())
        .then((data) => {
          setForm({
            accountId: data.accountId,
            seriesId: data.seriesId || "",
            content: data.content,
            postDate: format(new Date(data.postDate), "yyyy-MM-dd"),
            timeSlot: data.timeSlot,
            status: data.status,
            patternType: data.patternType ? String(data.patternType) : "",
            memo: data.memo || "",
            learningMemo: data.learningMemo || "",
            externalUrl: data.externalUrl || "",
            isPosted: data.isPosted,
          })
          if (data.insights?.length > 0) {
            setExistingInsight(data.insights[0])
          }
          setLoading(false)
        })
    }
  }, [mode, postId])

  const handleAccountChange = (id: string) => {
    setForm((f) => ({ ...f, accountId: id }))
    fetch(`/api/series?accountId=${id}`).then((r) => r.json()).then(setSeries)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      ...form,
      patternType: form.patternType ? Number(form.patternType) : null,
      seriesId: form.seriesId || null,
    }

    if (mode === "create") {
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    }
    setSaving(false)
    router.push("/posts")
  }

  const handleDelete = async () => {
    if (!confirm("この投稿を削除しますか？")) return
    await fetch(`/api/posts/${postId}`, { method: "DELETE" })
    router.push("/posts")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--muted-foreground)] text-sm">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="space-y-5">
        {/* 基本情報 */}
        <Card>
          <CardHeader>
            <CardTitle>{mode === "create" ? "新規投稿" : "投稿を編集"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>アカウント</Label>
                <Select value={form.accountId} onValueChange={handleAccountChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>シリーズ</Label>
                <Select value={form.seriesId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, seriesId: v === "none" ? "" : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="なし" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">なし</SelectItem>
                    {series.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>投稿日</Label>
                <Input
                  type="date"
                  value={form.postDate}
                  onChange={(e) => setForm((f) => ({ ...f, postDate: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>時間帯</Label>
                <Select value={form.timeSlot} onValueChange={(v) => setForm((f) => ({ ...f, timeSlot: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIME_SLOTS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>投稿本文</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="投稿本文を入力..."
                className="min-h-[180px] font-mono text-sm"
              />
              <p className="text-[10px] text-[var(--muted-foreground)] text-right">
                {form.content.length} 文字
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>投稿パターン</Label>
                <Select value={form.patternType || "none"} onValueChange={(v) => setForm((f) => ({ ...f, patternType: v === "none" ? "" : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="なし" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">なし</SelectItem>
                    {Object.entries(PATTERN_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>P{k}: {v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>ステータス</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">下書き</SelectItem>
                    <SelectItem value="scheduled">予約済み</SelectItem>
                    <SelectItem value="posted">投稿済み</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.externalUrl && (
              <div className="space-y-1.5">
                <Label>元投稿URL</Label>
                <div className="flex gap-2">
                  <Input value={form.externalUrl} onChange={(e) => setForm((f) => ({ ...f, externalUrl: e.target.value }))} />
                  <a href={form.externalUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="icon"><ExternalLink className="h-4 w-4" /></Button>
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* メモ・学びメモ */}
        <Card>
          <CardHeader>
            <CardTitle>メモ・学び</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>メモ</Label>
              <Textarea
                value={form.memo}
                onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
                placeholder="投稿に関するメモ..."
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>学びメモ（AI分析に使用）</Label>
              <Textarea
                value={form.learningMemo}
                onChange={(e) => setForm((f) => ({ ...f, learningMemo: e.target.value }))}
                placeholder="例: 怒り系が強かった、保存率が高かった..."
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* インサイト表示（編集時） */}
        {mode === "edit" && (
          <Card>
            <CardHeader>
              <CardTitle>インサイト</CardTitle>
            </CardHeader>
            <CardContent>
              {existingInsight ? (
                <div className="space-y-2">
                  {existingInsight.isViral ? (
                    <div className="space-y-2">
                      <span className="text-xs text-amber-600 font-medium">🔥 バズ投稿</span>
                      {existingInsight.impressions && (
                        <p className="text-sm">インプレッション: <strong>{existingInsight.impressions.toLocaleString()}</strong></p>
                      )}
                      {existingInsight.followerGain !== null && (
                        <p className="text-sm">フォロワー増加: <strong>+{existingInsight.followerGain}</strong></p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--muted-foreground)]">😢 伸びなかった投稿として記録済み</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-xs text-[var(--muted-foreground)]">インサイト未入力</p>
                  <Button size="sm" variant="outline" onClick={() => setShowInsight(true)}>
                    入力する
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* アクションボタン */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving || !form.content || !form.accountId}>
            {saving ? "保存中..." : mode === "create" ? "作成する" : "更新する"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/posts")}>
            キャンセル
          </Button>
          {mode === "edit" && (
            <Button variant="destructive" size="sm" className="ml-auto" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              削除
            </Button>
          )}
        </div>
      </div>

      {showInsight && postId && (
        <InsightModal
          postId={postId}
          postContent={form.content}
          onClose={() => setShowInsight(false)}
          onSaved={() => {
            setShowInsight(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
