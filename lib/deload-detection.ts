/**
 * Deload detection: suggest a lighter week when training load and
 * declining performance indicate accumulated fatigue.
 * Handles deload week state: set, check, and clear.
 */

import { getCurrentUser } from './auth-simple'
import { getDefaultPlanSettings } from './progressive-overload'
import { getWeeklyHitRates } from './performance-analytics'
import type { PlanType } from '@/types/workout'

const DELOAD_STORAGE_KEY = 'deload_week'

export interface DeloadSuggestion {
  shouldDeload: boolean
  reason: string
}

/** Get deload multiplier (e.g. 0.65 = 65% of targets). */
export function getDeloadMultiplier(): number {
  return 0.65
}

/** Get end date of current deload (YYYY-MM-DD) or null. */
export function getDeloadUntil(userId: string): string | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(`${DELOAD_STORAGE_KEY}_${userId}`)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { activeUntil?: string }
    return parsed.activeUntil ?? null
  } catch {
    return null
  }
}

/** Set deload week: active until the given date (end of week). */
export function setDeloadWeek(userId: string, untilDate: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${DELOAD_STORAGE_KEY}_${userId}`, JSON.stringify({ activeUntil: untilDate }))
}

/**
 * Check if a date falls within an active deload period.
 * Deload window: 7 days ending on activeUntil (inclusive).
 */
export function isInDeloadPeriod(userId: string, date: string): boolean {
  const until = getDeloadUntil(userId)
  if (!until) return false
  const untilDate = new Date(until)
  const checkDate = new Date(date)
  if (checkDate > untilDate) return false
  const startDate = new Date(untilDate)
  startDate.setDate(startDate.getDate() - 6)
  return checkDate >= startDate
}

const DISMISS_KEY = 'deload_banner_dismissed'

/** Check if user dismissed the deload banner today (re-show after 7 days). */
export function isDeloadBannerDismissed(): boolean {
  if (typeof window === 'undefined') return false
  const raw = localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as { date: string }
    const dismissed = new Date(parsed.date)
    const now = new Date()
    const daysSince = (now.getTime() - dismissed.getTime()) / (1000 * 60 * 60 * 24)
    return daysSince < 7
  } catch {
    return false
  }
}

export function dismissDeloadBanner(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DISMISS_KEY, JSON.stringify({ date: new Date().toISOString().split('T')[0] }))
}

/**
 * Get deload suggestion based on recent performance and training duration.
 * Returns null if no suggestion (not enough data or no need).
 */
export async function getDeloadSuggestion(planType: PlanType): Promise<DeloadSuggestion | null> {
  const user = getCurrentUser()
  if (!user) return null

  const planSettings = getDefaultPlanSettings(planType)
  const deloadWeeks = planSettings.deload_frequency_weeks ?? (planType === 'hypertrophy' ? 5 : 7)

  const weeklyData = await getWeeklyHitRates(12)
  const validWeeks = weeklyData.filter((d) => d.hitRate !== null && d.hitRate > 0)
  if (validWeeks.length < deloadWeeks) return null

  const hitRates = validWeeks.map((d) => d.hitRate as number)
  const recentCount = Math.min(4, hitRates.length)
  const recentRates = hitRates.slice(-recentCount)

  // Consecutive low hit rate (2+ weeks below 50%)
  let lowHitStreak = 0
  for (let i = hitRates.length - 1; i >= 0; i--) {
    if (hitRates[i] < 50) lowHitStreak++
    else break
  }
  if (lowHitStreak >= 2) {
    return {
      shouldDeload: true,
      reason: "You've had a few tough weeks. Consider a lighter week to recover.",
    }
  }

  // Declining performance: recent avg significantly lower than earlier
  if (hitRates.length >= 6) {
    const recent = hitRates.slice(-2)
    const earlier = hitRates.slice(-6, -2)
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length
    if (recentAvg < earlierAvg - 15 && recentAvg < 60) {
      return {
        shouldDeload: true,
        reason: "Performance has dipped recently. A deload week may help you bounce back.",
      }
    }
  }

  // Time-based: trained hard for N+ weeks without a break
  if (validWeeks.length >= deloadWeeks) {
    const lastFewAvg = recentRates.reduce((a, b) => a + b, 0) / recentRates.length
    if (lastFewAvg < 65) {
      return {
        shouldDeload: true,
        reason: `You've trained for ${validWeeks.length}+ weeks. Consider a lighter week to support recovery.`,
      }
    }
  }

  return null
}
