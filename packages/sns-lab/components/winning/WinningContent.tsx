"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { Zap, BookOpen, Calendar, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TIME_SLOTS, PATTERN_TYPES } from "@/lib/constants"

interface WinningPost {
  id: string
  impressions: number | null
  likes: number | null
  saves: number | null
  comments: number | null
  followerGain: number | null
  followRate: number | null
  saveRate: number | null
  commentRate: number | null
  isViral: boolean
  post: {
    id: string
    content: string
    timeSlot: string
    postDate: string
    patternType: number | null
    learningMemo: string | null
  }
}

interface Variant {
  content: string
  memo: string
}

const VARIANT_TYPES = [
  { key: "similar10", label: "類似10件",     emoji: "📋", desc: "同テーマ・別表現で10件" },
  { key: "paradox",   label: "逆説版",       emoji: "🔄", desc: "常識を裏切る逆説的な切り口" },
  { key: "anger",     label: "怒り版",       emoji: "😤", desc: "怒り・共感に特化" },
  { key: "empathy",   label: "共感版",       emoji: "🤝", desc: "寄り添い・温かいトーン" },
  { key: "save",      label: "保存狙い版",   emoji: "🔖", desc: "リスト・まとめ形式" },
  { key: "follow",    label: "フォロー獲得版", emoji: "👤", desc: "自己開示・続き予告" },
]

const TIME_SLOTS_LIST = [
  { value: "morning", label: "🌅 朝" },
  { value: "noon",    label: "☀️ 昼" },
  { value: "night1",  label: "🌙 夜①" },
  { value: "night2",  label: "🌃 夜②" },
]

export function WinningContent() {
  const [posts, setPosts] = useState<WinningPost[]>([])
  const [accountId, setAccountId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedPost, setSelectedPost] = useState<WinningPost | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [variants, setVariants] = useState<Variant[]>([])
  const [scheduleTarget, setScheduleTarget] = useState<Variant | null>(null)
  const [scheduleForm, setScheduleForm] = useState({ date: "", timeSlot: "morning" })
  const [saving, setSaving] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((accounts) => {
      if (accounts?.length > 0) {
        setAccountId(accounts[0].id)
        fetch(`/api/winning?accountId=${accounts[0].id}`).then((r) => r.json()).then((d) => {
          setPosts(d)
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })
  }, [])

  const handleGenerate = async () => {
    if (!selectedPost || !selectedVariant) return
    setGenerating(true)
    setVariants([])
    const res = await fetch(`/api/winning/${selectedPost.post.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantType: selectedVariant }),
    })
    const data = await res.json()
    setVariants(data.variants || [])
    setGenerating(false)
  }

  const handleSaveToIdeas = async (variant: Variant, index: number) => {
    if (!accountId) return
    setSaving(index)
    await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        content: variant.content,
        memo: variant.memo,
        sourceType: "winning_variant",
        generatedFrom: selectedPost?.post.id,
        status: "unused",
      }),
    })
    setSaving(null)
    alert("ネタ保管庫に保存しました")
  }

  const handleSchedule = async () => {
    if (!scheduleTarget || !accountId || !scheduleForm.date) return
    setSaving(-1)
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        content: scheduleTarget.content,
        memo: scheduleTarget.memo,
        sourceType: "winning_variant",
        generatedFrom: selectedPost?.post.id,
        status: "unused",
      }),
    })
    const idea = await res.json()
    await fetch(`/api/ideas/${idea.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, date: scheduleForm.date, timeSlot: scheduleForm.timeSlot }),
    })
    setSaving(null)
    setScheduleTarget(null)
    alert("投稿予定に追加しました")
  }

  const closeModal = () => {
    setSelectedPost(null)
    setSelectedVariant(null)
    setVariants([])
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-[var(--muted-foreground)] text-sm">読み込み中...</div></div>
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-[var(--muted-foreground)]">
          KPI優先: フォロワー増加 → フォロー率 → 保存率 → コメント率 → いいね率
        </p>
        <span className="text-xs text-[var(--muted-foreground)]">{posts.length}件</span>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 text-[var(--muted-foreground)] text-sm">
          バズ投稿がまだありません。投稿後にインサイトを入力すると自動でここに表示されます。
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((w) => (
            <Card key={w.id} className="group">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">🔥 バズ</span>
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        {format(new Date(w.post.postDate), "M/d（E）", { locale: ja })}
                        {" · "}{TIME_SLOTS[w.post.timeSlot as keyof typeof TIME_SLOTS]?.label}
                      </span>
                      {w.post.patternType && (
                        <span className={`text-[10px] px-1.5 rounded-full ${PATTERN_TYPES[w.post.patternType as keyof typeof PATTERN_TYPES]?.color}`}>
                          P{w.post.patternType}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--foreground)] leading-relaxed line-clamp-3">{w.post.content}</p>
                    <div className="flex gap-3 mt-2 text-[10px] text-[var(--muted-foreground)]">
                      {w.followerGain != null && <span className="text-green-600 font-medium">+{w.followerGain}フォロワー</span>}
                      {w.impressions != null && <span>👁 {w.impressions.toLocaleString()}</span>}
                      {w.saveRate != null && <span>🔖 {(w.saveRate * 100).toFixed(2)}%</span>}
                      {w.followRate != null && <span>👤 {(w.followRate * 100).toFixed(3)}%</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="flex-shrink-0" onClick={() => { setSelectedPost(w); setVariants([]) }}>
                    <Zap className="h-3.5 w-3.5 mr-1 text-amber-500" />
                    派生生成
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 派生生成モーダル */}
      {selectedPost && !scheduleTarget && (
        <Dialog open onOpenChange={closeModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>派生投稿を生成</DialogTitle>
            </DialogHeader>

            <div className="rounded-md bg-amber-50 border border-amber-100 p-3 text-xs text-[var(--foreground)] leading-relaxed line-clamp-3">
              {selectedPost.post.content}
            </div>

            {/* バリアントタイプ選択 */}
            {variants.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--foreground)]">生成タイプを選択</p>
                <div className="grid grid-cols-1 gap-2">
                  {VARIANT_TYPES.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => setSelectedVariant(v.key)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md border text-left transition-colors ${
                        selectedVariant === v.key
                          ? "border-[var(--primary)] bg-[var(--primary-light)]"
                          : "border-[var(--border)] hover:border-indigo-200 bg-white"
                      }`}
                    >
                      <span className="text-lg">{v.emoji}</span>
                      <div>
                        <p className="text-xs font-medium text-[var(--foreground)]">{v.label}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">{v.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <Button
                  className="w-full mt-2"
                  disabled={!selectedVariant || generating}
                  onClick={handleGenerate}
                >
                  {generating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />生成中...</> : "生成する"}
                </Button>
              </div>
            )}

            {/* 生成結果 */}
            {variants.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[var(--foreground)]">{variants.length}件生成しました</p>
                  <Button variant="outline" size="sm" onClick={() => setVariants([])}>別タイプで再生成</Button>
                </div>
                {variants.map((v, i) => (
                  <div key={i} className="border border-[var(--border)] rounded-md p-3 space-y-2">
                    <p className="text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">{v.content}</p>
                    {v.memo && <p className="text-[10px] text-[var(--muted-foreground)] bg-gray-50 rounded px-2 py-1">📝 {v.memo}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" disabled={saving === i} onClick={() => handleSaveToIdeas(v, i)}>
                        {saving === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookOpen className="h-3 w-3 mr-1" />}
                        ネタ保管庫へ
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => { setScheduleTarget(v); setScheduleForm({ date: "", timeSlot: "morning" }) }}>
                        <Calendar className="h-3 w-3 mr-1" />
                        投稿予定へ
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* スケジュール設定モーダル */}
      {scheduleTarget && (
        <Dialog open onOpenChange={() => setScheduleTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>投稿予定に追加</DialogTitle>
            </DialogHeader>
            <div className="rounded-md bg-gray-50 border border-[var(--border)] p-3 text-xs text-[var(--foreground)] line-clamp-3">
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
                <Button className="flex-1" disabled={!scheduleForm.date || saving === -1} onClick={handleSchedule}>
                  {saving === -1 ? <Loader2 className="h-4 w-4 animate-spin" /> : "追加する"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
