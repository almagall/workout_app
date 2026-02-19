'use client'

import { useState, useEffect } from 'react'
import { getAllProgressionTrends } from '@/lib/progression-analytics'
import type { ProgressionTrend } from '@/types/profile'

export default function ProgressionMomentum() {
  const [loading, setLoading] = useState(true)
  const [trends, setTrends] = useState<ProgressionTrend[]>([])

  useEffect(() => {
    async function loadTrends() {
      setLoading(true)
      const data = await getAllProgressionTrends()
      setTrends(data.slice(0, 10)) // Show top 10
      setLoading(false)
    }

    loadTrends()
  }, [])

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Progression Momentum</h2>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  if (trends.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Progression Momentum</h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted mb-2">Not enough data yet</p>
          <p className="text-sm text-secondary">Log at least 4 workouts to see progression trends</p>
        </div>
      </div>
    )
  }

  const shown = trends.slice(0, 6)

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-white">Progression Momentum</h2>
      </div>

      <div className="p-4">
        <div className="space-y-2">
          {shown.map((trend, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2.5 bg-elevated rounded-lg border border-border"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-lg leading-none">{trend.icon}</span>
                <span className="text-foreground font-medium text-sm truncate">{trend.exerciseName}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span
                  className="text-xs font-semibold uppercase"
                  style={{ color: trend.color }}
                >
                  {trend.trend}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: trend.color }}
                >
                  {trend.percentChange > 0 ? '+' : ''}
                  {trend.percentChange.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
