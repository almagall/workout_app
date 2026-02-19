'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import type { FriendRow } from '@/lib/friends'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface CompareModalProps {
  friend: FriendRow
  onClose: () => void
}

interface UserStats {
  username: string
  e1rmHistory: { date: string; e1rm: number }[]
  bestE1rm: number
  bestWeight: number
  totalSessions: number
  trend: 'up' | 'down' | 'stable'
  currentE1rm: number
}

interface CompareData {
  commonExercises: string[]
  user?: UserStats
  friend?: UserStats
}

function trendArrow(t: 'up' | 'down' | 'stable') {
  if (t === 'up') return '↑'
  if (t === 'down') return '↓'
  return '→'
}

function trendColor(t: 'up' | 'down' | 'stable') {
  if (t === 'up') return 'text-green-400'
  if (t === 'down') return 'text-red-400'
  return 'text-muted'
}

function formatChartDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function CompareModal({ friend, onClose }: CompareModalProps) {
  const [data, setData] = useState<CompareData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedExercise, setSelectedExercise] = useState('')
  const [loadingExercise, setLoadingExercise] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) return

    setLoading(true)
    setError('')
    fetch(`/api/friends/compare?currentUserId=${encodeURIComponent(user.id)}&friendUserId=${encodeURIComponent(friend.user_id)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setData(d)
        if (d.commonExercises?.length) setSelectedExercise(d.commonExercises[0])
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [friend.user_id])

  useEffect(() => {
    if (!selectedExercise) return
    const user = getCurrentUser()
    if (!user) return

    setLoadingExercise(true)
    fetch(`/api/friends/compare?currentUserId=${encodeURIComponent(user.id)}&friendUserId=${encodeURIComponent(friend.user_id)}&exerciseName=${encodeURIComponent(selectedExercise)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) return
        setData(prev => prev ? { ...prev, user: d.user, friend: d.friend } : prev)
      })
      .finally(() => setLoadingExercise(false))
  }, [selectedExercise, friend.user_id])

  // Merge histories for the chart
  const chartData = (() => {
    if (!data?.user || !data?.friend) return []
    const dateMap = new Map<string, { date: string; you?: number; friend?: number }>()

    for (const pt of data.user.e1rmHistory) {
      const entry = dateMap.get(pt.date) ?? { date: pt.date }
      entry.you = pt.e1rm
      dateMap.set(pt.date, entry)
    }
    for (const pt of data.friend.e1rmHistory) {
      const entry = dateMap.get(pt.date) ?? { date: pt.date }
      entry.friend = pt.e1rm
      dateMap.set(pt.date, entry)
    }

    return [...dateMap.values()].sort((a, b) => a.date.localeCompare(b.date))
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-card max-w-2xl w-full max-h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-semibold text-foreground">Compare with {friend.username}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded text-muted hover:text-foreground hover:bg-elevated" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-4 overflow-auto max-h-[calc(85vh-4rem)]">
          {loading && <p className="text-muted text-sm">Loading...</p>}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {!loading && !error && data && (
            <>
              {data.commonExercises.length === 0 ? (
                <p className="text-muted text-sm">No exercises in common to compare.</p>
              ) : (
                <>
                  {/* Exercise picker */}
                  <div className="mb-5">
                    <label className="block text-sm text-foreground mb-1">Exercise</label>
                    <select
                      value={selectedExercise}
                      onChange={e => setSelectedExercise(e.target.value)}
                      className="w-full px-3 py-2 border border-border bg-elevated text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                    >
                      {data.commonExercises.map(ex => (
                        <option key={ex} value={ex}>{ex}</option>
                      ))}
                    </select>
                  </div>

                  {loadingExercise && <p className="text-muted text-sm mb-4">Loading stats...</p>}

                  {!loadingExercise && data.user && data.friend && (
                    <>
                      {/* Side-by-side stat cards */}
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <StatCard label="You" stats={data.user} />
                        <StatCard label={friend.username} stats={data.friend} />
                      </div>

                      {/* Chart */}
                      {chartData.length > 1 ? (
                        <div className="bg-elevated rounded-lg p-3 border border-border">
                          <p className="text-sm text-foreground font-medium mb-3">e1RM Over Time</p>
                          <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                              <XAxis
                                dataKey="date"
                                tickFormatter={formatChartDate}
                                stroke="#888888"
                                tick={{ fontSize: 11, fill: '#888888' }}
                              />
                              <YAxis
                                stroke="#888888"
                                tick={{ fontSize: 11, fill: '#888888' }}
                                domain={['auto', 'auto']}
                                unit=" lb"
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#111111',
                                  border: '1px solid #2a2a2a',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                }}
                                labelFormatter={formatChartDate}
                                formatter={(value: number, name: string) => [`${value} lbs`, name === 'you' ? 'You' : friend.username]}
                              />
                              <Line type="monotone" dataKey="you" stroke="#ffffff" strokeWidth={2} dot={false} connectNulls />
                              <Line type="monotone" dataKey="friend" stroke="#fbbf24" strokeWidth={2} dot={false} connectNulls />
                            </LineChart>
                          </ResponsiveContainer>
                          <div className="flex justify-center gap-6 mt-2">
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-0.5 bg-white rounded-full inline-block" />
                              <span className="text-xs text-muted">You</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-0.5 bg-amber-400 rounded-full inline-block" />
                              <span className="text-xs text-muted">{friend.username}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted text-sm text-center">Not enough data to chart yet.</p>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, stats }: { label: string; stats: UserStats }) {
  return (
    <div className="bg-elevated rounded-lg p-3 border border-border">
      <p className="text-sm font-medium text-foreground mb-2 truncate">{label}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted">Current e1RM</span>
          <span className="text-foreground font-medium">{stats.currentE1rm || '—'} lbs</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Best e1RM</span>
          <span className="text-amber-300 font-medium">{stats.bestE1rm || '—'} lbs</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Best Weight</span>
          <span className="text-foreground">{stats.bestWeight || '—'} lbs</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Sessions</span>
          <span className="text-foreground">{stats.totalSessions}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Trend</span>
          <span className={`font-medium ${trendColor(stats.trend)}`}>{trendArrow(stats.trend)} {stats.trend}</span>
        </div>
      </div>
    </div>
  )
}
