'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Metrics {
  totalWorkouts: number
  totalVolume: number
  averageRating: number
  personalRecords: number
}

export default function PerformanceMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchMetrics() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('id, overall_performance_rating')
        .eq('user_id', user.id)

      const { data: sessionsWithLogs } = await supabase
        .from('workout_sessions')
        .select(`
          exercise_logs (
            weight,
            reps,
            exercise_name
          )
        `)
        .eq('user_id', user.id)

      const logs = sessionsWithLogs?.flatMap((s: any) => s.exercise_logs || []) || []

      if (sessions && logs) {
        const totalWorkouts = sessions.length
        const totalVolume = logs.reduce(
          (sum, log) => sum + parseFloat(log.weight.toString()) * log.reps,
          0
        )
        const ratings = sessions
          .map((s) => s.overall_performance_rating)
          .filter((r) => r !== null) as number[]
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
            : 0

        // Calculate PRs (simplified - count exercises where weight increased)
        const exerciseMaxWeights = new Map<string, number>()
        logs.forEach((log) => {
          const weight = parseFloat(log.weight.toString())
          const currentMax = exerciseMaxWeights.get(log.exercise_name) || 0
          if (weight > currentMax) {
            exerciseMaxWeights.set(log.exercise_name, weight)
          }
        })
        const personalRecords = exerciseMaxWeights.size

        setMetrics({
          totalWorkouts,
          totalVolume: Math.round(totalVolume),
          averageRating: Math.round(averageRating * 10) / 10,
          personalRecords,
        })
      }
      setLoading(false)
    }

    fetchMetrics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
        <div className="text-slate-400">Loading metrics...</div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
        <p className="text-slate-300">No metrics available yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-100">Performance Metrics</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-400">Total Workouts</p>
            <p className="text-2xl font-bold text-indigo-400">{metrics.totalWorkouts}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Total Volume</p>
            <p className="text-2xl font-bold text-indigo-400">
              {metrics.totalVolume.toLocaleString()} lbs
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Average Rating</p>
            <p className="text-2xl font-bold text-indigo-400">{metrics.averageRating}/10</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Personal Records</p>
            <p className="text-2xl font-bold text-indigo-400">{metrics.personalRecords}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
