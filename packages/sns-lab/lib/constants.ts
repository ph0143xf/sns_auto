export const TIME_SLOTS = {
  morning: { label: "朝",  time: "8:00",  emoji: "🌅", color: "text-amber-500",  hour: 8,  minute: 0  },
  noon:    { label: "昼",  time: "12:30", emoji: "☀️", color: "text-yellow-500", hour: 12, minute: 30 },
  night1:  { label: "夜①", time: "18:20", emoji: "🌙", color: "text-indigo-500", hour: 18, minute: 20 },
  night2:  { label: "夜②", time: "20:30", emoji: "🌃", color: "text-purple-500", hour: 20, minute: 30 },
} as const

export const BREAKUP_DATE = new Date("2026-05-26T00:00:00+09:00") // 別れた日

export const PATTERN_TYPES = {
  1: { label: "リアルタイム体験告白型", color: "bg-red-100 text-red-700" },
  2: { label: "一言ぶっ刺し型", color: "bg-orange-100 text-orange-700" },
  3: { label: "共感あるある型", color: "bg-green-100 text-green-700" },
  4: { label: "質問・返信誘導型", color: "bg-blue-100 text-blue-700" },
  5: { label: "引用・言葉型", color: "bg-purple-100 text-purple-700" },
} as const

export const IDEA_CATEGORIES = {
  hook: { label: "フック", color: "bg-red-100 text-red-700" },
  sympathy: { label: "共感", color: "bg-green-100 text-green-700" },
  anger: { label: "怒り", color: "bg-orange-100 text-orange-700" },
  story: { label: "ストーリー", color: "bg-blue-100 text-blue-700" },
  psychology: { label: "恋愛心理", color: "bg-pink-100 text-pink-700" },
  affair: { label: "浮気", color: "bg-purple-100 text-purple-700" },
  reconciliation: { label: "復縁", color: "bg-teal-100 text-teal-700" },
} as const

export const STOCK_WARNING_DAYS = 7
export const POSTS_PER_DAY = 4
