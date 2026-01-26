'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { createClient } from '@/lib/supabase/client'

interface ChartData {
  date: string
  weight: number
  reps: number
  volume: number
}

export default function ProgressChart() {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<'weight' | 'reps' | 'volume'>('weight')
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get exercise selector value from parent or use first exercise
      // For now, we'll get all exercises and aggregate
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          workout_date,
          exercise_logs (
            exercise_name,
            weight,
            reps,
            set_number
          )
        `)
        .eq('user_id', user.id)
        .order('workout_date', { ascending: true })

      if (sessions) {
        const chartData: ChartData[] = sessions.map((session) => {
          if (!session.exercise_logs || session.exercise_logs.length === 0) {
            return {
              date: new Date(session.workout_date).toLocaleDateString(),
              weight: 0,
              reps: 0,
              volume: 0,
            }
          }

          // Calculate average weight and reps across all exercises
          const totalWeight = session.exercise_logs.reduce(
            (sum: number, log: any) => sum + parseFloat(log.weight),
            0
          )
          const totalReps = session.exercise_logs.reduce(
            (sum: number, log: any) => sum + log.reps,
            0
          )
          const count = session.exercise_logs.length

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

    fetchData()
  }, [])

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
