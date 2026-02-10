'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import { getWorkoutSessions, getExerciseLogs } from '@/lib/storage'

interface Metrics {
  totalWorkouts: number
  workoutsThisMonth: number
  targetHitRate: number | null
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

        setMetrics({
          totalWorkouts,
          workoutsThisMonth,
          targetHitRate: targetHitRate !== null ? Math.round(targetHitRate * 10) / 10 : null,
        })
      }
      setLoading(false)
    }

    loadMetrics()
  }, [])

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Performance Metrics</h2>
        </div>
        <div className="p-4">
          <div className="text-muted">Loading metrics...</div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Performance Metrics</h2>
        </div>
        <div className="p-4">
          <p className="text-secondary">No metrics available yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Performance Metrics</h2>
        </div>
        <div className="p-4 h-[400px]">
          <div className="space-y-4">
          <div>
            <p className="text-sm text-muted">Total Workouts</p>
            <p className="text-2xl font-bold text-foreground">{metrics.totalWorkouts}</p>
          </div>
          <div>
            <p className="text-sm text-muted">Workouts This Month</p>
            <p className="text-2xl font-bold text-foreground">{metrics.workoutsThisMonth}</p>
            <p className="text-xs text-secondary mt-1">Sessions logged in the current month</p>
          </div>
          <div>
            <p className="text-sm text-muted">Target Hit Rate</p>
            <p className="text-2xl font-bold text-foreground">
              {metrics.targetHitRate !== null ? `${metrics.targetHitRate}%` : '—'}
            </p>
            <p className="text-xs text-secondary mt-1">Share of sets that met or exceeded target</p>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
