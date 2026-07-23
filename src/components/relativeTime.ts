const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Formats a past timestamp as a short relative label: "2 minutes ago", "Yesterday", "3 days ago". */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diff = now - timestamp
  if (diff < MINUTE) return 'just now'

  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE)
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  }

  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR)
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  }

  const days = Math.floor(diff / DAY)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`

  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
