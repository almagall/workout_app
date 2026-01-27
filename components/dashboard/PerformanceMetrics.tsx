'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import { getWorkoutSessions, getExerciseLogs } from '@/lib/storage'

interface Metrics {
  totalWorkouts: number
  workoutsThisMonth: number
  targetHitRate: number | null
  averageRating: number
}

export default function PerformanceMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMetrics() {
      const user = getCurrentUser()
      if (!user) return

      const [sessions, logs] = await Promise.all([
        getWorkoutSessions(),
        getExerciseLogs()
      ])

      if (sessions.length > 0) {
        const totalWorkouts = sessions.length
        const now = new Date()
        const workoutsThisMonth = sessions.filter(
          (s) =>
            new Date(s.workout_date).getMonth() === now.getMonth() &&
            new Date(s.workout_date).getFullYear() === now.getFullYear()
        ).length

        const logsWithStatus = logs.filter(
          (l) =>
            l.performance_status === 'met_target' ||
            l.performance_status === 'overperformed' ||
            l.performance_status === 'underperformed'
        )
        const hitCount = logs.filter(
          (l) =>
            l.performance_status === 'met_target' ||
            l.performance_status === 'overperformed'
        ).length
        const targetHitRate =
          logsWithStatus.length > 0
            ? (hitCount / logsWithStatus.length) * 100
            : null

        const ratings = sessions
          .map((s) => s.overall_performance_rating)
          .filter((r) => r !== null) as number[]
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
            : 0

        setMetrics({
          totalWorkouts,
          workoutsThisMonth,
          targetHitRate: targetHitRate !== null ? Math.round(targetHitRate * 10) / 10 : null,
          averageRating: Math.round(averageRating * 10) / 10,
        })
      }
      setLoading(false)
    }

    loadMetrics()
  }, [])

  if (loading) {
    return (
      <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
        <div className="text-[#888888]">Loading metrics...</div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
        <p className="text-[#a1a1a1]">No metrics available yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Performance Metrics</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-[#888888]">Total Workouts</p>
            <p className="text-2xl font-bold text-white">{metrics.totalWorkouts}</p>
          </div>
          <div>
            <p className="text-sm text-[#888888]">Workouts This Month</p>
            <p className="text-2xl font-bold text-white">{metrics.workoutsThisMonth}</p>
            <p className="text-xs text-[#666666] mt-1">Sessions logged in the current month</p>
          </div>
          <div>
            <p className="text-sm text-[#888888]">Target Hit Rate</p>
            <p className="text-2xl font-bold text-white">
              {metrics.targetHitRate !== null ? `${metrics.targetHitRate}%` : '—'}
            </p>
            <p className="text-xs text-[#666666] mt-1">Share of sets that met or exceeded target</p>
          </div>
          <div>
            <p className="text-sm text-[#888888]">Average Rating</p>
            <p className="text-2xl font-bold text-white">{metrics.averageRating}/10</p>
            <p className="text-xs text-[#666666] mt-1">Average overall workout performance rating across all logged workouts</p>
          </div>
        </div>
      </div>
    </div>
  )
}
