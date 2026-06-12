import { POSTS_PER_DAY, STOCK_WARNING_DAYS } from "./constants"

export function calculateStock(
  posts: { postDate: Date; isPosted: boolean; status: string }[],
  today: Date
): { remainingDays: number; remainingPosts: number; isWarning: boolean } {
  const todayStart = new Date(today)
  todayStart.setHours(0, 0, 0, 0)

  const scheduledPosts = posts.filter((p) => {
    const d = new Date(p.postDate)
    d.setHours(0, 0, 0, 0)
    return d >= todayStart && !p.isPosted
  })

  const remainingPosts = scheduledPosts.length
  const remainingDays = Math.floor(remainingPosts / POSTS_PER_DAY)
  const isWarning = remainingDays <= STOCK_WARNING_DAYS

  return { remainingDays, remainingPosts, isWarning }
}

export function calculateKpiRates(insight: {
  impressions: number | null
  likes: number | null
  saves: number | null
  comments: number | null
  followerGain: number | null
}) {
  const imp = insight.impressions || 0
  if (imp === 0) return { followRate: 0, saveRate: 0, commentRate: 0, likeRate: 0 }

  return {
    followRate: ((insight.followerGain || 0) / imp) * 100,
    saveRate: ((insight.saves || 0) / imp) * 100,
    commentRate: ((insight.comments || 0) / imp) * 100,
    likeRate: ((insight.likes || 0) / imp) * 100,
  }
}
