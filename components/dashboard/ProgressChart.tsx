'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getCurrentUser } from '@/lib/auth-simple'
import { getWorkoutSessions, getExerciseLogs } from '@/lib/storage'
import { estimated1RM } from '@/lib/estimated-1rm'
import { getStartDateForInterval, getTodayLocalYYYYMMDD } from '@/lib/date-utils'
import type { TimeIntervalKey } from '@/lib/date-utils'

interface ChartData {
  date: string
  estimated1RM: number
  heaviestSet: number
}

interface ProgressChartProps {
  selectedTemplateDayId: string | null
  selectedExercise: string
}

function formatWorkoutDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatAsMonthYear(displayDate: string): string {
  const d = new Date(displayDate)
  if (Number.isNaN(d.getTime())) return displayDate
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function ProgressChart({ selectedTemplateDayId, selectedExercise }: ProgressChartProps) {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<'estimated1RM' | 'heaviestSet'>('heaviestSet')
  const [selectedInterval, setSelectedInterval] = useState<TimeIntervalKey>('All')

  useEffect(() => {
    setLoading(true)

    async function loadChartData() {
      const user = getCurrentUser()
      if (!user || !selectedTemplateDayId || !selectedExercise) {
        setData([])
        setLoading(false)
        return
      }

      const [sessions, allLogs] = await Promise.all([
        getWorkoutSessions(),
        getExerciseLogs()
      ])

      const daySessions = sessions
        .filter((s) => s.template_day_id === selectedTemplateDayId)
        .sort((a, b) =>
          new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime()
        )

      const today = getTodayLocalYYYYMMDD()
      const startDate = getStartDateForInterval(selectedInterval, today)
      const filteredSessions = daySessions.filter(
        (s) => s.workout_date >= startDate
      )

      const chartData: ChartData[] = filteredSessions
        .map((session) => {
          const allSessionLogs = allLogs.filter(
            (log) =>
              log.session_id === session.id && log.exercise_name === selectedExercise
          )
          const sessionLogs = allSessionLogs.filter(
            (log) => (log.set_type ?? 'working') === 'working'
          )

          if (sessionLogs.length === 0) return null

          const set1RMs = sessionLogs.map((log) =>
            estimated1RM(parseFloat(log.weight.toString()), log.reps)
          )
          const max1RM = set1RMs.length > 0 ? Math.max(...set1RMs) : 0

          const weights = sessionLogs.map((log) => parseFloat(log.weight.toString()))
          const heaviestSet = weights.length > 0 ? Math.max(...weights) : 0

          return {
            date: formatWorkoutDate(session.workout_date),
            estimated1RM: Math.round(max1RM * 10) / 10,
            heaviestSet: Math.round(heaviestSet * 10) / 10,
          }
        })
        .filter((row): row is ChartData => row !== null)

      setData(chartData)
      setLoading(false)
    }

    loadChartData()
  }, [selectedTemplateDayId, selectedExercise, selectedInterval])

  if (loading) {
    return <div className="text-[#888888]">Loading chart data...</div>
  }

  if (!selectedTemplateDayId || !selectedExercise) {
    return (
      <div className="text-[#a1a1a1] text-center py-8">
        Select a workout day and exercise above.
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-[#a1a1a1] text-center py-8">
        No sessions logged for this workout day yet.
      </div>
    )
  }

  const intervalOptions: TimeIntervalKey[] = ['All', '1M', '3M', '6M', '1Y', 'YTD']

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedMetric('heaviestSet')}
            className={`text-sm px-2.5 py-1 rounded transition-colors ${
              selectedMetric === 'heaviestSet'
                ? 'bg-white text-black'
                : 'bg-[#1a1a1a] text-[#a1a1a1] hover:bg-[#2a2a2a] border border-[#2a2a2a]'
            }`}
          >
            Top Set
          </button>
          <button
            onClick={() => setSelectedMetric('estimated1RM')}
            className={`text-sm px-2.5 py-1 rounded transition-colors ${
              selectedMetric === 'estimated1RM'
                ? 'bg-white text-black'
                : 'bg-[#1a1a1a] text-[#a1a1a1] hover:bg-[#2a2a2a] border border-[#2a2a2a]'
            }`}
          >
            Estimated 1RM
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 justify-end">
          {intervalOptions.map((interval) => (
            <button
              key={interval}
              onClick={() => setSelectedInterval(interval)}
              className={`text-sm px-2.5 py-1 rounded transition-colors ${
                selectedInterval === interval
                  ? 'bg-white text-black'
                  : 'bg-[#1a1a1a] text-[#a1a1a1] hover:bg-[#2a2a2a] border border-[#2a2a2a]'
              }`}
            >
              {interval}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis
            dataKey="date"
            stroke="#888888"
            tick={{ fill: '#888888' }}
            tickFormatter={(value) =>
              data.length > 4 ? formatAsMonthYear(value) : value
            }
          />
          <YAxis stroke="#888888" tick={{ fill: '#888888' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#111111', 
              border: '1px solid #2a2a2a',
              color: '#ffffff',
              borderRadius: '8px'
            }} 
          />
          {selectedMetric === 'estimated1RM' && (
            <Line
              type="monotone"
              dataKey="estimated1RM"
              stroke="#ffffff"
              strokeWidth={2}
              name="Estimated 1RM (lbs)"
            />
          )}
          {selectedMetric === 'heaviestSet' && (
            <Line
              type="monotone"
              dataKey="heaviestSet"
              stroke="#ffffff"
              strokeWidth={2}
              name="Top Set (lbs)"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
