'use client'

import { useState, useEffect, useCallback } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import type { FriendRow } from '@/lib/friends'
import {
  createChallenge,
  acceptChallenge,
  declineChallenge,
  getChallenges,
  getChallengeProgress,
  finalizeExpiredChallenges,
  type ChallengeWithUsers,
  type ChallengeProgress,
  type ChallengeType,
} from '@/lib/challenges'

interface ChallengesSectionProps {
  friends: FriendRow[]
}

export default function ChallengesSection({ friends }: ChallengesSectionProps) {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [challenges, setChallenges] = useState<ChallengeWithUsers[]>([])
  const [progress, setProgress] = useState<Map<string, ChallengeProgress>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)

  // Create form state
  const [selectedFriend, setSelectedFriend] = useState('')
  const [challengeType, setChallengeType] = useState<ChallengeType>('workout_count')
  const [exerciseName, setExerciseName] = useState('')
  const [durationDays, setDurationDays] = useState(7)
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  const loadChallenges = useCallback(async () => {
    const list = await getChallenges()
    setChallenges(list)

    const active = list.filter(c => c.status === 'active')
    const progressMap = new Map<string, ChallengeProgress>()
    await Promise.all(
      active.map(async c => {
        const p = await getChallengeProgress(c)
        progressMap.set(c.id, p)
      })
    )
    setProgress(progressMap)
  }, [])

  useEffect(() => {
    const u = getCurrentUser()
    if (u) setUser(u)
    finalizeExpiredChallenges().then(() => loadChallenges()).finally(() => setLoading(false))
  }, [loadChallenges])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    if (!selectedFriend) { setCreateError('Select a friend'); return }
    if (challengeType === 'e1rm' && !exerciseName.trim()) { setCreateError('Enter an exercise name'); return }

    setCreating(true)
    const res = await createChallenge(selectedFriend, challengeType, durationDays, exerciseName.trim() || undefined)
    if (res.ok) {
      setShowCreate(false)
      setSelectedFriend('')
      setChallengeType('workout_count')
      setExerciseName('')
      setDurationDays(7)
      await loadChallenges()
    } else {
      setCreateError(res.error ?? 'Failed to create challenge')
    }
    setCreating(false)
  }

  const handleAccept = async (id: string) => {
    if (actingId) return
    setActingId(id)
    await acceptChallenge(id)
    await loadChallenges()
    setActingId(null)
  }

  const handleDecline = async (id: string) => {
    if (actingId) return
    setActingId(id)
    await declineChallenge(id)
    await loadChallenges()
    setActingId(null)
  }

  if (!user) return null

  const pendingReceived = challenges.filter(c => c.status === 'pending' && c.challenged_id === user.id)
  const pendingSent = challenges.filter(c => c.status === 'pending' && c.challenger_id === user.id)
  const active = challenges.filter(c => c.status === 'active')
  const completed = challenges.filter(c => c.status === 'completed').slice(0, 5)

  const typeLabel = (c: ChallengeWithUsers) =>
    c.challenge_type === 'workout_count' ? 'Most Workouts' : `Highest e1RM — ${c.exercise_name}`

  const opponentName = (c: ChallengeWithUsers) =>
    c.challenger_id === user.id ? c.challenged_username : c.challenger_username

  return (
    <section className="card-glass shadow-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Challenges</h2>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 text-sm btn-primary"
        >
          Challenge a Friend
        </button>
      </div>

      {loading && <p className="text-muted text-sm">Loading challenges...</p>}

      {/* Create challenge modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80" onClick={() => setShowCreate(false)}>
          <div className="modal-glass max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/[0.06] flex justify-between items-center">
              <h3 className="text-lg font-semibold text-foreground">New Challenge</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1 rounded text-muted hover:text-foreground hover:bg-white/[0.04]" aria-label="Close">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-foreground mb-1">Friend</label>
                <select
                  value={selectedFriend}
                  onChange={e => setSelectedFriend(e.target.value)}
                  className="w-full px-3 py-2 border border-white/[0.06] bg-white/[0.04] text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  <option value="">Select a friend</option>
                  {friends.map(f => (
                    <option key={f.user_id} value={f.user_id}>{f.username}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-foreground mb-1">Type</label>
                <select
                  value={challengeType}
                  onChange={e => setChallengeType(e.target.value as ChallengeType)}
                  className="w-full px-3 py-2 border border-white/[0.06] bg-white/[0.04] text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  <option value="workout_count">Most Workouts</option>
                  <option value="e1rm">Highest e1RM</option>
                </select>
              </div>

              {challengeType === 'e1rm' && (
                <div>
                  <label className="block text-sm text-foreground mb-1">Exercise</label>
                  <input
                    type="text"
                    value={exerciseName}
                    onChange={e => setExerciseName(e.target.value)}
                    placeholder="e.g. Bench Press"
                    className="w-full px-3 py-2 border border-white/[0.06] bg-white/[0.04] text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-foreground mb-1">Duration</label>
                <select
                  value={durationDays}
                  onChange={e => setDurationDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-white/[0.06] bg-white/[0.04] text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>

              {createError && <p className="text-sm text-red-400">{createError}</p>}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded border border-white/[0.06] text-foreground text-sm hover:bg-white/[0.04]">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="px-4 py-2 btn-primary disabled:opacity-50">
                  {creating ? 'Sending...' : 'Send Challenge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pending received */}
      {pendingReceived.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-muted mb-2">Incoming</h3>
          <div className="space-y-2">
            {pendingReceived.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-white/[0.04] rounded-lg p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium">{c.challenger_username}</p>
                  <p className="text-xs text-muted">{typeLabel(c)} · {c.duration_days} days</p>
                </div>
                <div className="flex gap-2 ml-2">
                  <button type="button" disabled={!!actingId} onClick={() => handleAccept(c.id)} className="px-3 py-1 rounded btn-primary text-xs disabled:opacity-50">Accept</button>
                  <button type="button" disabled={!!actingId} onClick={() => handleDecline(c.id)} className="px-3 py-1 rounded border border-white/[0.06] text-foreground text-xs hover:bg-white/[0.04] disabled:opacity-50">Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending sent */}
      {pendingSent.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-muted mb-2">Sent</h3>
          <div className="space-y-2">
            {pendingSent.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-white/[0.04] rounded-lg p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium">{c.challenged_username}</p>
                  <p className="text-xs text-muted">{typeLabel(c)} · {c.duration_days} days</p>
                </div>
                <span className="text-xs text-muted ml-2">Waiting...</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active challenges */}
      {active.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-muted mb-2">Active</h3>
          <div className="space-y-3">
            {active.map(c => {
              const p = progress.get(c.id)
              const isChallenger = c.challenger_id === user.id
              const yourScore = isChallenger ? (p?.challengerValue ?? 0) : (p?.challengedValue ?? 0)
              const theirScore = isChallenger ? (p?.challengedValue ?? 0) : (p?.challengerValue ?? 0)
              const maxScore = Math.max(yourScore, theirScore, 1)
              const daysLeft = Math.max(0, Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000))
              const unit = c.challenge_type === 'e1rm' ? 'lbs' : ''

              return (
                <div key={c.id} className="bg-white/[0.04] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-foreground text-sm font-medium">vs {opponentName(c)}</p>
                    <span className="text-xs text-muted">{daysLeft}d left</span>
                  </div>
                  <p className="text-xs text-muted mb-3">{typeLabel(c)}</p>

                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-foreground">You</span>
                        <span className="text-foreground font-medium">{yourScore} {unit}</span>
                      </div>
                      <div className="h-2 bg-[#252525] rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full transition-all" style={{ width: `${(yourScore / maxScore) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-muted">{opponentName(c)}</span>
                        <span className="text-muted font-medium">{theirScore} {unit}</span>
                      </div>
                      <div className="h-2 bg-[#252525] rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${(theirScore / maxScore) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Completed challenges */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted mb-2">Recent Results</h3>
          <div className="space-y-2">
            {completed.map(c => {
              const isWinner = c.winner_id === user.id
              const isTie = !c.winner_id
              return (
                <div key={c.id} className="flex items-center justify-between bg-white/[0.04] rounded-lg p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm">
                      vs {opponentName(c)} <span className="text-muted">· {typeLabel(c)}</span>
                    </p>
                  </div>
                  <span className={`text-xs font-semibold ml-2 ${isTie ? 'text-muted' : isWinner ? 'text-green-400' : 'text-red-400'}`}>
                    {isTie ? 'Tie' : isWinner ? 'Won' : 'Lost'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!loading && challenges.length === 0 && (
        <p className="text-muted text-sm">No challenges yet. Challenge a friend to get started!</p>
      )}
    </section>
  )
}
