"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { Loader2, RefreshCw, TrendingUp, AlertTriangle, Clock, Zap, Target, Users, BookOpen, ThumbsDown, CalendarCheck, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Analysis {
  id: string
  weekStart: string
  weekEnd: string
  winningThemesJson: string | null
  losingThemesJson: string | null
  winningHooksJson: string | null
  losingHooksJson: string | null
  winningStructuresJson: string | null
  bestTimeSlotsJson: string | null
  winningCtasJson: string | null
  nextWeekThemesJson: string | null
  nextWeekAvoidJson: string | null
  improvementSuggestions: string | null
  createdAt: string
}

function Section({
  icon, title, items, color, bg,
}: {
  icon: React.ReactNode
  title: string
  items: string[]
  color: string
  bg?: string
}) {
  if (!items.length) return null
  return (
    <Card className={bg ? `border-0 ${bg}` : ""}>
      <CardHeader className="pb-2">
        <CardTitle className={`flex items-center gap-2 text-sm ${color}`}>
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="text-xs text-[var(--foreground)] flex items-start gap-2 leading-relaxed">
              <span className="flex-shrink-0 font-medium text-[var(--muted-foreground)] w-4">{i + 1}.</span>
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function AnalysisContent() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [competitorInsights, setCompetitorInsights] = useState<string[]>([])
  const [accountId, setAccountId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadLatest = async (accId: string) => {
    const res = await fetch(`/api/analysis?accountId=${accId}`)
    const data = await res.json()
    setAnalysis(data)
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

  const handleAnalyze = async () => {
    if (!accountId) return
    setAnalyzing(true)
    setError(null)
    const res = await fetch(`/api/analysis?accountId=${accountId}`, { method: "POST" })
    const data = await res.json()
    if (data.error) {
      setError(
        data.error.includes("ANTHROPIC_API_KEY")
          ? "ANTHROPIC_API_KEY が未設定です。.env に設定後サーバーを再起動してください。"
          : data.error
      )
    } else {
      setAnalysis(data.analysis)
      setCompetitorInsights(data.competitorInsights ?? [])
    }
    setAnalyzing(false)
  }

  const parse = (json: string | null): string[] => {
    if (!json) return []
    try { return JSON.parse(json) } catch { return [] }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-[var(--muted-foreground)] text-sm">読み込み中...</div></div>
  }

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        {analysis ? (
          <p className="text-xs text-[var(--muted-foreground)]">
            最終分析: {format(new Date(analysis.createdAt), "M月d日 HH:mm", { locale: ja })}
          </p>
        ) : (
          <p className="text-xs text-[var(--muted-foreground)]">分析データがありません</p>
        )}
        <Button size="sm" onClick={handleAnalyze} disabled={analyzing}>
          {analyzing
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />AI分析中...</>
            : <><RefreshCw className="h-4 w-4 mr-2" />AI分析を実行</>
          }
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {analyzing && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)] mx-auto" />
            <p className="text-sm text-[var(--muted-foreground)]">勝ち投稿・非バズ投稿・競合データを分析中...</p>
            <p className="text-xs text-[var(--muted-foreground)]">通常20〜40秒かかります</p>
          </div>
        </div>
      )}

      {!analyzing && analysis && (
        <div className="space-y-4">
          <p className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] rounded px-3 py-1.5">
            対象期間: {format(new Date(analysis.weekStart), "M/d", { locale: ja })} 〜 {format(new Date(analysis.weekEnd), "M/d", { locale: ja })}（直近30日）
          </p>

          {/* 来週推奨テーマ */}
          <Section
            icon={<CalendarCheck className="h-4 w-4" />}
            title="来週推奨テーマ（バズ可能性が高い）"
            items={parse(analysis.nextWeekThemesJson)}
            color="text-indigo-700"
            bg="bg-indigo-50 border border-indigo-100"
          />

          {/* 来週避けるべき */}
          <Section
            icon={<Ban className="h-4 w-4" />}
            title="来週避けるべきテーマ・フック"
            items={parse(analysis.nextWeekAvoidJson)}
            color="text-red-600"
            bg="bg-red-50 border border-red-100"
          />

          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-[10px] text-[var(--muted-foreground)] mb-3 font-medium uppercase tracking-wide">詳細分析</p>
            <div className="grid grid-cols-1 gap-4">

              {/* 勝ちテーマ */}
              <Section
                icon={<TrendingUp className="h-4 w-4" />}
                title="勝ちテーマ（バズったテーマ・感情・構造）"
                items={parse(analysis.winningThemesJson)}
                color="text-green-600"
              />

              {/* 勝ちフック */}
              <Section
                icon={<Zap className="h-4 w-4" />}
                title="勝ちフック（効果的だった書き出しパターン）"
                items={parse(analysis.winningHooksJson)}
                color="text-amber-600"
              />

              {/* 負けテーマ */}
              <Section
                icon={<ThumbsDown className="h-4 w-4" />}
                title="負けテーマ（避けるべきテーマ・構造）"
                items={parse(analysis.losingThemesJson)}
                color="text-red-500"
              />

              {/* 負けフック */}
              <Section
                icon={<AlertTriangle className="h-4 w-4" />}
                title="負けフック（効果がなかった書き出し）"
                items={parse(analysis.losingHooksJson)}
                color="text-orange-500"
              />

              {/* 効果的構造 */}
              <Section
                icon={<BookOpen className="h-4 w-4" />}
                title="効果的な投稿構造"
                items={parse(analysis.winningStructuresJson)}
                color="text-blue-600"
              />

              {/* 最適時間帯 */}
              <Section
                icon={<Clock className="h-4 w-4" />}
                title="最適な投稿時間帯"
                items={parse(analysis.bestTimeSlotsJson)}
                color="text-indigo-600"
              />

              {/* 効果的CTA */}
              <Section
                icon={<Target className="h-4 w-4" />}
                title="効果的なCTA"
                items={parse(analysis.winningCtasJson)}
                color="text-purple-600"
              />

              {/* 競合インサイト */}
              {competitorInsights.length > 0 && (
                <Section
                  icon={<Users className="h-4 w-4" />}
                  title="競合データからの洞察"
                  items={competitorInsights}
                  color="text-blue-600"
                />
              )}
            </div>
          </div>

          {/* 改善提案 */}
          {analysis.improvementSuggestions && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-[var(--primary)] flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  改善提案
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                  {analysis.improvementSuggestions}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!analyzing && !analysis && !error && (
        <div className="text-center py-20">
          <p className="text-[var(--muted-foreground)] text-sm mb-4">
            「AI分析を実行」ボタンで週次分析を開始してください。
          </p>
          <ul className="text-xs text-[var(--muted-foreground)] space-y-1">
            <li>✦ 勝ちテーマ / 負けテーマ</li>
            <li>✦ 勝ちフック / 負けフック</li>
            <li>✦ 来週推奨テーマ / 来週避けるべきテーマ</li>
            <li>✦ 最適時間帯 / 効果的CTA / 競合インサイト</li>
          </ul>
        </div>
      )}
    </div>
  )
}
