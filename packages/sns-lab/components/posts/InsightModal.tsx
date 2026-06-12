"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface InsightModalProps {
  postId: string
  postContent: string
  onClose: () => void
  onSaved: () => void
}

export function InsightModal({ postId, postContent, onClose, onSaved }: InsightModalProps) {
  const [mode, setMode] = useState<"select" | "viral">("select")
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    impressions: "", likes: "", saves: "", comments: "", reposts: "", followerGain: "",
  })

  const handleNotViral = async () => {
    setSaving(true)
    await fetch(`/api/posts/${postId}/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isViral: false }),
    })
    setSaving(false)
    onSaved()
  }

  const handleViralSave = async () => {
    setSaving(true)
    await fetch(`/api/posts/${postId}/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isViral: true,
        impressions:   form.impressions   ? Number(form.impressions)   : null,
        likes:         form.likes         ? Number(form.likes)         : null,
        saves:         form.saves         ? Number(form.saves)         : null,
        comments:      form.comments      ? Number(form.comments)      : null,
        reposts:       form.reposts       ? Number(form.reposts)       : null,
        followerGain:  form.followerGain  ? Number(form.followerGain)  : null,
      }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>インサイト入力</DialogTitle>
        </DialogHeader>

        <div className="rounded-md bg-gray-50 border border-[var(--border)] p-3">
          <p className="text-xs text-[var(--foreground)] line-clamp-3 leading-relaxed">{postContent}</p>
        </div>

        {mode === "select" ? (
          <div className="space-y-3 pt-1">
            <p className="text-sm text-[var(--foreground)] font-medium">この投稿の結果は？</p>
            <Button
              variant="secondary"
              className="w-full h-12 text-sm border border-[var(--border)]"
              onClick={handleNotViral}
              disabled={saving}
            >
              😢 伸びなかった（ワンタップで記録）
            </Button>
            <Button
              variant="default"
              className="w-full h-12 text-sm"
              onClick={() => setMode("viral")}
            >
              🔥 伸びた！数値を入力する
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-green-600">🔥 伸びた投稿</span>
              <span className="text-xs text-[var(--muted-foreground)]">数値を入力してください</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "impressions",  label: "インプレッション", emoji: "👁" },
                { key: "followerGain", label: "フォロワー増加",   emoji: "👤" },
                { key: "likes",        label: "いいね",           emoji: "❤️" },
                { key: "saves",        label: "保存",             emoji: "🔖" },
                { key: "comments",     label: "コメント",         emoji: "💬" },
                { key: "reposts",      label: "リポスト",         emoji: "🔁" },
              ].map(({ key, label, emoji }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-[10px] text-[var(--muted-foreground)]">{emoji} {label}</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setMode("select")}>戻る</Button>
              <Button size="sm" onClick={handleViralSave} disabled={saving} className="flex-1">
                {saving ? "保存中..." : "保存する"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
