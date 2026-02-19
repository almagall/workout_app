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
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Recent PRs</h2>
        </div>
        <div className="p-4">
          <div className="text-muted text-sm">Loading...</div>
        </div>
      </div>
    )
  }

  if (workoutDays.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Recent PRs</h2>
        </div>
        <div className="p-4">
          <p className="text-muted text-sm">No personal records yet. Log workouts to see your PRs here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Recent PRs</h2>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          {workoutDays.map((day) => {
          const dayKey = `${day.workoutDate}|${day.templateDayId}`
          const isExpanded = expandedDays.has(dayKey)
          
          return (
            <div key={dayKey} className="border border-border rounded-lg overflow-hidden">
              {/* Day Header */}
              <button
                onClick={() => toggleDay(day.workoutDate, day.templateDayId)}
                className="w-full bg-elevated hover:bg-border px-4 py-3 flex items-center justify-between transition-colors"
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
                <div className="bg-[#111111] divide-y divide-border">
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
                        <span className="text-amber-300 font-semibold">{pr.value} lbs</span>
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
