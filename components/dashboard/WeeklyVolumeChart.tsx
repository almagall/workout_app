'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts'
import { getWeeklyVolume, type WeeklyVolumeData } from '@/lib/performance-analytics'

function formatVolume(v: number): string {
  if (v >= 1000) return `${Math.round(v / 1000)}k`
  return String(Math.round(v))
}

function generateInsight(data: WeeklyVolumeData[], avg: number): { text: string; tone: 'up' | 'down' | 'neutral' } {
  if (data.length < 2) return { text: 'Log more weeks to see trends.', tone: 'neutral' }

  const latest = data[data.length - 1].volume
  const previous = data[data.length - 2].volume
  const wowChange = previous > 0 ? Math.round(((latest - previous) / previous) * 100) : 0

  // 4-week trend: compare recent half vs earlier half
  if (data.length >= 4) {
    const mid = Math.floor(data.length / 2)
    const recentAvg = data.slice(mid).reduce((s, d) => s + d.volume, 0) / data.slice(mid).length
    const earlierAvg = data.slice(0, mid).reduce((s, d) => s + d.volume, 0) / data.slice(0, mid).length
    const trendPct = earlierAvg > 0 ? Math.round(((recentAvg - earlierAvg) / earlierAvg) * 100) : 0

    if (Math.abs(trendPct) >= 10) {
      const dir = trendPct > 0 ? 'up' : 'down'
      const label = trendPct > 0 ? 'Trending up' : 'Trending down'
      return { text: `${label} ${Math.abs(trendPct)}% over ${data.length} weeks. Last week ${wowChange >= 0 ? '+' : ''}${wowChange}% WoW.`, tone: dir }
    }
  }

  // Fallback to week-over-week
  if (Math.abs(wowChange) >= 5) {
    const dir = wowChange > 0 ? 'up' : 'down'
    return { text: `${wowChange >= 0 ? '+' : ''}${wowChange}% from last week. ${latest > avg ? 'Above' : 'Below'} your average.`, tone: dir }
  }

  return { text: `Steady volume around ${formatVolume(avg)} lbs/week.`, tone: 'neutral' }
}

export default function WeeklyVolumeChart() {
  const [data, setData] = useState<WeeklyVolumeData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getWeeklyVolume(8).then(d => {
      setData(d)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="card-glass">
        <div className="p-4 sm:p-6 border-b border-white/[0.06] bg-white/[0.015]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Weekly Volume</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="card-glass">
        <div className="p-4 sm:p-6 border-b border-white/[0.06] bg-white/[0.015]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Weekly Volume</h2>
        </div>
        <div className="flex items-center justify-center py-12 px-4">
          <p className="text-muted text-sm text-center">Not enough data yet. Log workouts to see your weekly volume trend.</p>
        </div>
      </div>
    )
  }

  const avg = Math.round(data.reduce((s, d) => s + d.volume, 0) / data.length)
  const insight = generateInsight(data, avg)

  const chartData = data.map(d => ({
    label: `W${d.weekNumber}`,
    volume: Math.round(d.volume),
    aboveAvg: d.volume >= avg,
  }))

  const insightColor =
    insight.tone === 'up' ? 'text-green-400' :
    insight.tone === 'down' ? 'text-amber-400' :
    'text-muted'

  return (
    <div className="card-glass">
      <div className="p-4 sm:p-6 border-b border-white/[0.06] bg-white/[0.015]">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Weekly Volume</h2>
          <span className="text-xs text-muted">Avg {formatVolume(avg)} lbs</span>
        </div>
        <p className={`text-xs ${insightColor} leading-snug`}>{insight.text}</p>
      </div>
      <div className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#888888"
              tick={{ fontSize: 11, fill: '#888888' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              tick={{ fontSize: 11, fill: '#888888' }}
              tickFormatter={formatVolume}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(17,17,19,0.9)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#f5f5f5',
                backdropFilter: 'blur(12px)',
              }}
              labelStyle={{ color: '#888888' }}
              itemStyle={{ color: '#f5f5f5' }}
              formatter={(value: number) => {
                const pct = avg > 0 ? Math.round(((value - avg) / avg) * 100) : 0
                const label = pct >= 0 ? `+${pct}%` : `${pct}%`
                return [`${value.toLocaleString()} lbs (${label} vs avg)`, 'Volume']
              }}
              labelFormatter={(label: string) => `Week ${label.replace('W', '')}`}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <ReferenceLine
              y={avg}
              stroke="#555555"
              strokeDasharray="4 4"
              label={{ value: 'avg', position: 'right', fill: '#555555', fontSize: 10 }}
            />
            <Bar dataKey="volume" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.aboveAvg ? '#3b82f6' : 'rgba(255,255,255,0.08)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
