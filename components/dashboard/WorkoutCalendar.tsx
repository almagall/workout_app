'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getWorkoutSessions, getExerciseLogs, getExerciseLogsForSession, getTemplateDay } from '@/lib/storage'
import { getPRsForSession, type SessionPR } from '@/lib/pr-helper'
import { toYYYYMMDD, getTodayLocalYYYYMMDD } from '@/lib/date-utils'
import type { WorkoutSession } from '@/types/workout'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getDaysForMonthView(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startDow = first.getDay()
  const daysInMonth = last.getDate()

  const rows: (number | null)[][] = []
  let row: (number | null)[] = []
  const leadingBlanks = startDow
  for (let i = 0; i < leadingBlanks; i++) row.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    row.push(d)
    if (row.length === 7) {
      rows.push(row)
      row = []
    }
  }
  if (row.length > 0) {
    while (row.length < 7) row.push(null)
    rows.push(row)
  }
  return rows
}

export default function WorkoutCalendar() {
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set())
  const [sessionsByDate, setSessionsByDate] = useState<Map<string, WorkoutSession[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [modalDate, setModalDate] = useState<string | null>(null)
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  useEffect(() => {
    async function load() {
      const sessions = await getWorkoutSessions()
      const dates = new Set<string>()
      const byDate = new Map<string, WorkoutSession[]>()
      sessions.forEach((s) => {
        const d = s.workout_date ? (typeof s.workout_date === 'string' ? s.workout_date : toYYYYMMDD(new Date(s.workout_date))) : null
        if (d) {
          dates.add(d)
          const list = byDate.get(d) ?? []
          list.push(s)
          byDate.set(d, list)
        }
      })
      setWorkoutDates(dates)
      setSessionsByDate(byDate)
      setLoading(false)
    }
    load()
  }, [])

  const todayStr = getTodayLocalYYYYMMDD()
  const grid = getDaysForMonthView(viewYear, viewMonth)

  type CompletionRow = {
    session: WorkoutSession
    dayLabel: string
    prs: SessionPR[]
    rating: number | null
    feedback: string | null
  }
  const [completionData, setCompletionData] = useState<CompletionRow[] | null>(null)
  const [loadingCompletion, setLoadingCompletion] = useState(false)

  useEffect(() => {
    if (!modalDate) {
      setCompletionData(null)
      return
    }
    const sessions = sessionsByDate.get(modalDate) ?? []
    if (sessions.length === 0) {
      setCompletionData([])
      return
    }
    let cancelled = false
    setLoadingCompletion(true)
    ;(async () => {
      // OPTIMIZATION: Fetch all sessions and logs ONCE upfront to avoid redundant queries
      const [allSessions, allLogs] = await Promise.all([
        getWorkoutSessions(),
        getExerciseLogs(),
      ])
      if (cancelled) return

      const rows: CompletionRow[] = []
      for (const session of sessions) {
        const [logs, day] = await Promise.all([
          getExerciseLogsForSession(session.id),
          getTemplateDay(session.template_day_id),
        ])
        if (cancelled) return
        const dayLabel = day?.day_label ?? 'Workout'
        const exercises = (() => {
          const byName = new Map<string, { exerciseName: string; sets: Array<{ setType: string; weight: number; reps: number }> }>()
          for (const log of logs) {
            const name = log.exercise_name
            if (!byName.has(name)) byName.set(name, { exerciseName: name, sets: [] })
            byName.get(name)!.sets.push({
              setType: log.set_type ?? 'working',
              weight: typeof log.weight === 'number' ? log.weight : parseFloat(String(log.weight)),
              reps: log.reps,
            })
          }
          return Array.from(byName.values())
        })()
        // PASS CACHED DATA to avoid redundant fetches
        const prs = await getPRsForSession(session.template_day_id, exercises, session.id, allSessions, allLogs)
        if (cancelled) return
        rows.push({
          session,
          dayLabel,
          prs,
          rating: session.overall_performance_rating ?? null,
          feedback: session.overall_feedback ?? null,
        })
      }
      if (!cancelled) setCompletionData(rows)
      setLoadingCompletion(false)
    })()
    return () => { cancelled = true }
  }, [modalDate, sessionsByDate])

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  if (loading) {
    return (
      <div className="card-glass p-4 sm:p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">Workout Calendar</h2>
        <div className="text-muted text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="card-glass p-4 sm:p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 sm:mb-4">Workout Calendar</h2>

      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-md text-foreground hover:bg-elevated transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-1 sm:gap-2">
          <select
            value={viewMonth}
            onChange={(e) => setViewMonth(Number(e.target.value))}
            className="bg-white/[0.04] border border-white/[0.08] text-foreground rounded-md px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={viewYear}
            onChange={(e) => setViewYear(Number(e.target.value))}
            className="bg-white/[0.04] border border-white/[0.08] text-foreground rounded-md px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-md text-foreground hover:bg-elevated transition-colors"
          aria-label="Next month"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="mx-auto grid grid-cols-7 gap-0.5 text-center max-w-[240px] sm:max-w-none">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium text-muted">
            {d}
          </div>
        ))}
        {grid.map((row, ri) =>
          row.map((day, di) => {
            if (day === null) {
              return <div key={`${ri}-${di}-empty`} className="aspect-square" />
            }
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const hasWorkout = workoutDates.has(dateStr)
            const isToday = dateStr === todayStr
            const DayWrapper = hasWorkout ? 'button' : 'div'
            return (
              <DayWrapper
                key={`${ri}-${di}-${day}`}
                type={hasWorkout ? 'button' : undefined}
                onClick={hasWorkout ? () => setModalDate(dateStr) : undefined}
                className={`aspect-square flex items-center justify-center rounded-md text-[10px] sm:text-sm ${
                  hasWorkout
                    ? 'bg-green-600/60 text-foreground font-semibold cursor-pointer hover:bg-green-600/80 transition-colors'
                    : 'text-secondary'
                } ${isToday ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : ''}`}
                title={hasWorkout ? `Workout on ${dateStr} – click for details` : undefined}
              >
                {day}
              </DayWrapper>
            )
          })
        )}
      </div>

      <div className="mt-2 sm:mt-3 flex items-center justify-center sm:justify-start gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-600/60" />
          Workout logged
        </span>
        {isCurrentMonth && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded ring-2 ring-accent ring-offset-1 ring-offset-background bg-transparent" />
            Today
          </span>
        )}
      </div>

      {/* Completion notes modal */}
      {modalDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setModalDate(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Workout Completion Log"
        >
          <div
            className="modal-glass max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/[0.06] bg-white/[0.015] flex justify-between items-center">
              <h3 className="text-base font-semibold text-foreground">
                Workout Completion Log
                {modalDate && (
                  <span className="block text-sm font-normal text-muted mt-0.5">
                    {(() => {
                      const [y, m, d] = modalDate.split('-').map(Number)
                      return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                    })()}
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setModalDate(null)}
                className="p-1.5 rounded text-muted hover:text-foreground hover:bg-elevated transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {loadingCompletion && (
                <p className="text-muted text-sm text-center py-6">Loading…</p>
              )}
              {!loadingCompletion && completionData && completionData.length === 0 && (
                <p className="text-muted text-sm text-center py-6">No sessions found for this date.</p>
              )}
              {!loadingCompletion && completionData && completionData.length > 0 && (
                <div className="space-y-6">
                  {completionData.map((row) => (
                    <div key={row.session.id} className="bg-white/[0.025] rounded-lg border border-white/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.1)] p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-base font-semibold text-foreground">{row.dayLabel}</h4>
                        <Link
                          href={`/workout/edit/${row.session.id}`}
                          onClick={() => setModalDate(null)}
                          className="text-sm font-medium text-foreground bg-elevated hover:bg-border px-3 py-1.5 rounded-md transition-colors"
                        >
                          Edit workout
                        </Link>
                      </div>
                      {row.rating !== null && (
                        <p className="text-foreground text-sm mb-2">
                          Overall rating: <span className="font-bold">{row.rating}/10</span>
                        </p>
                      )}
                      {row.feedback && (
                        <p className="text-secondary text-sm whitespace-pre-line mb-3">{row.feedback}</p>
                      )}
                      {row.prs.length > 0 && (
                        <div className="text-amber-300 text-sm font-medium">
                          <p className="mb-1.5">You hit {row.prs.length} PR(s):</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            {row.prs.map((p, i) => (
                              <li key={i}>
                                {p.prType === 'heaviestSet'
                                  ? `${p.exerciseName} (heaviest set: ${p.value} lbs)`
                                  : `${p.exerciseName} (estimated 1RM: ${p.value} lbs)`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
