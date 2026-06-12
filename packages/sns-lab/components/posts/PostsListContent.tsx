"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { format, addDays, startOfDay } from "date-fns"
import { ja } from "date-fns/locale"
import { Plus, CheckCircle2, Circle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TIME_SLOTS, PATTERN_TYPES } from "@/lib/constants"
import { InsightModal } from "@/components/posts/InsightModal"

interface Post {
  id: string
  content: string
  postDate: string
  timeSlot: string
  isPosted: boolean
  patternType: number | null
  status: string
  externalUrl: string | null
  series: { name: string } | null
  insights: { impressions: number | null; isViral: boolean; followerGain: number | null }[]
  postTags: { tag: { name: string; color: string } }[]
}

function groupByDate(posts: Post[]): Map<string, Post[]> {
  const map = new Map<string, Post[]>()
  for (const post of posts) {
    const key = format(new Date(post.postDate), "yyyy-MM-dd")
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(post)
  }
  return map
}

export function PostsListContent() {
  const [posts, setPosts] = useState<Post[]>([])
  const [accountId, setAccountId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [insightTarget, setInsightTarget] = useState<{ id: string; content: string } | null>(null)

  const loadPosts = useCallback(async (accId: string) => {
    const today = startOfDay(new Date())
    const from = addDays(today, -14)
    const to = addDays(today, 60)
    const res = await fetch(
      `/api/posts?accountId=${accId}&dateFrom=${from.toISOString()}&dateTo=${to.toISOString()}`
    )
    const data = await res.json()
    setPosts(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((accounts) => {
        if (accounts?.length > 0) {
          setAccountId(accounts[0].id)
          loadPosts(accounts[0].id)
        } else {
          setLoading(false)
        }
      })
  }, [loadPosts])

  const handleInsightSaved = () => {
    setInsightTarget(null)
    if (accountId) loadPosts(accountId)
  }

  const grouped = groupByDate(posts)
  const sortedDates = Array.from(grouped.keys()).sort()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--muted-foreground)] text-sm">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/posts/new"><Plus className="h-4 w-4" />新規投稿</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/posts/calendar">カレンダー表示</Link>
          </Button>
        </div>
      </div>

      {sortedDates.length === 0 ? (
        <div className="text-center py-20 text-[var(--muted-foreground)] text-sm">投稿がありません</div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => {
            const datePosts = grouped.get(dateKey)!
            const date = new Date(dateKey)
            const isToday = format(new Date(), "yyyy-MM-dd") === dateKey
            const isFuture = date > startOfDay(new Date())

            return (
              <div key={dateKey}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-xs font-semibold ${isToday ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}>
                    {format(date, "M/d（E）", { locale: ja })}
                    {isToday && " — 今日"}
                  </span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    {datePosts.filter((p) => p.isPosted).length}/{datePosts.length}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {(["morning", "noon", "night1", "night2"] as const).map((slot) => {
                    const post = datePosts.find((p) => p.timeSlot === slot)
                    const slotInfo = TIME_SLOTS[slot]

                    if (!post) {
                      return (
                        <div key={slot} className="flex items-center gap-3 px-3 py-2 rounded-md border border-dashed border-gray-200 opacity-40">
                          <span className="text-sm">{slotInfo.emoji}</span>
                          <span className="text-xs text-[var(--muted-foreground)]">{slotInfo.label}</span>
                          <span className="text-xs text-[var(--muted-foreground)]">—</span>
                        </div>
                      )
                    }

                    const insight = post.insights[0]
                    return (
                      <div
                        key={slot}
                        className={`flex items-start gap-3 px-3 py-2.5 rounded-md border transition-colors ${
                          post.isPosted
                            ? "border-green-200 bg-green-50"
                            : isFuture
                            ? "border-[var(--border)] bg-white hover:border-indigo-200"
                            : "border-[var(--border)] bg-[var(--muted)]"
                        }`}
                      >
                        {/* チェックボタン */}
                        <button
                          onClick={() => !post.isPosted && setInsightTarget({ id: post.id, content: post.content })}
                          className={`mt-0.5 flex-shrink-0 ${post.isPosted ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"}`}
                        >
                          {post.isPosted
                            ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                            : <Circle className="h-4 w-4 text-gray-300 hover:text-[var(--primary)]" />
                          }
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-xs font-medium text-[var(--foreground)]">
                              {slotInfo.emoji} {slotInfo.label}
                            </span>
                            {post.patternType && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${PATTERN_TYPES[post.patternType as keyof typeof PATTERN_TYPES]?.color}`}>
                                P{post.patternType}
                              </span>
                            )}
                            {post.series && (
                              <span className="text-[10px] text-[var(--muted-foreground)] bg-gray-100 px-1.5 rounded">
                                {post.series.name}
                              </span>
                            )}
                            {insight?.isViral && (
                              <span className="text-[10px] text-amber-600 font-medium ml-auto">🔥 バズ</span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--foreground)] line-clamp-2 leading-relaxed">{post.content}</p>
                          {insight?.impressions && (
                            <div className="flex gap-3 mt-1 text-[10px] text-[var(--muted-foreground)]">
                              <span>👁 {insight.impressions.toLocaleString()}</span>
                              {insight.followerGain !== null && insight.followerGain > 0 && (
                                <span className="text-green-600 font-medium">+{insight.followerGain}フォロワー</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {post.externalUrl && (
                            <a href={post.externalUrl} target="_blank" rel="noopener noreferrer"
                              className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          <Link href={`/posts/${post.id}`}
                            className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--primary)] px-1">
                            編集
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {insightTarget && (
        <InsightModal
          postId={insightTarget.id}
          postContent={insightTarget.content}
          onClose={() => setInsightTarget(null)}
          onSaved={handleInsightSaved}
        />
      )}
    </div>
  )
}
