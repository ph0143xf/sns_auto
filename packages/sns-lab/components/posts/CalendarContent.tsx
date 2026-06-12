"use client"

import { useEffect, useState } from "react"
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, startOfWeek, endOfWeek, addMonths, subMonths, differenceInDays,
} from "date-fns"
import { ja } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Copy, Check, X, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TIME_SLOTS, BREAKUP_DATE } from "@/lib/constants"
import Link from "next/link"

interface Post {
  id: string; timeSlot: string; isPosted: boolean
  postDate: string; content: string; patternType: number | null
}

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
      className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
      title="コピー"
    >
      {copied
        ? <Check className="h-4 w-4 text-green-500" />
        : <Copy className="h-4 w-4 text-[var(--muted-foreground)]" />
      }
    </button>
  )
}

function PostedToggle({ postId, isPosted, onToggle }: { postId: string; isPosted: boolean; onToggle: (v: boolean) => void }) {
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
      className={`flex items-center gap-1.5 text-xs px-3 min-h-[44px] rounded-lg border transition-colors ${
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

// 日付詳細パネルの中身（デスクトップサイドパネル + モバイルボトムシートで共有）
function DayDetailPanel({
  selectedDay,
  selectedDate,
  dayPosts,
  onClose,
  onToggle,
}: {
  selectedDay: string
  selectedDate: Date
  dayPosts: Post[]
  onClose: () => void
  onToggle: (postId: string, val: boolean) => void
}) {
  const postedInDay = dayPosts.filter((p) => p.isPosted).length
  const getDaysSinceBreakup = (dateStr: string) =>
    differenceInDays(new Date(dateStr), BREAKUP_DATE) + 1

  return (
    <>
      {/* パネルヘッダー */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div>
          <p className="text-base font-bold text-[var(--foreground)]">
            {format(selectedDate, "M月d日（E）", { locale: ja })}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            別れ{getDaysSinceBreakup(selectedDay)}日目 · {postedInDay}/{dayPosts.length} 完了
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100"
        >
          <X className="h-5 w-5 text-[var(--muted-foreground)]" />
        </button>
      </div>

      {/* 投稿カード */}
      <div className="px-4 pb-4 space-y-2 overflow-y-auto">
        {dayPosts.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] text-center py-8">投稿なし</p>
        ) : (
          (["morning", "noon", "night1", "night2"] as const).map((slot) => {
            const post = dayPosts.find((p) => p.timeSlot === slot)
            const slotInfo = TIME_SLOTS[slot]
            if (!post) return (
              <div key={slot} className="rounded-xl border border-dashed border-gray-200 p-3 opacity-50">
                <p className="text-xs text-[var(--muted-foreground)]">{slotInfo.emoji} {slotInfo.time} — なし</p>
              </div>
            )
            return (
              <div
                key={slot}
                className={`rounded-xl border ${post.isPosted ? "border-green-200 bg-green-50" : "border-[var(--border)] bg-white"}`}
              >
                <div className="flex items-center justify-between px-3 pt-3 pb-1">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {slotInfo.emoji} {slotInfo.time}
                  </span>
                  <div className="flex items-center gap-0">
                    <CopyButton text={post.content} />
                    <Link
                      href={`/posts/${post.id}`}
                      className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg hover:bg-gray-100"
                    >
                      <Pencil className="h-4 w-4 text-[var(--muted-foreground)]" />
                    </Link>
                  </div>
                </div>
                <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap px-3 pb-2">
                  {post.content}
                </p>
                <div className="px-3 pb-3">
                  <PostedToggle
                    postId={post.id}
                    isPosted={post.isPosted}
                    onToggle={(v) => onToggle(post.id, v)}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

export function CalendarContent() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [posts, setPosts]           = useState<Post[]>([])
  const [accountId, setAccountId]   = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [dayPosts, setDayPosts]     = useState<Post[]>([])

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((accounts) => {
      if (accounts?.length > 0) setAccountId(accounts[0].id)
    })
  }, [])

  useEffect(() => {
    if (!accountId) return
    const start = startOfMonth(currentMonth)
    const end   = endOfMonth(currentMonth)
    fetch(`/api/posts?accountId=${accountId}&dateFrom=${start.toISOString()}&dateTo=${end.toISOString()}`)
      .then((r) => r.json()).then((data) => {
        setPosts(Array.isArray(data) ? data : [])
        setSelectedDay(null)
      })
  }, [accountId, currentMonth])

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }),
    end:   endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 }),
  })

  const postsByDate = new Map<string, Post[]>()
  for (const post of posts) {
    const key = format(new Date(post.postDate), "yyyy-MM-dd")
    if (!postsByDate.has(key)) postsByDate.set(key, [])
    postsByDate.get(key)!.push(post)
  }

  const handleDayClick = (key: string, dayPostsArr: Post[]) => {
    setSelectedDay(key === selectedDay ? null : key)
    const sorted = [...dayPostsArr].sort((a, b) => {
      const order = { morning: 0, noon: 1, night1: 2, night2: 3 }
      return (order[a.timeSlot as keyof typeof order] ?? 9) - (order[b.timeSlot as keyof typeof order] ?? 9)
    })
    setDayPosts(sorted)
  }

  const handleToggle = (postId: string, newVal: boolean) => {
    setDayPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isPosted: newVal } : p))
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isPosted: newVal } : p))
  }

  const getDaysSinceBreakup = (dateStr: string): number =>
    differenceInDays(new Date(dateStr), BREAKUP_DATE) + 1

  const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"]
  const selectedDate = selectedDay ? new Date(selectedDay) : null

  return (
    <div className="relative">
      {/* モバイルボトムシート用backdrop */}
      {selectedDay && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSelectedDay(null)}
        />
      )}

      <div className="p-3 sm:p-6 flex gap-5">
        {/* カレンダー本体 */}
        <div className="flex-1 min-w-0">
          {/* ヘッダー */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="outline" size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="min-w-[44px] min-h-[44px]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-sm font-semibold text-[var(--foreground)] flex-1 text-center">
              {format(currentMonth, "yyyy年M月", { locale: ja })}
            </h2>
            <Button
              variant="outline" size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="min-w-[44px] min-h-[44px]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" asChild className="hidden sm:flex min-h-[44px]">
              <Link href="/posts">一覧</Link>
            </Button>
            <Button size="sm" asChild className="min-h-[44px]">
              <Link href="/import">インポート</Link>
            </Button>
          </div>

          {/* 曜日 */}
          <div className="grid grid-cols-7 gap-px mb-px bg-[var(--border)] rounded-t-lg overflow-hidden">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={`bg-[var(--muted)] text-center text-[10px] sm:text-[11px] font-medium py-1.5 ${
                  i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-[var(--muted-foreground)]"
                }`}
              >
                {w}
              </div>
            ))}
          </div>

          {/* グリッド */}
          <div className="grid grid-cols-7 gap-px bg-[var(--border)] rounded-b-lg overflow-hidden">
            {days.map((day) => {
              const key         = format(day, "yyyy-MM-dd")
              const dayPostsArr = postsByDate.get(key) || []
              const isCurrentM  = isSameMonth(day, currentMonth)
              const isCurrentD  = isToday(day)
              const isSelected  = selectedDay === key
              const postedCnt   = dayPostsArr.filter((p) => p.isPosted).length
              const totalCnt    = dayPostsArr.length
              const dayNum      = getDaysSinceBreakup(key)

              return (
                <div
                  key={key}
                  onClick={() => isCurrentM && totalCnt > 0 && handleDayClick(key, dayPostsArr)}
                  className={`min-h-[56px] sm:min-h-[75px] p-1 sm:p-1.5 transition-colors ${
                    isSelected ? "bg-indigo-50 ring-1 ring-inset ring-indigo-400" :
                    isCurrentD ? "bg-blue-50" :
                    isCurrentM ? "bg-white hover:bg-gray-50 active:bg-gray-100" : "bg-gray-50"
                  } ${isCurrentM && totalCnt > 0 ? "cursor-pointer" : ""}`}
                >
                  <div className="flex items-start justify-between mb-0.5">
                    <span className={`text-[11px] sm:text-xs font-medium leading-none ${
                      isCurrentD ? "text-[var(--primary)]" :
                      isCurrentM ? (day.getDay() === 0 ? "text-red-500" : day.getDay() === 6 ? "text-blue-500" : "text-[var(--foreground)]") :
                      "text-gray-300"
                    }`}>
                      {format(day, "d")}
                    </span>
                    {isCurrentM && totalCnt > 0 && (
                      <span className={`text-[8px] leading-none ${postedCnt === totalCnt ? "text-green-600 font-medium" : "text-[var(--muted-foreground)]"}`}>
                        {postedCnt}/{totalCnt}
                      </span>
                    )}
                  </div>

                  {/* 別れてからの日数（デスクトップのみ） */}
                  {isCurrentM && dayNum >= 1 && (
                    <p className="hidden sm:block text-[8px] text-[var(--muted-foreground)] mb-0.5">別れ{dayNum}日目</p>
                  )}

                  {/* 投稿バー */}
                  {isCurrentM && (
                    <div className="space-y-0.5 mt-1">
                      {(["morning", "noon", "night1", "night2"] as const).map((slot) => {
                        const post = dayPostsArr.find((p) => p.timeSlot === slot)
                        if (!post) return <div key={slot} className="h-0.5 sm:h-1 rounded-full bg-gray-100" />
                        return (
                          <div
                            key={slot}
                            className={`h-0.5 sm:h-1 rounded-full ${post.isPosted ? "bg-green-400" : "bg-indigo-400"}`}
                            title={`${TIME_SLOTS[slot].time}: ${post.content.slice(0, 30)}`}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 凡例 */}
          <div className="flex gap-3 sm:gap-4 mt-3 text-[10px] text-[var(--muted-foreground)] flex-wrap">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-1 rounded-full bg-green-400" />投稿済み</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-1 rounded-full bg-indigo-400" />予定</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-1 rounded-full bg-gray-200" />なし</span>
            <span className="hidden sm:block text-[var(--muted-foreground)] ml-auto">日付をクリックで投稿内容を表示</span>
          </div>
        </div>

        {/* デスクトップ: 右サイドパネル */}
        {selectedDay && selectedDate && (
          <div className="hidden md:block w-80 flex-shrink-0">
            <div className="sticky top-4">
              <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
                <DayDetailPanel
                  selectedDay={selectedDay}
                  selectedDate={selectedDate}
                  dayPosts={dayPosts}
                  onClose={() => setSelectedDay(null)}
                  onToggle={handleToggle}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* モバイル: ボトムシート */}
      {selectedDay && selectedDate && (
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto md:hidden border-t border-[var(--border)]">
          {/* ドラッグハンドル */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>
          <DayDetailPanel
            selectedDay={selectedDay}
            selectedDate={selectedDate}
            dayPosts={dayPosts}
            onClose={() => setSelectedDay(null)}
            onToggle={handleToggle}
          />
        </div>
      )}
    </div>
  )
}
