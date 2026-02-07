'use client'

import { useState, useEffect } from 'react'
import { calculateConsistency } from '@/lib/performance-analytics'
import type { ConsistencyMetrics } from '@/types/profile'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ConsistencyScore() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<ConsistencyMetrics | null>(null)

  useEffect(() => {
    async function loadMetrics() {
      setLoading(true)
      const data = await calculateConsistency(13)
      setMetrics(data)
      setLoading(false)
    }

    loadMetrics()
  }, [])

  if (loading) {
    return (
      <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6 h-[400px]">
        <h2 className="text-lg font-semibold text-white mb-4">Performance Consistency</h2>
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-[#888888]">Loading...</p>
        </div>
      </div>
    )
  }

  if (!metrics || metrics.weeklyData.length === 0) {
    return (
      <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6 h-[400px]">
        <h2 className="text-lg font-semibold text-white mb-4">Performance Consistency</h2>
        <div className="flex flex-col items-center justify-center h-[300px] text-center">
          <p className="text-[#888888] mb-2">Not enough data yet</p>
          <p className="text-sm text-[#666666]">Log workouts with targets to see consistency metrics</p>
        </div>
      </div>
    )
  }

  // Chart data: only weeks with data, so x-axis shows only those
  const chartData = metrics.weeklyData
    .map((d, i) => ({ index: i, week: d.weekNumber, hitRate: d.hitRate }))
    .filter((d) => d.hitRate !== null)
    .map((d, i) => ({ ...d, index: i }))

  // Determine color based on score
  const scoreColor =
    metrics.score >= 85 ? '#22c55e' : metrics.score >= 70 ? '#eab308' : '#ef4444'

  return (
    <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] overflow-hidden h-[400px] flex flex-col">
      <div className="p-4 border-b border-[#2a2a2a]">
        <h2 className="text-lg font-semibold text-white">Performance Consistency</h2>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {/* Score Display */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold" style={{ color: scoreColor }}>
              {metrics.score}
            </span>
            <span className="text-lg text-[#888888]">/100</span>
            <span
              className="text-sm font-semibold ml-2"
              style={{ color: scoreColor }}
            >
              {metrics.score >= 85 ? 'Excellent' : metrics.score >= 70 ? 'Good' : 'Needs Work'}
            </span>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full bg-[#2a2a2a] rounded-full h-2 mb-4">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${metrics.score}%`,
                backgroundColor: scoreColor,
              }}
            />
          </div>
        </div>

        {/* Chart */}
        <div className="mb-4">
          <p className="text-sm text-[#888888] mb-2">Weekly Target Hit Rate</p>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis
                dataKey="index"
                stroke="#888888"
                tick={{ fontSize: 10 }}
                ticks={chartData.map((_, i) => i)}
                interval={0}
                tickFormatter={(i) => `W${chartData[i]?.week ?? ''}`}
                padding={{ left: 8, right: 8 }}
              />
              <YAxis stroke="#888888" tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#ffffff' }}
                labelFormatter={(label) => `W${chartData[Number(label)]?.week ?? label}`}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Hit Rate']}
              />
              <Line
                type="monotone"
                dataKey="hitRate"
                stroke={scoreColor}
                strokeWidth={2}
                dot={{ fill: scoreColor, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Insights */}
        {metrics.insights.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#888888] uppercase mb-1">Insights</p>
            {metrics.insights.map((insight, index) => (
              <p key={index} className="text-xs text-[#888888]">
                {insight}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
