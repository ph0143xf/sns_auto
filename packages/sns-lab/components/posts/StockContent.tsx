"use client"

import { useEffect, useState } from "react"
import { format, startOfDay, addDays } from "date-fns"
import { ja } from "date-fns/locale"
import { AlertTriangle, Package } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TIME_SLOTS, STOCK_WARNING_DAYS } from "@/lib/constants"
import Link from "next/link"

interface StockDay {
  date: string
  slots: { timeSlot: string; hasPost: boolean; isPosted: boolean }[]
  total: number
  posted: number
}

export function StockContent() {
  const [days, setDays] = useState<StockDay[]>([])
  const [remainingDays, setRemainingDays] = useState(0)
  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState<string | null>(null)

  const loadStock = async (accId: string) => {
    const today = startOfDay(new Date())
    const to = addDays(today, 60)
    const res = await fetch(`/api/posts?accountId=${accId}&dateFrom=${today.toISOString()}&dateTo=${to.toISOString()}`)
    const posts = await res.json()

    // 日別集計
    const map = new Map<string, { morning: boolean; noon: boolean; night1: boolean; night2: boolean; postedMap: Record<string, boolean> }>()

    for (const post of posts) {
      const key = format(new Date(post.postDate), "yyyy-MM-dd")
      if (!map.has(key)) map.set(key, { morning: false, noon: false, night1: false, night2: false, postedMap: {} })
      const d = map.get(key)!
      d[post.timeSlot as "morning" | "noon" | "night1" | "night2"] = true
      d.postedMap[post.timeSlot] = post.isPosted
    }

    const stockDays: StockDay[] = []
    let consecutiveDays = 0

    for (let i = 0; i < 60; i++) {
      const date = addDays(today, i)
      const key = format(date, "yyyy-MM-dd")
      const dayData = map.get(key)
      const slots = (["morning", "noon", "night1", "night2"] as const).map((slot) => ({
        timeSlot: slot,
        hasPost: dayData ? dayData[slot] : false,
        isPosted: dayData ? (dayData.postedMap[slot] ?? false) : false,
      }))
      const total = slots.filter((s) => s.hasPost).length
      const posted = slots.filter((s) => s.isPosted).length

      if (total >= 4) consecutiveDays++
      else if (i > 0) break

      stockDays.push({ date: key, slots, total, posted })
      if (stockDays.length >= 40) break
    }

    setDays(stockDays)
    setRemainingDays(consecutiveDays)
    setLoading(false)
  }

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((accounts) => {
      if (accounts?.length > 0) {
        setAccountId(accounts[0].id)
        loadStock(accounts[0].id)
      } else {
        setLoading(false)
      }
    })
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-[var(--muted-foreground)] text-sm">読み込み中...</div></div>
  }

  const isWarning = remainingDays <= STOCK_WARNING_DAYS

  return (
    <div className="p-6 space-y-5">
      {/* 在庫サマリー */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-400" />
              投稿在庫
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-bold ${isWarning ? "text-amber-600" : "text-[var(--foreground)]"}`}>
                {remainingDays}
              </span>
              <span className="text-[var(--muted-foreground)] text-sm mb-1">日分 (4投稿/日)</span>
            </div>
            {isWarning && (
              <div className="flex items-center gap-1.5 mt-2 text-amber-600 text-xs">
                <AlertTriangle className="h-3.5 w-3.5" />
                在庫が{STOCK_WARNING_DAYS}日以下です
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 space-y-2">
            <p className="text-xs text-[var(--muted-foreground)] mb-3">投稿を補充する</p>
            <div className="space-y-2">
              <Button size="sm" className="w-full" asChild>
                <Link href="/generate?days=7">+7日分生成（推奨）</Link>
              </Button>
              <Button size="sm" variant="outline" className="w-full" asChild>
                <Link href="/generate?days=14">+14日分生成</Link>
              </Button>
              <Button size="sm" variant="outline" className="w-full" asChild>
                <Link href="/generate?days=30">+30日分生成</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 在庫一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>在庫詳細（今後60日）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {days.slice(0, 30).map((day) => {
              const date = new Date(day.date)
              const isCurrentDay = format(new Date(), "yyyy-MM-dd") === day.date
              const isFull = day.total >= 4

              return (
                <div
                  key={day.date}
                  className={`flex items-center gap-3 py-1.5 px-2 rounded ${isCurrentDay ? "bg-[var(--primary-light)]" : ""}`}
                >
                  <span className={`text-xs w-20 ${isCurrentDay ? "text-[var(--primary)] font-medium" : "text-[var(--muted-foreground)]"}`}>
                    {format(date, "M/d（E）", { locale: ja })}
                  </span>

                  <div className="flex gap-1">
                    {(["morning", "noon", "night1", "night2"] as const).map((slot) => {
                      const s = day.slots.find((x) => x.timeSlot === slot)
                      const slotInfo = TIME_SLOTS[slot]
                      return (
                        <div
                          key={slot}
                          className={`w-6 h-6 rounded text-[10px] flex items-center justify-center ${
                            s?.isPosted
                              ? "bg-green-50 text-green-600"
                              : s?.hasPost
                              ? "bg-indigo-50 text-indigo-600"
                              : "bg-[var(--muted)] text-gray-300"
                          }`}
                          title={slotInfo.label}
                        >
                          {slotInfo.emoji}
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex-1" />
                  <span className={`text-[10px] ${isFull ? "text-green-600" : day.total > 0 ? "text-amber-600" : "text-[var(--muted-foreground)]"}`}>
                    {day.total}/4
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
