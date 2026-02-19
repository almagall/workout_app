'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import { getWorkoutSessions, getExerciseLogs } from '@/lib/storage'
import { getRecentPRs } from '@/lib/pr-helper'

interface Metrics {
  streak: number
  workoutsThisMonth: number
  targetHitRate: number | null
  avgDurationMin: number | null
  prsThisMonth: number
}

function getWeekKey(yyyyMmDd: string): string {
  const d = new Date(yyyyMmDd + 'T12:00:00Z')
  const dayOfWeek = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayOfWeek)
  return d.toISOString().slice(0, 10)
}

function dateSub(yyyyMmDd: string, days: number): string {
  const d = new Date(yyyyMmDd + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function getConsecutiveWorkoutWeeks(dates: string[]): number {
  const completedWeeks = new Set([...new Set(dates)].map(getWeekKey))
  if (completedWeeks.size === 0) return 0
  const sortedWeeks = [...completedWeeks].sort((a, b) => b.localeCompare(a))
  const mostRecentWeek = sortedWeeks[0]
  const today = new Date().toISOString().slice(0, 10)
  if (mostRecentWeek > getWeekKey(today)) return 0
  let count = 1
  let current = dateSub(mostRecentWeek, 7)
  while (completedWeeks.has(current)) {
    count++
    current = dateSub(current, 7)
  }
  return count
}

const TILES: { key: keyof Metrics; label: string; icon: string; suffix?: string; format?: (v: number) => string }[] = [
  { key: 'streak', label: 'Week Streak', icon: '🔥' },
  { key: 'workoutsThisMonth', label: 'This Month', icon: '📅' },
  { key: 'targetHitRate', label: 'Hit Rate', icon: '🎯', suffix: '%' },
  { key: 'avgDurationMin', label: 'Avg Duration', icon: '⏱', suffix: ' min' },
  { key: 'prsThisMonth', label: 'PRs This Month', icon: '⭐' },
]

export default function PerformanceMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMetrics() {
      const user = getCurrentUser()
      if (!user) return

      const [sessions, logs, recentPRs] = await Promise.all([
        getWorkoutSessions(),
        getExerciseLogs(),
        getRecentPRs(100),
      ])

      const now = new Date()
      const thisMonth = now.getMonth()
      const thisYear = now.getFullYear()

      const completeSessions = sessions.filter(s => s.is_complete !== false)
      const workoutsThisMonth = completeSessions.filter(s => {
        const d = new Date(s.workout_date)
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear
      }).length

      const logsWithStatus = logs.filter(
        l => l.performance_status === 'met_target' || l.performance_status === 'overperformed' || l.performance_status === 'underperformed'
      )
      const hitCount = logs.filter(
        l => l.performance_status === 'met_target' || l.performance_status === 'overperformed'
      ).length
      const targetHitRate = logsWithStatus.length > 0 ? Math.round((hitCount / logsWithStatus.length) * 1000) / 10 : null

      const streak = getConsecutiveWorkoutWeeks(completeSessions.map(s => s.workout_date))

      const sessionsWithDuration = completeSessions.filter(s => s.duration_seconds && s.duration_seconds > 0)
      const avgDurationMin = sessionsWithDuration.length > 0
        ? Math.round(sessionsWithDuration.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) / sessionsWithDuration.length / 60)
        : null

      const prsThisMonth = recentPRs.filter(pr => {
        const d = new Date(pr.workoutDate)
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear
      }).length

      setMetrics({ streak, workoutsThisMonth, targetHitRate, avgDurationMin, prsThisMonth })
      setLoading(false)
    }

    loadMetrics()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-3 sm:p-4 animate-pulse">
            <div className="h-3 w-12 bg-elevated rounded mb-2" />
            <div className="h-6 w-10 bg-elevated rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (!metrics) return null

  return (
    <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
      {TILES.map(tile => {
        const raw = metrics[tile.key]
        const value = raw != null ? (tile.format ? tile.format(raw as number) : String(raw)) : '—'
        const suffix = raw != null ? (tile.suffix ?? '') : ''
        return (
          <div
            key={tile.key}
            className="flex-shrink-0 min-w-[6.5rem] sm:min-w-0 sm:flex-1 bg-card rounded-xl border border-border p-3 sm:p-4 shadow-card"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-base leading-none">{tile.icon}</span>
              <span className="text-[11px] sm:text-xs text-muted font-medium uppercase tracking-wide">{tile.label}</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground leading-none">
              {value}{suffix}
            </p>
          </div>
        )
      })}
    </div>
  )
}
