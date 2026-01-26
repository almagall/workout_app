'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getCurrentUser } from '@/lib/auth-simple'
import { getWorkoutSessions, getExerciseLogs } from '@/lib/storage'

interface ChartData {
  date: string
  weight: number
  reps: number
  volume: number
}

interface ProgressChartProps {
  selectedExercise: string
}

export default function ProgressChart({ selectedExercise }: ProgressChartProps) {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<'weight' | 'reps' | 'volume'>('weight')

  useEffect(() => {
    const user = getCurrentUser()
    if (!user || !selectedExercise) {
      setLoading(false)
      return
    }

    const sessions = getWorkoutSessions().sort((a, b) => 
      new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime()
    )
    const allLogs = getExerciseLogs()

    if (sessions.length > 0) {
      const chartData: ChartData[] = sessions.map((session) => {
        // Filter logs for this session AND this specific exercise
        const sessionLogs = allLogs.filter(
          log => log.session_id === session.id && log.exercise_name === selectedExercise
        )

        if (sessionLogs.length === 0) {
          return {
            date: new Date(session.workout_date).toLocaleDateString(),
            weight: 0,
            reps: 0,
            volume: 0,
          }
        }

        // Calculate average weight and reps for this specific exercise
        const totalWeight = sessionLogs.reduce(
          (sum, log) => sum + parseFloat(log.weight.toString()),
          0
        )
        const totalReps = sessionLogs.reduce(
          (sum, log) => sum + log.reps,
          0
        )
        const count = sessionLogs.length

        const avgWeight = count > 0 ? totalWeight / count : 0
        const avgReps = count > 0 ? totalReps / count : 0
        const volume = avgWeight * avgReps

        return {
          date: new Date(session.workout_date).toLocaleDateString(),
          weight: Math.round(avgWeight * 10) / 10,
          reps: Math.round(avgReps * 10) / 10,
          volume: Math.round(volume * 10) / 10,
        }
      })

      setData(chartData)
    }
    setLoading(false)
  }, [selectedExercise])

  if (loading) {
    return <div className="text-slate-400">Loading chart data...</div>
  }

  if (data.length === 0) {
    return (
      <div className="text-slate-300 text-center py-8">
        No workout data available yet. Start logging workouts to see your progress!
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setSelectedMetric('weight')}
          className={`px-4 py-2 rounded transition-colors ${
            selectedMetric === 'weight'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
          }`}
        >
          Weight
        </button>
        <button
          onClick={() => setSelectedMetric('reps')}
          className={`px-4 py-2 rounded transition-colors ${
            selectedMetric === 'reps'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
          }`}
        >
          Reps
        </button>
        <button
          onClick={() => setSelectedMetric('volume')}
          className={`px-4 py-2 rounded transition-colors ${
            selectedMetric === 'volume'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
          }`}
        >
          Volume
        </button>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis dataKey="date" stroke="#cbd5e1" tick={{ fill: '#cbd5e1' }} />
          <YAxis stroke="#cbd5e1" tick={{ fill: '#cbd5e1' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              border: '1px solid #475569',
              color: '#f1f5f9',
              borderRadius: '8px'
            }} 
          />
          <Legend wrapperStyle={{ color: '#cbd5e1' }} />
          {selectedMetric === 'weight' && (
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#4f46e5"
              strokeWidth={2}
              name="Average Weight (lbs)"
            />
          )}
          {selectedMetric === 'reps' && (
            <Line
              type="monotone"
              dataKey="reps"
              stroke="#10b981"
              strokeWidth={2}
              name="Average Reps"
            />
          )}
          {selectedMetric === 'volume' && (
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#f59e0b"
              strokeWidth={2}
              name="Volume (weight × reps)"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
