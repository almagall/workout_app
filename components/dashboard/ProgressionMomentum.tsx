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
      <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6 h-[400px]">
        <h2 className="text-lg font-semibold text-white mb-4">Progression Momentum</h2>
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-[#888888]">Loading...</p>
        </div>
      </div>
    )
  }

  if (trends.length === 0) {
    return (
      <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6 h-[400px]">
        <h2 className="text-lg font-semibold text-white mb-4">Progression Momentum</h2>
        <div className="flex flex-col items-center justify-center h-[300px] text-center">
          <p className="text-[#888888] mb-2">Not enough data yet</p>
          <p className="text-sm text-[#666666]">Log at least 4 workouts to see progression trends</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] overflow-hidden h-[400px] flex flex-col">
      <div className="p-4 border-b border-[#2a2a2a]">
        <h2 className="text-lg font-semibold text-white">Progression Momentum</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {trends.map((trend, index) => (
            <div
              key={index}
              className="p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-white font-medium mb-1">{trend.exerciseName}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{trend.icon}</span>
                    <span
                      className="text-sm font-semibold uppercase"
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
                    <span className="text-xs text-[#888888]">(4 weeks)</span>
                  </div>
                  {(trend.trend === 'plateaued' || trend.trend === 'regressing') && (
                    <p className="text-xs text-[#888888] mt-2">{trend.message}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
