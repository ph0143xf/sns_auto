"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { Loader2, Sparkles, CheckCircle2, XCircle, Users, Bookmark, FlaskConical, AlertTriangle, BookOpen, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ---- 型定義 ----
interface DoTheme    { theme: string; reason: string; kpi: string }
interface AvoidTheme { theme: string; reason: string }
interface FollowPost { content: string; hook: string; patternType: number; reason: string; ctaHint: string }
interface SavePost   { content: string; hook: string; patternType: number; reason: string; format: string }
interface ExperimentPost { content: string; hook: string; angle: string; hypothesis: string; successMetric: string }

interface Suggestion {
  id: string
  createdAt: string
  doThemesJson: string | null
  avoidThemesJson: string | null
  followPostsJson: string | null
  savePostsJson: string | null
  experimentPostsJson: string | null
}

interface ScheduleTarget { content: string; label: string }

const TIME_SLOTS_LIST = [
  { value: "morning", label: "🌅 朝" },
  { value: "noon",    label: "☀️ 昼" },
  { value: "night1",  label: "🌙 夜①" },
  { value: "night2",  label: "🌃 夜②" },
]

// ---- 投稿カード ----
function PostCard({
  content, hook, badge, reason, extra, accountId, onSaved,
}: {
  content: string
  hook: string
  badge: string
  reason: string
  extra?: string
  accountId: string
  onSaved: (content: string, label: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSaveToIdeas = async () => {
    setSaving(true)
    await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, content, memo: reason, sourceType: "generated", status: "unused" }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="border border-[var(--border)] rounded-lg p-4 space-y-2.5 bg-white">
      <div className="flex items-start gap-2">
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 flex-shrink-0 mt-0.5">{badge}</span>
        <p className="text-[11px] font-medium text-[var(--muted-foreground)] leading-relaxed">{hook}</p>
      </div>
      <p className="text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">{content}</p>
      {reason && (
        <p className="text-[10px] text-[var(--muted-foreground)] bg-gray-50 rounded px-2 py-1.5">
          💡 {reason}
        </p>
      )}
      {extra && (
        <p className="text-[10px] text-blue-600 bg-blue-50 rounded px-2 py-1.5">
          📌 {extra}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm" variant="outline" className="flex-1 text-xs"
          disabled={saving || saved}
          onClick={handleSaveToIdeas}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <BookOpen className="h-3 w-3 mr-1" />}
          {saved ? "保存済み" : "ネタ保管庫へ"}
        </Button>
        <Button
          size="sm" className="flex-1 text-xs"
          onClick={() => onSaved(content, hook.slice(0, 20))}
        >
          <Calendar className="h-3 w-3 mr-1" />
          投稿予定へ
        </Button>
      </div>
    </div>
  )
}

// ---- メインコンポーネント ----
export function ImprovementContent() {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scheduleTarget, setScheduleTarget] = useState<ScheduleTarget | null>(null)
  const [scheduleForm, setScheduleForm] = useState({ date: "", timeSlot: "morning" })
  const [scheduling, setScheduling] = useState(false)

  const parse = <T,>(json: string | null): T[] => {
    if (!json) return []
    try { return JSON.parse(json) } catch { return [] }
  }

  const loadLatest = async (accId: string) => {
    const res = await fetch(`/api/improvement?accountId=${accId}`)
    const data = await res.json()
    setSuggestion(data?.id ? data : null)
    setLoading(false)
  }

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((accounts) => {
      if (accounts?.length > 0) {
        setAccountId(accounts[0].id)
        loadLatest(accounts[0].id)
      } else {
        setLoading(false)
      }
    })
  }, [])

  const handleGenerate = async () => {
    if (!accountId) return
    setGenerating(true)
    setError(null)
    const res = await fetch(`/api/improvement?accountId=${accountId}`, { method: "POST" })
    const data = await res.json()
    if (data.error) {
      setError(
        data.error.includes("ANTHROPIC_API_KEY")
          ? "ANTHROPIC_API_KEY が未設定です。.env に設定後サーバーを再起動してください。"
          : data.error
      )
    } else {
      setSuggestion(data.suggestion)
    }
    setGenerating(false)
  }

  const handleSchedule = async () => {
    if (!scheduleTarget || !accountId || !scheduleForm.date) return
    setScheduling(true)
    const ideaRes = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, content: scheduleTarget.content, sourceType: "generated", status: "unused" }),
    })
    const idea = await ideaRes.json()
    await fetch(`/api/ideas/${idea.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, date: scheduleForm.date, timeSlot: scheduleForm.timeSlot }),
    })
    setScheduling(false)
    setScheduleTarget(null)
    alert("投稿予定に追加しました")
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><p className="text-sm text-[var(--muted-foreground)]">読み込み中...</p></div>
  }

  const doThemes    = parse<DoTheme>(suggestion?.doThemesJson ?? null)
  const avoidThemes = parse<AvoidTheme>(suggestion?.avoidThemesJson ?? null)
  const followPosts = parse<FollowPost>(suggestion?.followPostsJson ?? null)
  const savePosts   = parse<SavePost>(suggestion?.savePostsJson ?? null)
  const expPosts    = parse<ExperimentPost>(suggestion?.experimentPostsJson ?? null)

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          {suggestion ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              最終生成: {format(new Date(suggestion.createdAt), "M月d日 HH:mm", { locale: ja })}
            </p>
          ) : (
            <p className="text-xs text-[var(--muted-foreground)]">改善提案はまだ生成されていません</p>
          )}
          <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
            週次分析結果・勝ち投稿・競合データをもとにAIが来週の運用戦略を提案します
          </p>
        </div>
        <Button size="sm" onClick={handleGenerate} disabled={generating}>
          {generating
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />生成中...</>
            : <><Sparkles className="h-4 w-4 mr-2" />改善提案を生成</>
          }
        </Button>
      </div>

      {/* 運用改善ループの案内 */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
        <p className="text-xs font-medium text-indigo-700 mb-1.5">運用改善ループ</p>
        <div className="flex items-center gap-2 text-[10px] text-indigo-600 flex-wrap">
          <span className="bg-white border border-indigo-200 rounded px-2 py-0.5">① 投稿</span>
          <span>→</span>
          <span className="bg-white border border-indigo-200 rounded px-2 py-0.5">② インサイト入力</span>
          <span>→</span>
          <span className="bg-white border border-indigo-200 rounded px-2 py-0.5">③ AI週次分析</span>
          <span>→</span>
          <span className="bg-indigo-600 text-white rounded px-2 py-0.5 font-medium">④ 改善提案AI ← 今ここ</span>
          <span>→</span>
          <span className="bg-white border border-indigo-200 rounded px-2 py-0.5">⑤ 投稿生成（提案反映）</span>
          <span>→</span>
          <span className="text-indigo-500">① に戻る</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {generating && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)] mx-auto" />
            <p className="text-sm text-[var(--muted-foreground)]">週次分析・勝ち投稿・競合データを統合して提案を生成中...</p>
            <p className="text-xs text-[var(--muted-foreground)]">通常30〜60秒かかります</p>
          </div>
        </div>
      )}

      {!generating && !suggestion && !error && (
        <div className="text-center py-20">
          <Sparkles className="h-10 w-10 text-[var(--muted-foreground)] mx-auto mb-4 opacity-40" />
          <p className="text-sm text-[var(--muted-foreground)] mb-2">「改善提案を生成」ボタンを押してください</p>
          <ul className="text-xs text-[var(--muted-foreground)] space-y-1 mt-4">
            <li>✦ 来週やるべきテーマ TOP10</li>
            <li>✦ 来週避けるべきテーマ TOP10</li>
            <li>✦ フォロー獲得狙い投稿 5件（本文完全生成）</li>
            <li>✦ 保存率狙い投稿 5件（本文完全生成）</li>
            <li>✦ 実験枠投稿 3件（新しい切り口の仮説）</li>
          </ul>
        </div>
      )}

      {!generating && suggestion && (
        <div className="space-y-6">

          {/* ① やるべきテーマ TOP10 */}
          {doThemes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  来週やるべき投稿テーマ TOP{doThemes.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {doThemes.map((t, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-[var(--border)] last:border-0">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--foreground)]">{t.theme}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{t.reason}</p>
                        {t.kpi && <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded">狙い: {t.kpi}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ② 避けるべきテーマ TOP10 */}
          {avoidThemes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-red-600">
                  <XCircle className="h-4 w-4" />
                  来週避けるべき投稿テーマ TOP{avoidThemes.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {avoidThemes.map((t, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-[var(--border)] last:border-0">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--foreground)]">{t.theme}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{t.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ③ フォロー獲得狙い投稿 */}
          {followPosts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-semibold text-[var(--foreground)]">フォロー獲得を狙う投稿 {followPosts.length}件</p>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">KPI: フォロー率最大化</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {followPosts.map((p, i) => (
                  <PostCard
                    key={i}
                    content={p.content}
                    hook={p.hook}
                    badge={`フォロー狙い #${i + 1}`}
                    reason={p.reason}
                    extra={p.ctaHint ? `CTA: ${p.ctaHint}` : undefined}
                    accountId={accountId!}
                    onSaved={(content, label) => {
                      setScheduleTarget({ content, label })
                      setScheduleForm({ date: "", timeSlot: "morning" })
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ④ 保存獲得狙い投稿 */}
          {savePosts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-semibold text-[var(--foreground)]">保存獲得を狙う投稿 {savePosts.length}件</p>
                <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">KPI: 保存率最大化</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {savePosts.map((p, i) => (
                  <PostCard
                    key={i}
                    content={p.content}
                    hook={p.hook}
                    badge={`保存狙い #${i + 1}`}
                    reason={p.reason}
                    extra={p.format ? `フォーマット: ${p.format}` : undefined}
                    accountId={accountId!}
                    onSaved={(content, label) => {
                      setScheduleTarget({ content, label })
                      setScheduleForm({ date: "", timeSlot: "morning" })
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ⑤ 実験枠 */}
          {expPosts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-purple-600" />
                <p className="text-sm font-semibold text-[var(--foreground)]">実験枠として試す投稿 {expPosts.length}件</p>
                <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">新しい切り口・仮説検証</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {expPosts.map((p, i) => (
                  <PostCard
                    key={i}
                    content={p.content}
                    hook={p.hook}
                    badge={`実験 #${i + 1}`}
                    reason={`角度: ${p.angle} / 仮説: ${p.hypothesis}`}
                    extra={p.successMetric ? `成功の定義: ${p.successMetric}` : undefined}
                    accountId={accountId!}
                    onSaved={(content, label) => {
                      setScheduleTarget({ content, label })
                      setScheduleForm({ date: "", timeSlot: "morning" })
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* スケジュールモーダル */}
      {scheduleTarget && (
        <Dialog open onOpenChange={() => setScheduleTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>投稿予定に追加</DialogTitle>
            </DialogHeader>
            <div className="rounded-md bg-gray-50 border border-[var(--border)] p-3 text-xs text-[var(--foreground)] line-clamp-4">
              {scheduleTarget.content}
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>投稿日</Label>
                <Input
                  type="date"
                  value={scheduleForm.date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, date: e.target.value }))}
                />
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
                <Button className="flex-1" disabled={!scheduleForm.date || scheduling} onClick={handleSchedule}>
                  {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : "追加する"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
