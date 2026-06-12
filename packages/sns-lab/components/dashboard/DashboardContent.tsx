"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Copy, Check, Eye, Heart, MessageCircle, UserPlus, Bookmark } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TIME_SLOTS } from "@/lib/constants"
import Link from "next/link"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

interface ChartPoint { label: string; impressions: number; followerGain: number }
interface DashboardData {
  todayPosts: {
    id: string; content: string; timeSlot: string
    isPosted: boolean; patternType: number | null
    insights: { impressions: number | null; isViral: boolean }[]
  }[]
  stock: { remainingDays: number; remainingPosts: number; isWarning: boolean }
  weeklyWinners: {
    id: string; isViral: boolean; followerGain: number | null; impressions: number | null
    post: { content: string; timeSlot: string; patternType: number | null }
  }[]
  weekPosted: number
  totals: { impressions: number | null; likes: number | null; saves: number | null; comments: number | null; followerGain: number | null }
  dailyChart: { date: string; impressions: number; likes: number; followerGain: number }[]
  weeklyChart: ChartPoint[]
  monthlyChart: ChartPoint[]
}

type ChartMode = "daily" | "weekly" | "monthly"

// ---- ミニバーチャート（CSS）----
function BarChart({ data, maxVal }: { data: { label: string; value: number }[]; maxVal: number }) {
  if (maxVal === 0) return <p className="text-xs text-[var(--muted-foreground)] text-center py-4">データなし</p>
  return (
    <div className="flex items-end gap-px sm:gap-1 h-16 sm:h-20">
      {data.map((d, i) => {
        const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            <div
              className="w-full rounded-sm bg-[var(--primary)] opacity-80 hover:opacity-100 transition-opacity"
              style={{ height: `${Math.max(pct, 2)}%` }}
            />
            <span className="text-[7px] sm:text-[8px] text-[var(--muted-foreground)] truncate w-full text-center">{d.label}</span>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
              {d.label}: {d.value.toLocaleString()}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---- コピーボタン（タッチ対応44px）----
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handle}
      className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0"
      title="コピー"
    >
      {copied
        ? <Check className="h-4 w-4 text-green-500" />
        : <Copy className="h-4 w-4 text-[var(--muted-foreground)]" />
      }
    </button>
  )
}

// ---- 投稿済みトグル（タッチ対応）----
function PostedToggle({ postId, isPosted, onToggle }: { postId: string; isPosted: boolean; onToggle: (newVal: boolean) => void }) {
  const [loading, setLoading] = useState(false)
  const handle = async () => {
    setLoading(true)
    const res = await fetch(`/api/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPosted: !isPosted }),
    })
    if (res.ok) onToggle(!isPosted)
    setLoading(false)
  }
  return (
    <button
      onClick={handle} disabled={loading}
      className={`flex items-center gap-1.5 text-xs px-3 py-2.5 min-h-[44px] rounded-lg border transition-colors ${
        isPosted
          ? "border-green-300 bg-green-50 text-green-700"
          : "border-[var(--border)] bg-white text-[var(--muted-foreground)] hover:border-green-300 active:bg-gray-50"
      }`}
    >
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isPosted ? "bg-green-500 border-green-500" : "border-gray-400"}`}>
        {isPosted && <Check className="h-2.5 w-2.5 text-white" />}
      </div>
      <span className="font-medium whitespace-nowrap">{isPosted ? "投稿済み" : "未投稿"}</span>
    </button>
  )
}

export function DashboardContent() {
  const [data, setData]       = useState<DashboardData | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [accountName, setAccountName] = useState("")
  const [loading, setLoading] = useState(true)
  const [chartMode, setChartMode] = useState<ChartMode>("daily")
  const [todayPosts, setTodayPosts] = useState<DashboardData["todayPosts"]>([])

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((accounts) => {
      if (!accounts?.length) { setLoading(false); return }
      const acc = accounts[0]; setAccountId(acc.id); setAccountName(acc.name)
      fetch(`/api/dashboard?accountId=${acc.id}`).then((r) => r.json()).then((d) => {
        setData(d); setTodayPosts(d.todayPosts ?? []); setLoading(false)
      })
    })
  }, [])

  const handleTogglePosted = (postId: string, newVal: boolean) => {
    setTodayPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isPosted: newVal } : p))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-[var(--muted-foreground)]">読み込み中...</p>
    </div>
  )
  if (!accountId) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-[var(--muted-foreground)]">アカウントが未設定です</p>
    </div>
  )

  const today = new Date()
  const postedCount = todayPosts.filter((p) => p.isPosted).length
  const totalToday  = todayPosts.length

  const chartData: { label: string; value: number }[] = (() => {
    if (!data) return []
    if (chartMode === "daily")   return (data.dailyChart ?? []).map((d) => ({ label: d.date.slice(5), value: d.impressions }))
    if (chartMode === "weekly")  return (data.weeklyChart ?? []).map((d) => ({ label: d.label, value: d.impressions }))
    if (chartMode === "monthly") return (data.monthlyChart ?? []).map((d) => ({ label: d.label, value: d.impressions }))
    return []
  })()
  const maxVal = Math.max(...chartData.map((d) => d.value), 1)

  const kpis = [
    { label: "インプレッション", icon: Eye,          value: (data?.totals?.impressions  ?? 0).toLocaleString(), color: "text-blue-600"   },
    { label: "いいね",           icon: Heart,         value: (data?.totals?.likes        ?? 0).toLocaleString(), color: "text-red-500"    },
    { label: "保存",             icon: Bookmark,      value: (data?.totals?.saves        ?? 0).toLocaleString(), color: "text-amber-500"  },
    { label: "コメント",         icon: MessageCircle, value: (data?.totals?.comments     ?? 0).toLocaleString(), color: "text-green-600"  },
    { label: "フォロワー増加",   icon: UserPlus,      value: `+${(data?.totals?.followerGain ?? 0).toLocaleString()}`, color: "text-indigo-600" },
  ]

  return (
    <div className="px-3 py-4 sm:p-6 space-y-4 max-w-4xl flex flex-col">

      {/* ① ヘッダー（日付・アカウント） */}
      <div className="flex items-center justify-between order-1">
        <div>
          <p className="text-base sm:text-sm font-bold text-[var(--foreground)]">
            {format(today, "M月d日（E）", { locale: ja })}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">{accountName}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`font-medium ${data?.stock.isWarning ? "text-amber-600" : "text-[var(--muted-foreground)]"}`}>
            在庫 {data?.stock.remainingDays ?? 0}日分
          </span>
          <Link href="/import" className="text-[var(--primary)] hover:underline hidden sm:inline">CSVインポート</Link>
        </div>
      </div>

      {/* ② 今日の投稿（モバイル最優先・一番上） */}
      <Card className="order-2 sm:order-4">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-sm">本日の投稿</CardTitle>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              postedCount === totalToday && totalToday > 0
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-[var(--muted-foreground)]"
            }`}>
              {postedCount} / {totalToday} 完了
            </span>
          </div>
          {/* 進捗バー */}
          <div className="flex gap-2 mt-2">
            {(["morning", "noon", "night1", "night2"] as const).map((slot) => {
              const post = todayPosts.find((p) => p.timeSlot === slot)
              return (
                <div key={slot} className="flex-1 space-y-1">
                  <div className={`h-2 rounded-full ${post?.isPosted ? "bg-green-500" : post ? "bg-indigo-300" : "bg-gray-100"}`} />
                  <p className="text-[10px] text-center text-[var(--muted-foreground)]">{TIME_SLOTS[slot].time}</p>
                </div>
              )
            })}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 px-3 sm:px-6 pb-3 sm:pb-6">
          {totalToday === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--muted-foreground)] mb-4">本日の予定投稿がありません</p>
              <Button asChild variant="outline" className="min-h-[44px]">
                <Link href="/import">CSVインポート</Link>
              </Button>
            </div>
          ) : (
            (["morning", "noon", "night1", "night2"] as const).map((slot) => {
              const post = todayPosts.find((p) => p.timeSlot === slot)
              const slotInfo = TIME_SLOTS[slot]
              return (
                <div
                  key={slot}
                  className={`rounded-xl border ${
                    post?.isPosted
                      ? "border-green-200 bg-green-50"
                      : post
                      ? "border-[var(--border)] bg-white"
                      : "border-dashed border-gray-200 bg-gray-50 opacity-50"
                  }`}
                >
                  {/* スロットヘッダー */}
                  <div className="flex items-center justify-between px-3 pt-3 pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{slotInfo.emoji}</span>
                      <span className="text-sm font-semibold text-[var(--foreground)]">{slotInfo.time}</span>
                      {post?.isPosted && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">投稿済</span>
                      )}
                    </div>
                    {post && (
                      <div className="flex items-center gap-1">
                        <CopyButton text={post.content} />
                      </div>
                    )}
                  </div>
                  {/* 本文 */}
                  <div className="px-3 pb-1">
                    {post ? (
                      <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    ) : (
                      <p className="text-xs text-[var(--muted-foreground)] py-2">投稿なし</p>
                    )}
                  </div>
                  {/* 投稿済みボタン */}
                  {post && (
                    <div className="px-3 pb-3">
                      <PostedToggle
                        postId={post.id}
                        isPosted={post.isPosted}
                        onToggle={(v) => handleTogglePosted(post.id, v)}
                      />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* ③ 総計KPI（2列グリッド → デスクトップ5列） */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 order-3 sm:order-2">
        {kpis.map((k, i) => (
          <Card key={k.label} className={`text-center ${i === 4 ? "col-span-2 sm:col-span-1" : ""}`}>
            <CardContent className="pt-3 pb-3">
              <k.icon className={`h-4 w-4 mx-auto mb-1 ${k.color}`} />
              <p className={`text-base font-bold ${k.color}`}>{k.value}</p>
              <p className="text-[9px] text-[var(--muted-foreground)] mt-0.5 leading-tight">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ④ グラフ */}
      <Card className="order-4 sm:order-3">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">インプレッション推移</CardTitle>
            <div className="flex gap-1">
              {(["daily", "weekly", "monthly"] as ChartMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setChartMode(m)}
                  className={`text-[11px] px-2.5 py-1.5 rounded-md min-h-[36px] transition-colors ${
                    chartMode === m
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                  }`}
                >
                  {m === "daily" ? "日次" : m === "weekly" ? "週次" : "月次"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <BarChart data={chartData} maxVal={maxVal} />
        </CardContent>
      </Card>

      {/* ⑤ 今週の勝ち投稿 */}
      {(data?.weeklyWinners?.length ?? 0) > 0 && (
        <Card className="order-5">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-500" />
              今週の勝ち投稿
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 sm:px-6">
            {data!.weeklyWinners.map((w) => (
              <div key={w.id} className="flex items-start gap-3 p-3 rounded-xl bg-green-50 border border-green-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-2 text-[var(--foreground)] leading-relaxed">{w.post.content}</p>
                  <div className="flex gap-3 mt-1.5 text-[11px] text-[var(--muted-foreground)]">
                    {w.impressions != null && <span>👁 {w.impressions.toLocaleString()}</span>}
                    {(w.followerGain ?? 0) > 0 && <span className="text-green-600 font-medium">+{w.followerGain} フォロワー</span>}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
