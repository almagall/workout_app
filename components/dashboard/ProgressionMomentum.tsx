'use client'

import { useState, useEffect } from 'react'
import { getAllProgressionTrends } from '@/lib/progression-analytics'
import type { ProgressionTrend } from '@/types/profile'

function TrendIcon({ trend, color }: { trend: ProgressionTrend['trend']; color: string }) {
  const icons: Record<ProgressionTrend['trend'], React.ReactNode> = {
    accelerating: (
      <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
        <path d="M8 2L8 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M5 5L8 2L11 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 9L8 6L11 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 13H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      </svg>
    ),
    progressing: (
      <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
        <path d="M8 13L8 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M5 7L8 4L11 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    maintaining: (
      <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
        <path d="M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 5L13 8L10 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    plateaued: (
      <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
        <path d="M8 3L8 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M5 9L8 12L11 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 3H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      </svg>
    ),
    regressing: (
      <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
        <path d="M8 2L8 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M5 6L8 9L11 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 11L8 14L11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 2H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      </svg>
    ),
  }

  return (
    <span
      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
    >
      {icons[trend]}
    </span>
  )
}

const TREND_LABELS: Record<ProgressionTrend['trend'], string> = {
  accelerating: 'Accelerating',
  progressing: 'Progressing',
  maintaining: 'Maintaining',
  plateaued: 'Plateaued',
  regressing: 'Regressing',
}

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
      <div className="card-glass card-accent-top p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-4 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Progression Momentum</h2>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  if (trends.length === 0) {
    return (
      <div className="card-glass card-accent-top p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-4 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Progression Momentum</h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted mb-2">Not enough data yet</p>
          <p className="text-sm text-secondary">Log at least 4 workouts to see progression trends</p>
        </div>
      </div>
    )
  }

  const shown = trends.slice(0, 6)

  return (
    <div className="card-glass card-accent-top">
      <div
        className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }}
      />
      <div className="relative p-4 sm:p-6 border-b border-white/[0.06] bg-white/[0.015]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Progression Momentum</h2>
      </div>

      <div className="p-4 sm:p-6">
        <div className="space-y-2">
          {shown.map((trend, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-white/[0.05] bg-white/[0.025] hover:bg-white/[0.04] transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <TrendIcon trend={trend.trend} color={trend.color} />
                <span className="text-foreground font-medium text-sm truncate">{trend.exerciseName}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: trend.color, backgroundColor: `${trend.color}18` }}
                >
                  {TREND_LABELS[trend.trend]}
                </span>
                <span
                  className="text-sm font-bold tabular-nums w-14 text-right"
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
