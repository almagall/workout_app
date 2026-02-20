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

function StreakIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" stroke="none" />
    </svg>
  )
}
function CalendarIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function TargetIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function TrophyIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2" /><path d="M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2" /><path d="M6 3h12v7a6 6 0 01-12 0V3z" /><path d="M9 21h6" /><path d="M12 16v5" />
    </svg>
  )
}

const TILES: { key: keyof Metrics; label: string; icon: React.ReactNode; color: string; glow: string; suffix?: string; format?: (v: number) => string }[] = [
  { key: 'streak', label: 'Week Streak', icon: <StreakIcon />, color: 'text-amber-400', glow: 'rgba(251,191,36,0.08)' },
  { key: 'workoutsThisMonth', label: 'This Month', icon: <CalendarIcon />, color: 'text-blue-400', glow: 'rgba(96,165,250,0.08)' },
  { key: 'targetHitRate', label: 'Hit Rate', icon: <TargetIcon />, color: 'text-emerald-400', glow: 'rgba(52,211,153,0.08)', suffix: '%' },
  { key: 'avgDurationMin', label: 'Avg Duration', icon: <ClockIcon />, color: 'text-purple-400', glow: 'rgba(192,132,252,0.08)', suffix: ' min' },
  { key: 'prsThisMonth', label: 'PRs This Month', icon: <TrophyIcon />, color: 'text-yellow-400', glow: 'rgba(250,204,21,0.08)' },
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
          <div key={i} className="card-glass p-4 sm:p-5 animate-pulse">
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
            className="flex-shrink-0 min-w-[6.5rem] sm:min-w-0 sm:flex-1 card-glass p-4 sm:p-5 relative overflow-hidden"
          >
            <div
              className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, ${tile.glow}, transparent 70%)` }}
            />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`${tile.color}`}>{tile.icon}</span>
                <span className="text-[11px] sm:text-xs text-muted font-medium uppercase tracking-wide">{tile.label}</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold leading-none text-foreground">
                {value}<span className="text-muted font-medium text-sm">{suffix}</span>
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
