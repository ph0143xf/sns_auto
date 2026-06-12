"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Calendar,
  TrendingUp,
  Lightbulb,
  BarChart2,
  Zap,
  Settings,
  Package,
  Users,
  Sparkles,
  Upload,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/",               icon: LayoutDashboard, label: "ダッシュボード" },
  { href: "/posts",          icon: FileText,         label: "投稿管理" },
  { href: "/posts/calendar", icon: Calendar,         label: "カレンダー" },
  { href: "/import",         icon: Upload,           label: "CSVインポート" },
  { href: "/stock",          icon: Package,          label: "在庫管理" },
  { href: "/winning",        icon: TrendingUp,       label: "勝ち投稿DB" },
  { href: "/ideas",          icon: Lightbulb,        label: "ネタ保管庫" },
  { href: "/competitor",     icon: Users,            label: "競合分析" },
  { href: "/analysis",       icon: BarChart2,        label: "AI分析" },
  { href: "/improvement",    icon: Sparkles,         label: "改善提案AI" },
  { href: "/generate",       icon: Zap,              label: "投稿生成" },
  { href: "/accounts",       icon: Settings,         label: "アカウント設定" },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen flex flex-col z-40 border-r",
        "transition-transform duration-300 ease-in-out",
        // モバイル: デフォルト非表示、開いたらスライドイン
        isOpen ? "translate-x-0" : "-translate-x-full",
        // デスクトップ: 常に表示
        "md:translate-x-0",
      )}
      style={{
        width: "var(--sidebar-width)",
        background: "var(--sidebar-bg)",
        borderColor: "var(--sidebar-border)",
      }}
    >
      {/* ロゴ + モバイル閉じるボタン */}
      <div className="px-4 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[10px] font-bold">S</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--foreground)] leading-none">SNSコンテンツ</p>
            <p className="text-[10px] text-[var(--muted-foreground)] leading-none mt-0.5">研究所</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded hover:bg-[var(--accent)] transition-colors md:hidden"
          aria-label="閉じる"
        >
          <X className="h-4 w-4 text-[var(--muted-foreground)]" />
        </button>
      </div>

      {/* ナビ */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-md text-xs font-medium transition-colors",
                isActive
                  ? "bg-[var(--primary-light)] text-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* フッター */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        <p className="text-[10px] text-[var(--muted-foreground)]">@uwaki_happy</p>
      </div>
    </aside>
  )
}
