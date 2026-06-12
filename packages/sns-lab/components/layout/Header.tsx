"use client"

import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"

const PAGE_TITLES: Record<string, string> = {
  "/":               "ダッシュボード",
  "/posts":          "投稿管理",
  "/import":         "CSVインポート",
  "/posts/calendar": "カレンダー",
  "/posts/new":      "新規投稿",
  "/stock":          "在庫管理",
  "/winning":        "勝ち投稿DB",
  "/ideas":          "ネタ保管庫",
  "/competitor":     "競合分析",
  "/analysis":       "AI分析",
  "/improvement":    "改善提案AI",
  "/generate":       "投稿生成",
  "/accounts":       "アカウント設定",
}

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith("/posts/")) return "投稿詳細"
  if (pathname.startsWith("/accounts/")) return "アカウント設定"
  return "SNSコンテンツ研究所"
}

interface HeaderProps {
  onMenuOpen?: () => void
}

export function Header({ onMenuOpen }: HeaderProps) {
  const pathname = usePathname()
  const title = getTitle(pathname)

  return (
    <header className="h-12 border-b border-[var(--border)] flex items-center px-4 bg-white sticky top-0 z-30">
      {/* ハンバーガーボタン（モバイルのみ） */}
      <button
        onClick={onMenuOpen}
        className="p-2 -ml-2 mr-2 rounded-md hover:bg-[var(--accent)] transition-colors md:hidden"
        aria-label="メニューを開く"
      >
        <Menu className="h-5 w-5 text-[var(--foreground)]" />
      </button>
      <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
    </header>
  )
}
