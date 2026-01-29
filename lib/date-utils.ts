/**
 * Local-date helpers for YYYY-MM-DD. Use these instead of toISOString().split('T')[0]
 * so "today" and date comparisons use the user's local timezone (e.g. Pacific).
 */

/**
 * Build YYYY-MM-DD from a Date using local year, month, day.
 */
export function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Today's date in local timezone as YYYY-MM-DD.
 */
export function getTodayLocalYYYYMMDD(): string {
  return toYYYYMMDD(new Date())
}

export type TimeIntervalKey = 'All' | '1M' | '3M' | '6M' | '1Y' | 'YTD'

/**
 * Start date (YYYY-MM-DD, inclusive) for a time-interval filter.
 * Uses local date. Pass today as YYYY-MM-DD or omit to use current local date.
 */
export function getStartDateForInterval(
  interval: TimeIntervalKey,
  today?: string
): string {
  const todayStr = today ?? getTodayLocalYYYYMMDD()
  const [y, m, d] = todayStr.split('-').map(Number)
  const now = new Date(y, m - 1, d)

  switch (interval) {
    case 'All':
      return '1970-01-01'
    case '1M': {
      const start = new Date(now)
      start.setDate(start.getDate() - 30)
      return toYYYYMMDD(start)
    }
    case '3M': {
      const start = new Date(now)
      start.setDate(start.getDate() - 90)
      return toYYYYMMDD(start)
    }
    case '6M': {
      const start = new Date(now)
      start.setDate(start.getDate() - 180)
      return toYYYYMMDD(start)
    }
    case '1Y': {
      const start = new Date(now)
      start.setDate(start.getDate() - 365)
      return toYYYYMMDD(start)
    }
    case 'YTD':
      return `${now.getFullYear()}-01-01`
    default:
      return todayStr
  }
}
