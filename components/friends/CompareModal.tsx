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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="modal-glass max-w-2xl w-full max-h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #2563eb, #06b6d4, #2563eb)' }} />
        <div className="p-5 border-b border-white/[0.06] flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/15 flex items-center justify-center text-xs font-semibold text-accent-light flex-shrink-0">
            {friend.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground">Compare with {friend.username}</h3>
            <p className="text-xs text-muted">Head-to-head lift comparison</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 overflow-auto max-h-[calc(85vh-5rem)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          )}
          {error && <p className="text-red-400 text-sm text-center py-8">{error}</p>}

          {!loading && !error && data && (
            <>
              {data.commonExercises.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted text-sm">No exercises in common to compare</p>
                </div>
              ) : (
                <>
                  <div className="mb-5">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Exercise</label>
                    <select
                      value={selectedExercise}
                      onChange={e => setSelectedExercise(e.target.value)}
                      className="w-full px-3 py-2.5 border border-white/[0.06] bg-white/[0.03] text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all"
                    >
                      {data.commonExercises.map(ex => (
                        <option key={ex} value={ex}>{ex}</option>
                      ))}
                    </select>
                  </div>

                  {loadingExercise && (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                    </div>
                  )}

                  {!loadingExercise && data.user && data.friend && (
                    <>
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <StatCard label="You" stats={data.user} isUser />
                        <StatCard label={friend.username} stats={data.friend} />
                      </div>

                      {chartData.length > 1 ? (
                        <div className="rounded-xl p-4 bg-white/[0.02] border border-white/[0.04]">
                          <p className="text-xs font-medium text-foreground mb-3">e1RM Over Time</p>
                          <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                              <XAxis
                                dataKey="date"
                                tickFormatter={formatChartDate}
                                stroke="rgba(255,255,255,0.1)"
                                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                              />
                              <YAxis
                                stroke="rgba(255,255,255,0.1)"
                                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                                domain={['auto', 'auto']}
                                unit=" lb"
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'rgba(17,17,19,0.96)',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  borderRadius: '10px',
                                  fontSize: '12px',
                                  backdropFilter: 'blur(12px)',
                                }}
                                labelFormatter={formatChartDate}
                                formatter={(value: number, name: string) => [`${value} lbs`, name === 'you' ? 'You' : friend.username]}
                              />
                              <Line type="monotone" dataKey="you" stroke="#2563eb" strokeWidth={2} dot={false} connectNulls />
                              <Line type="monotone" dataKey="friend" stroke="#fbbf24" strokeWidth={2} dot={false} connectNulls />
                            </LineChart>
                          </ResponsiveContainer>
                          <div className="flex justify-center gap-6 mt-2">
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-0.5 bg-accent rounded-full inline-block" />
                              <span className="text-[10px] text-muted">You</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-0.5 bg-amber-400 rounded-full inline-block" />
                              <span className="text-[10px] text-muted">{friend.username}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted text-sm text-center py-4">Not enough data to chart yet.</p>
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

function StatCard({ label, stats, isUser }: { label: string; stats: UserStats; isUser?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${isUser ? 'bg-accent/[0.03] border-accent/10' : 'bg-white/[0.02] border-white/[0.04]'}`}>
      <p className={`text-sm font-semibold mb-3 truncate ${isUser ? 'text-accent-light' : 'text-foreground'}`}>{label}</p>
      <div className="space-y-2.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted">Current e1RM</span>
          <span className="text-foreground font-bold tabular-nums">{stats.currentE1rm || '—'} lbs</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Best e1RM</span>
          <span className="text-amber-400 font-bold tabular-nums">{stats.bestE1rm || '—'} lbs</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Best Weight</span>
          <span className="text-foreground tabular-nums">{stats.bestWeight || '—'} lbs</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Sessions</span>
          <span className="text-foreground tabular-nums">{stats.totalSessions}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Trend</span>
          <span className={`font-bold ${trendColor(stats.trend)}`}>{trendArrow(stats.trend)} {stats.trend}</span>
        </div>
      </div>
    </div>
  )
}
