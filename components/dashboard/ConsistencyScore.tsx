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
      <div className="card-glass p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-4 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Performance Consistency</h2>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  if (!metrics || metrics.weeklyData.length === 0) {
    return (
      <div className="card-glass card-accent-top p-6">
        <div className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }} />
        <h2 className="relative text-xs font-semibold uppercase tracking-wider text-muted mb-4 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Performance Consistency</h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted mb-2">Not enough data yet</p>
          <p className="text-sm text-secondary">Log workouts with targets to see consistency metrics</p>
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
    <div className="card-glass card-accent-top">
      <div
        className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }}
      />
      <div className="relative p-4 sm:p-6 border-b border-white/[0.06] bg-white/[0.015]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Performance Consistency</h2>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-2">
            <span
              className="text-4xl font-bold"
              style={{ color: scoreColor, textShadow: `0 0 20px ${scoreColor}40` }}
            >
              {metrics.score}
            </span>
            <span className="text-lg text-muted font-medium">/100</span>
            <span
              className="text-xs font-semibold uppercase tracking-wider ml-2 px-2 py-0.5 rounded-full"
              style={{ color: scoreColor, backgroundColor: `${scoreColor}15` }}
            >
              {metrics.score >= 85 ? 'Excellent' : metrics.score >= 70 ? 'Good' : 'Needs Work'}
            </span>
          </div>

          <div className="w-full bg-white/[0.08] rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${metrics.score}%`,
                backgroundColor: scoreColor,
                boxShadow: `0 0 10px ${scoreColor}40`,
              }}
            />
          </div>
        </div>

        {/* Chart */}
        <div className="mb-3">
          <p className="text-sm text-muted mb-2">Weekly Target Hit Rate</p>
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
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
                  backgroundColor: 'rgba(17,17,19,0.9)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  backdropFilter: 'blur(12px)',
                }}
                labelStyle={{ color: '#f5f5f5' }}
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
            <p className="text-xs font-semibold text-muted uppercase mb-1">Insights</p>
            {metrics.insights.map((insight, index) => (
              <p key={index} className="text-xs text-muted">
                {insight}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
