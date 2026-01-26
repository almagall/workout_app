'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import { getWorkoutSessions, getExerciseLogs } from '@/lib/storage'

interface Metrics {
  totalWorkouts: number
  totalVolume: number
  averageRating: number
}

export default function PerformanceMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) return

    const sessions = getWorkoutSessions()
    const logs = getExerciseLogs()

    if (sessions.length > 0 && logs.length > 0) {
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

      setMetrics({
        totalWorkouts,
        totalVolume: Math.round(totalVolume),
        averageRating: Math.round(averageRating * 10) / 10,
      })
    }
    setLoading(false)
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
            <p className="text-xs text-slate-500 mt-1">Average overall workout performance rating across all logged workouts</p>
          </div>
        </div>
      </div>
    </div>
  )
}
