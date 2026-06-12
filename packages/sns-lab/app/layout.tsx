import type { Metadata, Viewport } from "next"
import "./globals.css"
import { ClientShell } from "@/components/layout/ClientShell"

export const metadata: Metadata = {
  title: "SNSコンテンツ研究所",
  description: "SNS運用のための分析・投稿管理ツール",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  )
}
