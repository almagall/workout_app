'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import { getWorkoutSessions, getTemplateDays, getTemplates, getExerciseLogs } from '@/lib/storage'
import { getRecentPRs } from '@/lib/pr-helper'
import { getWeeklyVolume } from '@/lib/performance-analytics'
import { getNextWorkout, type NextWorkoutInfo } from '@/lib/next-workout'

interface WeeklySummary {
  workoutsDone: number
  workoutsGoal: number
  prsThisWeek: number
  volumeChangePct: number | null
  nudge: string | null
}

function getISOWeekMonday(d: Date): string {
  const copy = new Date(d)
  copy.setHours(12, 0, 0, 0)
  const day = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - day)
  return copy.toISOString().slice(0, 10)
}

export default function WeeklySummaryCard() {
  const [data, setData] = useState<WeeklySummary | null>(null)
  const [nextWorkout, setNextWorkout] = useState<NextWorkoutInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getNextWorkout().then(setNextWorkout)
    async function load() {
      const user = getCurrentUser()
      if (!user) { setLoading(false); return }

      const [templates, sessions, recentPRs, volumeData] = await Promise.all([
        getTemplates(),
        getWorkoutSessions(),
        getRecentPRs(100),
        getWeeklyVolume(2),
      ])

      if (templates.length === 0) { setLoading(false); return }

      const days = await getTemplateDays(templates[0].id)
      const workoutsGoal = days.length

      const today = new Date()
      const thisWeekMonday = getISOWeekMonday(today)

      const completeSessions = sessions.filter(s => s.is_complete !== false)
      const workoutsDone = completeSessions.filter(s => {
        const sd = new Date(s.workout_date + 'T12:00:00')
        return getISOWeekMonday(sd) === thisWeekMonday
      }).length

      const prsThisWeek = recentPRs.filter(pr => {
        const pd = new Date(pr.workoutDate + 'T12:00:00')
        return getISOWeekMonday(pd) === thisWeekMonday
      }).length

      let volumeChangePct: number | null = null
      if (volumeData.length >= 2) {
        const current = volumeData[volumeData.length - 1].volume
        const previous = volumeData[volumeData.length - 2].volume
        if (previous > 0) {
          volumeChangePct = Math.round(((current - previous) / previous) * 100)
        }
      }

      const remaining = workoutsGoal - workoutsDone
      let nudge: string | null = null
      if (remaining <= 0) {
        nudge = 'All workouts completed this week!'
      } else if (remaining === 1) {
        nudge = 'One more workout to hit your goal!'
      } else if (remaining > 0 && workoutsDone > 0) {
        nudge = `${remaining} more to stay on track`
      }

      setData({ workoutsDone, workoutsGoal, prsThisWeek, volumeChangePct, nudge })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="card-glass p-4 sm:p-5 animate-pulse">
        <div className="h-4 w-40 bg-elevated rounded mb-3" />
        <div className="h-3 w-56 bg-elevated rounded" />
      </div>
    )
  }

  if (!data) return null

  const progress = data.workoutsGoal > 0
    ? Math.min(100, Math.round((data.workoutsDone / data.workoutsGoal) * 100))
    : 0

  const allDone = data.workoutsDone >= data.workoutsGoal

  return (
    <div className="card-glass p-4 sm:p-6 border-l-2 border-l-accent/30 relative overflow-hidden">
      <div
        className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 100% 0%, rgba(59,130,246,0.07), transparent 70%)' }}
      />
      <div className="relative flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-medium text-accent-light/70 uppercase tracking-wide mb-1">This Week</p>
          <p className="text-foreground font-bold text-lg sm:text-xl">
            {data.workoutsDone}<span className="text-muted font-medium text-sm"> / {data.workoutsGoal}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {data.prsThisWeek > 0 && (
            <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded-md">
              {data.prsThisWeek} PR{data.prsThisWeek !== 1 ? 's' : ''}
            </span>
          )}
          {data.volumeChangePct !== null && (
            <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
              data.volumeChangePct >= 0
                ? 'text-green-400 bg-green-400/10 border border-green-400/20'
                : 'text-red-400 bg-red-400/10 border border-red-400/20'
            }`}>
              {data.volumeChangePct >= 0 ? '+' : ''}{data.volumeChangePct}% vol
            </span>
          )}
        </div>
      </div>

      <div className="relative w-full bg-white/[0.08] rounded-full h-2.5 mb-2">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${allDone ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 'bg-gradient-accent shadow-[0_0_8px_rgba(59,130,246,0.2)]'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {data.nudge && (
        <p className={`relative text-xs ${allDone ? 'text-green-400' : 'text-muted'}`}>
          {data.nudge}
        </p>
      )}

      {nextWorkout && (
        <div className="relative mt-3 pt-3 border-t border-white/[0.06]">
          <div className="flex items-baseline justify-between gap-2 mb-0.5">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Up Next</p>
            {nextWorkout.daysSinceLastTrained !== null && (
              <p className={`text-[11px] ${nextWorkout.daysSinceLastTrained >= 8 ? 'text-amber-400' : 'text-muted'}`}>
                {nextWorkout.daysSinceLastTrained === 0
                  ? 'Trained today'
                  : nextWorkout.daysSinceLastTrained === 1
                    ? 'Last trained yesterday'
                    : `${nextWorkout.daysSinceLastTrained} days ago`}
              </p>
            )}
          </div>
          <p className="text-accent-light font-semibold text-sm sm:text-base">{nextWorkout.dayLabel}</p>
          {nextWorkout.keyLifts.length > 0 && nextWorkout.keyLifts[0].weight > 0 && (
            <div className="mt-1.5">
              <p className="text-[11px] text-muted uppercase tracking-wide mb-1">Last session top sets</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {nextWorkout.keyLifts.map(lift => (
                  <span key={lift.name} className="text-xs text-secondary">
                    <span className="text-foreground font-medium">{lift.name}</span>
                    {' '}{lift.weight} lbs x {lift.reps}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
