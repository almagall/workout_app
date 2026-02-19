'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-simple'
import type { LeaderboardEntry, LeaderboardData } from '@/app/api/leaderboards/route'

function getMedalEmoji(rank: number): string {
  switch (rank) {
    case 1: return '🥇'
    case 2: return '🥈'
    case 3: return '🥉'
    default: return ''
  }
}

function LeaderboardTable({
  entries,
  currentUserId,
  title,
  emptyMessage,
}: {
  entries: LeaderboardEntry[]
  currentUserId: string
  title: string
  emptyMessage: string
}) {
  // Filter out entries with 0 count for display
  const activeEntries = entries.filter((e) => e.count > 0)

  return (
    <div className="card-glass card-accent-top">
      <div className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }} />
      <div className="relative p-4 border-b border-white/[0.06]">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-4">
        {activeEntries.length === 0 ? (
          <p className="text-muted text-sm text-center py-4">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {activeEntries.map((entry) => {
              const rank = entry.rank
              const isCurrentUser = entry.user_id === currentUserId
              console.log('🎯 Rendering entry:', { username: entry.username, count: entry.count, rank })
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    isCurrentUser ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-card'
                  }`}
                >
                  <div className="w-8 text-center">
                    {rank <= 3 ? (
                      <span className="text-lg">{getMedalEmoji(rank)}</span>
                    ) : (
                      <span className="text-muted text-sm font-medium">#{rank}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profile/${encodeURIComponent(entry.username)}`}
                      className={`font-medium hover:underline ${isCurrentUser ? 'text-amber-400' : 'text-foreground'}`}
                    >
                      {entry.username}
                      {isCurrentUser && <span className="text-xs ml-1">(you)</span>}
                    </Link>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold ${rank === 1 ? 'text-amber-400' : 'text-foreground'}`}>
                      {entry.count}
                    </span>
                    <span className="text-muted text-sm ml-1">
                      workout{entry.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function LeaderboardsPage() {
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null)
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadLeaderboards() {
      const currentUser = getCurrentUser()
      if (!currentUser) {
        window.location.href = '/get-started'
        return
      }
      setUser(currentUser)

      try {
        const res = await fetch(`/api/leaderboards?currentUserId=${encodeURIComponent(currentUser.id)}`)
        if (!res.ok) throw new Error('Failed to load leaderboards')
        const result = await res.json()
        setData(result)
      } catch (e) {
        setError('Unable to load leaderboards')
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    loadLeaderboards()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted">Loading leaderboards...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Leaderboards</h1>
        <p className="text-muted mt-1">See how you stack up against your friends</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LeaderboardTable
            entries={data.weekly_workouts}
            currentUserId={user.id}
            title="This Week"
            emptyMessage="No workouts logged this week"
          />
          <LeaderboardTable
            entries={data.monthly_workouts}
            currentUserId={user.id}
            title="This Month"
            emptyMessage="No workouts logged this month"
          />
        </div>
      )}

      {data && data.weekly_workouts.length <= 1 && (
        <div className="mt-6 text-center">
          <p className="text-muted mb-2">Leaderboards are more fun with friends!</p>
          <Link href="/friends" className="text-amber-400 hover:text-amber-300 font-medium">
            Add Friends
          </Link>
        </div>
      )}
    </div>
  )
}
