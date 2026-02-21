'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'

interface LeaderboardEntry {
  userId: string
  username: string
  workoutCount: number
  currentStreak: number
  isCurrentUser: boolean
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const RANK_STYLES = [
  { border: 'border-amber-500/30', bg: 'bg-amber-500/5', rank: 'text-amber-400' },
  { border: 'border-slate-500/20', bg: 'bg-white/[0.015]', rank: 'text-slate-400' },
  { border: 'border-amber-700/20', bg: 'bg-white/[0.01]', rank: 'text-amber-600' },
]

export default function WeeklyLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [weekStart, setWeekStart] = useState('')
  const [weekEnd, setWeekEnd] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) return
    fetch(`/api/friends/leaderboard?currentUserId=${encodeURIComponent(user.id)}`)
      .then(r => r.json())
      .then(data => {
        setLeaderboard(data.leaderboard ?? [])
        setWeekStart(data.weekStart ?? '')
        setWeekEnd(data.weekEnd ?? '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const hasFriends = leaderboard.length > 1

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-0.5 h-4 rounded-full bg-accent/50" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">This Week</h2>
        </div>
        {weekStart && weekEnd && (
          <span className="text-[11px] text-muted/60 tabular-nums">
            {formatDate(weekStart)} – {formatDate(weekEnd)}
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.06] overflow-hidden relative" style={{ background: 'linear-gradient(180deg, rgba(19,19,22,0.95), rgba(13,13,16,0.98))', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : !hasFriends ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <p className="text-muted text-sm">Add friends to see the leaderboard</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {leaderboard.map((entry, idx) => {
              const rankStyle = RANK_STYLES[idx] ?? { border: 'border-white/[0.04]', bg: 'bg-white/[0.005]', rank: 'text-muted/40' }
              const maxCount = Math.max(...leaderboard.map(e => e.workoutCount), 1)

              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-3 px-4 py-3 border-l-2 ${rankStyle.border} ${rankStyle.bg} ${entry.isCurrentUser ? 'relative' : ''}`}
                >
                  {/* Rank */}
                  <span className={`text-sm font-bold tabular-nums w-5 text-center shrink-0 ${rankStyle.rank}`}>
                    {idx + 1}
                  </span>

                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${entry.isCurrentUser ? 'bg-accent/15 text-accent-light border border-accent/20' : 'bg-white/[0.06] text-foreground/70 border border-white/[0.06]'}`}>
                    {entry.username.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <p className={`text-sm font-medium truncate ${entry.isCurrentUser ? 'text-foreground' : 'text-secondary'}`}>
                        {entry.isCurrentUser ? 'You' : entry.username}
                      </p>
                      {entry.currentStreak > 0 && (
                        <span className="shrink-0 flex items-center gap-0.5 text-[10px] text-amber-400/80 tabular-nums">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 23a7.5 7.5 0 01-5.138-12.963C8.204 8.774 11.5 6.5 11 1.5c6 4 9 8 3 14 1 0 2.5 0 5-2.47.27.68.5 1.43.5 2.47a7.5 7.5 0 01-7.5 7.5z" /></svg>
                          {entry.currentStreak}w
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          idx === 0 ? 'bg-amber-400' : entry.isCurrentUser ? 'bg-accent' : 'bg-white/25'
                        }`}
                        style={{ width: `${(entry.workoutCount / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Count */}
                  <div className="shrink-0 text-right">
                    <span className={`text-base font-bold tabular-nums ${idx === 0 ? 'text-amber-400' : entry.isCurrentUser ? 'text-foreground' : 'text-muted'}`}>
                      {entry.workoutCount}
                    </span>
                    <p className="text-[10px] text-muted/50 leading-none mt-0.5">
                      workout{entry.workoutCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
