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
    async function loadChartData() {
      const user = getCurrentUser()
      if (!user || !selectedExercise) {
        setLoading(false)
        return
      }

      const [sessions, allLogs] = await Promise.all([
        getWorkoutSessions(),
        getExerciseLogs()
      ])
      
      sessions.sort((a, b) => 
        new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime()
      )

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
    }

    loadChartData()
  }, [selectedExercise])

  if (loading) {
    return <div className="text-[#888888]">Loading chart data...</div>
  }

  if (data.length === 0) {
    return (
      <div className="text-[#a1a1a1] text-center py-8">
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
              ? 'bg-white text-black'
              : 'bg-[#1a1a1a] text-[#a1a1a1] hover:bg-[#2a2a2a] border border-[#2a2a2a]'
          }`}
        >
          Weight
        </button>
        <button
          onClick={() => setSelectedMetric('reps')}
          className={`px-4 py-2 rounded transition-colors ${
            selectedMetric === 'reps'
              ? 'bg-white text-black'
              : 'bg-[#1a1a1a] text-[#a1a1a1] hover:bg-[#2a2a2a] border border-[#2a2a2a]'
          }`}
        >
          Reps
        </button>
        <button
          onClick={() => setSelectedMetric('volume')}
          className={`px-4 py-2 rounded transition-colors ${
            selectedMetric === 'volume'
              ? 'bg-white text-black'
              : 'bg-[#1a1a1a] text-[#a1a1a1] hover:bg-[#2a2a2a] border border-[#2a2a2a]'
          }`}
        >
          Volume
        </button>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis dataKey="date" stroke="#888888" tick={{ fill: '#888888' }} />
          <YAxis stroke="#888888" tick={{ fill: '#888888' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#111111', 
              border: '1px solid #2a2a2a',
              color: '#ffffff',
              borderRadius: '8px'
            }} 
          />
          <Legend wrapperStyle={{ color: '#a1a1a1' }} />
          {selectedMetric === 'weight' && (
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#ffffff"
              strokeWidth={2}
              name="Average Weight (lbs)"
            />
          )}
          {selectedMetric === 'reps' && (
            <Line
              type="monotone"
              dataKey="reps"
              stroke="#ffffff"
              strokeWidth={2}
              name="Average Reps"
            />
          )}
          {selectedMetric === 'volume' && (
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#ffffff"
              strokeWidth={2}
              name="Volume (weight × reps)"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
