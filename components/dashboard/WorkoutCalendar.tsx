'use client'

import { useEffect, useState } from 'react'
import { getWorkoutSessions } from '@/lib/storage'
import { toYYYYMMDD, getTodayLocalYYYYMMDD } from '@/lib/date-utils'

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
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  useEffect(() => {
    async function load() {
      const sessions = await getWorkoutSessions()
      const dates = new Set<string>()
      sessions.forEach((s) => {
        const d = s.workout_date
        if (d) dates.add(typeof d === 'string' ? d : toYYYYMMDD(new Date(d)))
      })
      setWorkoutDates(dates)
      setLoading(false)
    }
    load()
  }, [])

  const todayStr = getTodayLocalYYYYMMDD()
  const grid = getDaysForMonthView(viewYear, viewMonth)

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
      <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Workout Calendar</h2>
        <div className="text-[#888888] text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
      <h2 className="text-xl font-semibold mb-4 text-white">Workout Calendar</h2>

      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="p-2 rounded-md text-white hover:bg-[#2a2a2a] transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <select
            value={viewMonth}
            onChange={(e) => setViewMonth(Number(e.target.value))}
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-white"
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
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-white"
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
          className="p-2 rounded-md text-white hover:bg-[#2a2a2a] transition-colors"
          aria-label="Next month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1 text-xs font-medium text-[#888888]">
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
            return (
              <div
                key={`${ri}-${di}-${day}`}
                className={`aspect-square flex items-center justify-center rounded-md text-sm ${
                  hasWorkout
                    ? 'bg-green-600/60 text-white font-semibold'
                    : 'text-[#a1a1a1]'
                } ${isToday ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111111]' : ''}`}
                title={hasWorkout ? `Workout on ${dateStr}` : undefined}
              >
                {day}
              </div>
            )
          })
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-[#888888]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-600/60" />
          Workout logged
        </span>
        {isCurrentMonth && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded ring-2 ring-white ring-offset-1 ring-offset-[#111111] bg-transparent" />
            Today
          </span>
        )}
      </div>
    </div>
  )
}
