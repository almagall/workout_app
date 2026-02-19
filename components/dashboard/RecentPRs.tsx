'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import { getRecentPRsByDay } from '@/lib/pr-helper'
import type { WorkoutDayPRs } from '@/lib/pr-helper'

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function RecentPRs() {
  const [workoutDays, setWorkoutDays] = useState<WorkoutDayPRs[]>([])
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const user = getCurrentUser()
      if (!user) return

      const days = await getRecentPRsByDay(3)
      setWorkoutDays(days)
      
      // Keep all days collapsed by default
      setExpandedDays(new Set())
      
      setLoading(false)
    }

    load()
  }, [])

  const toggleDay = (workoutDate: string, templateDayId: string) => {
    const key = `${workoutDate}|${templateDayId}`
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedDays(newExpanded)
  }

  if (loading) {
    return (
      <div className="card-glass card-accent-top">
        <div className="p-4 sm:p-6 border-b border-white/[0.06] bg-white/[0.015]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Recent PRs</h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="text-muted text-sm">Loading...</div>
        </div>
      </div>
    )
  }

  if (workoutDays.length === 0) {
    return (
      <div className="card-glass card-accent-top">
        <div className="p-4 sm:p-6 border-b border-white/[0.06] bg-white/[0.015]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Recent PRs</h2>
        </div>
        <div className="p-4 sm:p-6">
          <p className="text-muted text-sm">No personal records yet. Log workouts to see your PRs here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card-glass card-accent-top">
      <div
        className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.05), transparent 70%)' }}
      />
      <div className="relative p-4 sm:p-6 border-b border-white/[0.06] bg-white/[0.015]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Recent PRs</h2>
      </div>
      <div className="relative p-4 sm:p-6">
        <div className="space-y-3">
          {workoutDays.map((day) => {
          const dayKey = `${day.workoutDate}|${day.templateDayId}`
          const isExpanded = expandedDays.has(dayKey)
          
          return (
            <div key={dayKey} className="border border-white/[0.05] rounded-lg overflow-hidden">
              <button
                onClick={() => toggleDay(day.workoutDate, day.templateDayId)}
                className="w-full bg-white/[0.025] hover:bg-white/[0.05] px-4 py-3 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className={`w-4 h-4 text-muted transition-transform ${
                      isExpanded ? 'rotate-90' : 'rotate-0'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-foreground font-medium">
                    {formatDate(day.workoutDate)} · {day.dayLabel}
                  </span>
                </div>
                {!isExpanded && (
                  <span className="text-xs text-muted">
                    ({day.prs.length} PR{day.prs.length !== 1 ? 's' : ''})
                  </span>
                )}
              </button>

              {/* PRs List */}
              {isExpanded && (
                <div className="bg-white/[0.01] divide-y divide-white/[0.06]">
                  {day.prs.map((pr, i) => (
                    <div
                      key={`${pr.exerciseName}-${pr.prType}-${i}`}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div>
                        <p className="text-foreground font-medium">{pr.exerciseName}</p>
                        <p className="text-xs text-muted">
                          {pr.prType === 'heaviestSet' ? 'Heaviest set' : 'Est. 1RM'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-amber-300 font-bold" style={{ textShadow: '0 0 12px rgba(251,191,36,0.2)' }}>{pr.value} lbs</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}
