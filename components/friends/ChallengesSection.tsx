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
import {
  createGroupChallenge,
  acceptGroupChallenge,
  declineGroupChallenge,
  getGroupChallenges,
  getGroupChallengeProgress,
  finalizeGroupChallenges,
  type GroupChallengeWithMembers,
  type MemberProgress,
  type GroupChallengeType,
} from '@/lib/group-challenges'

const CHALLENGE_TEMPLATES = [
  { name: 'Weekly Warrior', type: 'workout_count' as const, duration: 7, description: 'Most workouts in a week' },
  { name: 'Volume King', type: 'total_volume' as const, duration: 7, description: 'Highest total volume in a week' },
  { name: 'Iron Consistency', type: 'consistency' as const, duration: 30, description: 'Most training days in a month' },
  { name: 'Bench Press Battle', type: 'e1rm' as const, duration: 14, exercise: 'Barbell Bench Press', description: 'Highest bench e1RM in 2 weeks' },
  { name: 'Squat Showdown', type: 'e1rm' as const, duration: 14, exercise: 'Barbell Back Squat', description: 'Highest squat e1RM in 2 weeks' },
  { name: 'Deadlift Duel', type: 'e1rm' as const, duration: 14, exercise: 'Deadlift', description: 'Highest deadlift e1RM in 2 weeks' },
]

const TYPE_LABELS: Record<string, string> = {
  workout_count: 'Most Workouts',
  e1rm: 'Highest e1RM',
  total_volume: 'Most Volume (lbs)',
  consistency: 'Most Training Days',
}

const TYPE_UNITS: Record<string, string> = {
  workout_count: '',
  e1rm: 'lbs',
  total_volume: 'lbs',
  consistency: 'days',
}

interface ChallengesSectionProps {
  friends: FriendRow[]
}

export default function ChallengesSection({ friends }: ChallengesSectionProps) {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [tab, setTab] = useState<'1v1' | 'group'>('1v1')

  const [challenges, setChallenges] = useState<ChallengeWithUsers[]>([])
  const [progress, setProgress] = useState<Map<string, ChallengeProgress>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)

  const [groupChallenges, setGroupChallenges] = useState<GroupChallengeWithMembers[]>([])
  const [groupProgress, setGroupProgress] = useState<Map<string, MemberProgress[]>>(new Map())
  const [showGroupCreate, setShowGroupCreate] = useState(false)

  const [selectedFriend, setSelectedFriend] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [challengeType, setChallengeType] = useState<ChallengeType>('workout_count')
  const [exerciseName, setExerciseName] = useState('')
  const [durationDays, setDurationDays] = useState(7)
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  const loadChallenges = useCallback(async () => {
    const [list, groupList] = await Promise.all([getChallenges(), getGroupChallenges()])
    setChallenges(list)
    setGroupChallenges(groupList)

    const active1v1 = list.filter(c => c.status === 'active')
    const progressMap = new Map<string, ChallengeProgress>()
    await Promise.all(active1v1.map(async c => {
      const p = await getChallengeProgress(c)
      progressMap.set(c.id, p)
    }))
    setProgress(progressMap)

    const activeGroup = groupList.filter(c => c.status === 'active')
    const gProgressMap = new Map<string, MemberProgress[]>()
    await Promise.all(activeGroup.map(async c => {
      const p = await getGroupChallengeProgress(c, c.members)
      gProgressMap.set(c.id, p)
    }))
    setGroupProgress(gProgressMap)
  }, [])

  useEffect(() => {
    const u = getCurrentUser()
    if (u) setUser(u)
    Promise.all([finalizeExpiredChallenges(), finalizeGroupChallenges()])
      .then(() => loadChallenges())
      .finally(() => setLoading(false))
  }, [loadChallenges])

  const handleCreate1v1 = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    if (!selectedFriend) { setCreateError('Select a friend'); return }
    if (challengeType === 'e1rm' && !exerciseName.trim()) { setCreateError('Enter an exercise name'); return }

    setCreating(true)
    const res = await createChallenge(selectedFriend, challengeType, durationDays, exerciseName.trim() || undefined)
    if (res.ok) {
      setShowCreate(false)
      resetForm()
      await loadChallenges()
    } else {
      setCreateError(res.error ?? 'Failed to create challenge')
    }
    setCreating(false)
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    if (selectedFriends.length < 2) { setCreateError('Select at least 2 friends'); return }
    if (challengeType === 'e1rm' && !exerciseName.trim()) { setCreateError('Enter an exercise name'); return }

    setCreating(true)
    const res = await createGroupChallenge(selectedFriends, challengeType as GroupChallengeType, durationDays, exerciseName.trim() || undefined)
    if (res.ok) {
      setShowGroupCreate(false)
      resetForm()
      await loadChallenges()
    } else {
      setCreateError(res.error ?? 'Failed to create group challenge')
    }
    setCreating(false)
  }

  const handleQuickStart = async (template: typeof CHALLENGE_TEMPLATES[0], friendId: string) => {
    setCreating(true)
    const res = await createChallenge(friendId, template.type, template.duration, template.exercise)
    if (res.ok) await loadChallenges()
    setCreating(false)
  }

  const resetForm = () => {
    setSelectedFriend('')
    setSelectedFriends([])
    setChallengeType('workout_count')
    setExerciseName('')
    setDurationDays(7)
    setCreateError('')
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

  const handleGroupAccept = async (id: string) => {
    if (actingId) return
    setActingId(id)
    await acceptGroupChallenge(id)
    await loadChallenges()
    setActingId(null)
  }

  const handleGroupDecline = async (id: string) => {
    if (actingId) return
    setActingId(id)
    await declineGroupChallenge(id)
    await loadChallenges()
    setActingId(null)
  }

  if (!user) return null

  const typeLabel = (c: { challenge_type: string; exercise_name?: string | null }) =>
    c.challenge_type === 'e1rm' ? `Highest e1RM — ${c.exercise_name}` : TYPE_LABELS[c.challenge_type] ?? c.challenge_type

  const opponentName = (c: ChallengeWithUsers) =>
    c.challenger_id === user.id ? c.challenged_username : c.challenger_username

  const pendingReceived = challenges.filter(c => c.status === 'pending' && c.challenged_id === user.id)
  const pendingSent = challenges.filter(c => c.status === 'pending' && c.challenger_id === user.id)
  const active = challenges.filter(c => c.status === 'active')
  const completed = challenges.filter(c => c.status === 'completed').slice(0, 5)

  const pendingGroupReceived = groupChallenges.filter(c => c.status === 'pending' && c.members.some(m => m.user_id === user.id && m.status === 'invited'))
  const activeGroup = groupChallenges.filter(c => c.status === 'active')
  const completedGroup = groupChallenges.filter(c => c.status === 'completed').slice(0, 5)

  const renderCreateModal = (isGroup: boolean) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => isGroup ? setShowGroupCreate(false) : setShowCreate(false)}>
      <div className="modal-glass max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #2563eb, #06b6d4, #2563eb)' }} />
        <div className="p-5 border-b border-white/[0.06] flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{isGroup ? 'New Group Challenge' : 'New Challenge'}</h3>
            <p className="text-xs text-muted mt-0.5">{isGroup ? 'Compete with multiple friends' : 'Challenge a friend head-to-head'}</p>
          </div>
          <button type="button" onClick={() => isGroup ? setShowGroupCreate(false) : setShowCreate(false)} className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {!isGroup && friends.length > 0 && (
          <div className="p-5 border-b border-white/[0.04]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-3">Quick Start</p>
            <div className="grid grid-cols-2 gap-2">
              {CHALLENGE_TEMPLATES.slice(0, 4).map(t => (
                <button
                  key={t.name}
                  type="button"
                  disabled={creating || !selectedFriend}
                  onClick={() => selectedFriend && handleQuickStart(t, selectedFriend)}
                  className="text-left p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-accent/15 transition-all disabled:opacity-30 group"
                >
                  <p className="text-xs font-medium text-foreground group-hover:text-accent-light transition-colors">{t.name}</p>
                  <p className="text-[10px] text-muted mt-0.5 leading-relaxed">{t.description}</p>
                </button>
              ))}
            </div>
            {!selectedFriend && <p className="text-[10px] text-muted mt-2">Select a friend below to use quick-start</p>}
          </div>
        )}

        <form onSubmit={isGroup ? handleCreateGroup : handleCreate1v1} className="p-5 space-y-4">
          {isGroup ? (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">Friends (select 2+)</label>
              <div className="space-y-1 max-h-40 overflow-y-auto rounded-xl border border-white/[0.06] p-1">
                {friends.map(f => (
                  <label key={f.user_id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedFriends.includes(f.user_id)}
                      onChange={e => {
                        if (e.target.checked) setSelectedFriends(prev => [...prev, f.user_id])
                        else setSelectedFriends(prev => prev.filter(id => id !== f.user_id))
                      }}
                      className="accent-blue-500 rounded"
                    />
                    <span className="text-sm text-foreground">{f.username}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">Friend</label>
              <select
                value={selectedFriend}
                onChange={e => setSelectedFriend(e.target.value)}
                className="w-full px-3 py-2.5 border border-white/[0.06] bg-white/[0.03] text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all"
              >
                <option value="">Select a friend</option>
                {friends.map(f => (
                  <option key={f.user_id} value={f.user_id}>{f.username}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">Type</label>
            <select
              value={challengeType}
              onChange={e => setChallengeType(e.target.value as ChallengeType)}
              className="w-full px-3 py-2.5 border border-white/[0.06] bg-white/[0.03] text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all"
            >
              <option value="workout_count">Most Workouts</option>
              <option value="e1rm">Highest e1RM</option>
              <option value="total_volume">Most Volume (lbs)</option>
              <option value="consistency">Most Training Days</option>
            </select>
          </div>

          {challengeType === 'e1rm' && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">Exercise</label>
              <input
                type="text"
                value={exerciseName}
                onChange={e => setExerciseName(e.target.value)}
                placeholder="e.g. Barbell Bench Press"
                className="w-full px-3 py-2.5 border border-white/[0.06] bg-white/[0.03] text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all placeholder:text-muted/50"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">Duration</label>
            <select
              value={durationDays}
              onChange={e => setDurationDays(Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-white/[0.06] bg-white/[0.03] text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>

          {createError && (
            <p className="text-sm text-red-400 flex items-center gap-1.5">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {createError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { isGroup ? setShowGroupCreate(false) : setShowCreate(false); resetForm() }} className="px-4 py-2 rounded-lg border border-white/[0.06] text-foreground text-sm hover:bg-white/[0.04] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={creating} className="btn-primary text-sm disabled:opacity-50">
              {creating ? 'Sending...' : 'Send Challenge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <section className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-0.5 h-4 rounded-full bg-accent/50" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Challenges</h2>
        </div>
        <button
          type="button"
          onClick={() => tab === 'group' ? setShowGroupCreate(true) : setShowCreate(true)}
          className="btn-primary text-xs px-3 py-1.5"
        >
          {tab === 'group' ? 'Group Challenge' : 'Challenge'}
        </button>
      </div>

      <div className="rounded-2xl border border-white/[0.06] overflow-hidden relative" style={{ background: 'linear-gradient(180deg, rgba(19,19,22,0.95), rgba(13,13,16,0.98))', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.05), transparent 70%)' }} />

        {/* Tab bar */}
        <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-1">
          <button
            onClick={() => setTab('1v1')}
            className={`px-4 py-1.5 text-xs rounded-lg font-medium transition-all ${tab === '1v1' ? 'bg-accent/15 text-accent-light border border-accent/20' : 'text-muted hover:text-foreground hover:bg-white/[0.03]'}`}
          >
            1v1
          </button>
          <button
            onClick={() => setTab('group')}
            className={`px-4 py-1.5 text-xs rounded-lg font-medium transition-all ${tab === 'group' ? 'bg-accent/15 text-accent-light border border-accent/20' : 'text-muted hover:text-foreground hover:bg-white/[0.03]'}`}
          >
            Group
          </button>
        </div>

        <div className="p-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          )}

          {showCreate && renderCreateModal(false)}
          {showGroupCreate && renderCreateModal(true)}

          {/* 1v1 tab */}
          {tab === '1v1' && !loading && (
            <>
              {pendingReceived.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2.5">Incoming</p>
                  <div className="space-y-2">
                    {pendingReceived.map(c => (
                      <div key={c.id} className="flex items-center justify-between rounded-xl p-3.5 bg-accent/[0.03] border border-accent/10">
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground text-sm font-medium">{c.challenger_username}</p>
                          <p className="text-[11px] text-muted">{typeLabel(c)} · {c.duration_days} days</p>
                        </div>
                        <div className="flex gap-2 ml-2">
                          <button type="button" disabled={!!actingId} onClick={() => handleAccept(c.id)} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">Accept</button>
                          <button type="button" disabled={!!actingId} onClick={() => handleDecline(c.id)} className="px-3 py-1.5 rounded-lg border border-white/[0.06] text-muted text-xs hover:text-foreground hover:bg-white/[0.04] transition-colors disabled:opacity-50">Decline</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingSent.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2.5">Sent</p>
                  <div className="space-y-2">
                    {pendingSent.map(c => (
                      <div key={c.id} className="flex items-center justify-between rounded-xl p-3.5 bg-white/[0.02] border border-white/[0.04]">
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground text-sm font-medium">{c.challenged_username}</p>
                          <p className="text-[11px] text-muted">{typeLabel(c)} · {c.duration_days} days</p>
                        </div>
                        <span className="text-[11px] text-muted/60 ml-2">Waiting...</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {active.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2.5">Active</p>
                  <div className="space-y-3">
                    {active.map(c => {
                      const p = progress.get(c.id)
                      const isChallenger = c.challenger_id === user.id
                      const yourScore = isChallenger ? (p?.challengerValue ?? 0) : (p?.challengedValue ?? 0)
                      const theirScore = isChallenger ? (p?.challengedValue ?? 0) : (p?.challengerValue ?? 0)
                      const maxScore = Math.max(yourScore, theirScore, 1)
                      const daysLeft = Math.max(0, Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000))
                      const unit = TYPE_UNITS[c.challenge_type] ?? ''
                      const isWinning = yourScore > theirScore

                      return (
                        <div key={c.id} className="rounded-xl p-4 bg-white/[0.02] border border-white/[0.04]">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-foreground text-sm font-medium">vs {opponentName(c)}</p>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.04] text-muted tabular-nums">{daysLeft}d left</span>
                          </div>
                          <p className="text-[11px] text-muted mb-3.5">{typeLabel(c)}</p>
                          <div className="space-y-2.5">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-foreground font-medium">You</span>
                                <span className={`font-bold tabular-nums ${isWinning ? 'text-accent-light' : 'text-foreground'}`}>{yourScore.toLocaleString()} {unit}</span>
                              </div>
                              <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${isWinning ? 'bg-accent' : 'bg-white/60'}`} style={{ width: `${(yourScore / maxScore) * 100}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted">{opponentName(c)}</span>
                                <span className={`font-bold tabular-nums ${!isWinning && theirScore > yourScore ? 'text-amber-400' : 'text-muted'}`}>{theirScore.toLocaleString()} {unit}</span>
                              </div>
                              <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                                <div className="h-full bg-amber-400/70 rounded-full transition-all duration-500" style={{ width: `${(theirScore / maxScore) * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {completed.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2.5">Recent Results</p>
                  <div className="space-y-1.5">
                    {completed.map(c => {
                      const isWinner = c.winner_id === user.id
                      const isTie = !c.winner_id
                      return (
                        <div key={c.id} className="flex items-center justify-between rounded-xl p-3 hover:bg-white/[0.015] transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground text-sm">vs {opponentName(c)} <span className="text-muted text-[11px]">· {typeLabel(c)}</span></p>
                          </div>
                          <span className={`text-xs font-bold ml-2 px-2 py-0.5 rounded-md ${isTie ? 'text-muted bg-white/[0.04]' : isWinner ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                            {isTie ? 'Tie' : isWinner ? 'Won' : 'Lost'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {!loading && challenges.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <p className="text-muted text-sm">No challenges yet</p>
                  <p className="text-muted/60 text-xs mt-0.5">Challenge a friend to get started</p>
                </div>
              )}
            </>
          )}

          {/* Group tab */}
          {tab === 'group' && !loading && (
            <>
              {pendingGroupReceived.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2.5">Invitations</p>
                  <div className="space-y-2">
                    {pendingGroupReceived.map(c => (
                      <div key={c.id} className="rounded-xl p-3.5 bg-accent/[0.03] border border-accent/10">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground text-sm font-medium">From {c.creator_username}</p>
                            <p className="text-[11px] text-muted">{typeLabel(c)} · {c.duration_days} days · {c.members.length} members</p>
                          </div>
                          <div className="flex gap-2 ml-2">
                            <button type="button" disabled={!!actingId} onClick={() => handleGroupAccept(c.id)} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">Join</button>
                            <button type="button" disabled={!!actingId} onClick={() => handleGroupDecline(c.id)} className="px-3 py-1.5 rounded-lg border border-white/[0.06] text-muted text-xs hover:text-foreground hover:bg-white/[0.04] transition-colors disabled:opacity-50">Decline</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeGroup.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2.5">Active Group Challenges</p>
                  <div className="space-y-3">
                    {activeGroup.map(c => {
                      const members = groupProgress.get(c.id) ?? []
                      const maxVal = Math.max(...members.map(m => m.value), 1)
                      const daysLeft = Math.max(0, Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000))
                      const unit = TYPE_UNITS[c.challenge_type] ?? ''

                      return (
                        <div key={c.id} className="rounded-xl p-4 bg-white/[0.02] border border-white/[0.04]">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-foreground text-sm font-medium">{typeLabel(c)}</p>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.04] text-muted tabular-nums">{daysLeft}d left</span>
                          </div>
                          <p className="text-[11px] text-muted mb-3.5">{c.members.filter(m => m.status === 'accepted').length} participants</p>
                          <div className="space-y-2.5">
                            {members.map((m, idx) => {
                              const isYou = m.user_id === user.id
                              const isFirst = idx === 0
                              return (
                                <div key={m.user_id}>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className={isYou ? 'text-foreground font-medium' : 'text-muted'}>
                                      <span className="tabular-nums text-muted/40 mr-1.5">{idx + 1}.</span>
                                      {isYou ? 'You' : m.username}
                                    </span>
                                    <span className={`font-bold tabular-nums ${isFirst ? 'text-amber-400' : isYou ? 'text-foreground' : 'text-muted'}`}>
                                      {m.value.toLocaleString()} {unit}
                                    </span>
                                  </div>
                                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${isFirst ? 'bg-amber-400' : isYou ? 'bg-accent' : 'bg-white/30'}`}
                                      style={{ width: `${(m.value / maxVal) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {completedGroup.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2.5">Recent Group Results</p>
                  <div className="space-y-1.5">
                    {completedGroup.map(c => {
                      const winner = c.members.find(m => m.rank === 1)
                      const userMember = c.members.find(m => m.user_id === user.id)
                      return (
                        <div key={c.id} className="flex items-center justify-between rounded-xl p-3 hover:bg-white/[0.015] transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground text-sm">{typeLabel(c)}</p>
                            <p className="text-[11px] text-muted">{c.members.length} members</p>
                          </div>
                          <div className="text-right ml-2">
                            {winner && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${winner.user_id === user.id ? 'text-amber-400 bg-amber-500/10' : 'text-muted bg-white/[0.04]'}`}>
                                {winner.user_id === user.id ? '1st Place' : `Winner: ${winner.username}`}
                              </span>
                            )}
                            {userMember && userMember.rank && userMember.rank > 1 && (
                              <p className="text-[10px] text-muted mt-0.5">You: #{userMember.rank}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {!loading && groupChallenges.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </div>
                  <p className="text-muted text-sm">No group challenges yet</p>
                  <p className="text-muted/60 text-xs mt-0.5">Create one to compete with multiple friends</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
