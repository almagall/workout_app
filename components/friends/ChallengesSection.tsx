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

  // 1v1
  const [challenges, setChallenges] = useState<ChallengeWithUsers[]>([])
  const [progress, setProgress] = useState<Map<string, ChallengeProgress>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)

  // Group
  const [groupChallenges, setGroupChallenges] = useState<GroupChallengeWithMembers[]>([])
  const [groupProgress, setGroupProgress] = useState<Map<string, MemberProgress[]>>(new Map())
  const [showGroupCreate, setShowGroupCreate] = useState(false)

  // Create form state
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80" onClick={() => isGroup ? setShowGroupCreate(false) : setShowCreate(false)}>
      <div className="modal-glass max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-white/[0.06] flex justify-between items-center">
          <h3 className="text-lg font-semibold text-foreground">{isGroup ? 'New Group Challenge' : 'New Challenge'}</h3>
          <button type="button" onClick={() => isGroup ? setShowGroupCreate(false) : setShowCreate(false)} className="p-1 rounded text-muted hover:text-foreground" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Quick-start templates */}
        {!isGroup && friends.length > 0 && (
          <div className="p-4 border-b border-white/[0.06]">
            <p className="text-xs text-muted uppercase tracking-wider mb-2">Quick Start</p>
            <div className="grid grid-cols-2 gap-2">
              {CHALLENGE_TEMPLATES.slice(0, 4).map(t => (
                <button
                  key={t.name}
                  type="button"
                  disabled={creating || !selectedFriend}
                  onClick={() => selectedFriend && handleQuickStart(t, selectedFriend)}
                  className="text-left p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors disabled:opacity-40"
                >
                  <p className="text-xs font-medium text-foreground">{t.name}</p>
                  <p className="text-[10px] text-muted mt-0.5">{t.description}</p>
                </button>
              ))}
            </div>
            {!selectedFriend && <p className="text-[10px] text-muted mt-1">Select a friend below to use quick-start</p>}
          </div>
        )}

        <form onSubmit={isGroup ? handleCreateGroup : handleCreate1v1} className="p-4 space-y-4">
          {isGroup ? (
            <div>
              <label className="block text-sm text-foreground mb-1">Friends (select 2+)</label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {friends.map(f => (
                  <label key={f.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.04] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFriends.includes(f.user_id)}
                      onChange={e => {
                        if (e.target.checked) setSelectedFriends(prev => [...prev, f.user_id])
                        else setSelectedFriends(prev => prev.filter(id => id !== f.user_id))
                      }}
                      className="accent-blue-500"
                    />
                    <span className="text-sm text-foreground">{f.username}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
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
          )}

          <div>
            <label className="block text-sm text-foreground mb-1">Type</label>
            <select
              value={challengeType}
              onChange={e => setChallengeType(e.target.value as ChallengeType)}
              className="w-full px-3 py-2 border border-white/[0.06] bg-white/[0.04] text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value="workout_count">Most Workouts</option>
              <option value="e1rm">Highest e1RM</option>
              <option value="total_volume">Most Volume (lbs)</option>
              <option value="consistency">Most Training Days</option>
            </select>
          </div>

          {challengeType === 'e1rm' && (
            <div>
              <label className="block text-sm text-foreground mb-1">Exercise</label>
              <input
                type="text"
                value={exerciseName}
                onChange={e => setExerciseName(e.target.value)}
                placeholder="e.g. Barbell Bench Press"
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
            <button type="button" onClick={() => { isGroup ? setShowGroupCreate(false) : setShowCreate(false); resetForm() }} className="px-4 py-2 rounded border border-white/[0.06] text-foreground text-sm hover:bg-white/[0.04]">
              Cancel
            </button>
            <button type="submit" disabled={creating} className="px-4 py-2 btn-primary disabled:opacity-50">
              {creating ? 'Sending...' : 'Send Challenge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <section className="card-glass card-accent-top shadow-card p-5 mb-6 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }} />

      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Challenges</h2>
          <div className="flex bg-white/[0.04] rounded-lg p-0.5">
            <button onClick={() => setTab('1v1')} className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${tab === '1v1' ? 'bg-accent/20 text-accent-light' : 'text-muted hover:text-foreground'}`}>1v1</button>
            <button onClick={() => setTab('group')} className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${tab === 'group' ? 'bg-accent/20 text-accent-light' : 'text-muted hover:text-foreground'}`}>Group</button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => tab === 'group' ? setShowGroupCreate(true) : setShowCreate(true)}
          className="px-3 py-1.5 text-sm btn-primary"
        >
          {tab === 'group' ? 'Group Challenge' : 'Challenge a Friend'}
        </button>
      </div>

      {loading && <p className="text-muted text-sm">Loading challenges...</p>}

      {showCreate && renderCreateModal(false)}
      {showGroupCreate && renderCreateModal(true)}

      {/* 1v1 tab */}
      {tab === '1v1' && (
        <>
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
                  const unit = TYPE_UNITS[c.challenge_type] ?? ''

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
                            <span className="text-foreground font-medium">{yourScore.toLocaleString()} {unit}</span>
                          </div>
                          <div className="h-2 bg-[#252525] rounded-full overflow-hidden">
                            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${(yourScore / maxScore) * 100}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-muted">{opponentName(c)}</span>
                            <span className="text-muted font-medium">{theirScore.toLocaleString()} {unit}</span>
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
                        <p className="text-foreground text-sm">vs {opponentName(c)} <span className="text-muted">· {typeLabel(c)}</span></p>
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
        </>
      )}

      {/* Group tab */}
      {tab === 'group' && (
        <>
          {pendingGroupReceived.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted mb-2">Invitations</h3>
              <div className="space-y-2">
                {pendingGroupReceived.map(c => (
                  <div key={c.id} className="bg-white/[0.04] rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground text-sm font-medium">From {c.creator_username}</p>
                        <p className="text-xs text-muted">{typeLabel(c)} · {c.duration_days} days · {c.members.length} members</p>
                      </div>
                      <div className="flex gap-2 ml-2">
                        <button type="button" disabled={!!actingId} onClick={() => handleGroupAccept(c.id)} className="px-3 py-1 rounded btn-primary text-xs disabled:opacity-50">Join</button>
                        <button type="button" disabled={!!actingId} onClick={() => handleGroupDecline(c.id)} className="px-3 py-1 rounded border border-white/[0.06] text-foreground text-xs hover:bg-white/[0.04] disabled:opacity-50">Decline</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeGroup.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted mb-2">Active Group Challenges</h3>
              <div className="space-y-3">
                {activeGroup.map(c => {
                  const members = groupProgress.get(c.id) ?? []
                  const maxVal = Math.max(...members.map(m => m.value), 1)
                  const daysLeft = Math.max(0, Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000))
                  const unit = TYPE_UNITS[c.challenge_type] ?? ''

                  return (
                    <div key={c.id} className="bg-white/[0.04] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-foreground text-sm font-medium">{typeLabel(c)}</p>
                        <span className="text-xs text-muted">{daysLeft}d left</span>
                      </div>
                      <p className="text-xs text-muted mb-3">{c.members.filter(m => m.status === 'accepted').length} participants</p>
                      <div className="space-y-2">
                        {members.map((m, i) => (
                          <div key={m.user_id}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className={m.user_id === user.id ? 'text-foreground font-medium' : 'text-muted'}>
                                {i + 1}. {m.user_id === user.id ? 'You' : m.username}
                              </span>
                              <span className={m.user_id === user.id ? 'text-foreground font-medium' : 'text-muted'}>
                                {m.value.toLocaleString()} {unit}
                              </span>
                            </div>
                            <div className="h-1.5 bg-[#252525] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${i === 0 ? 'bg-amber-400' : m.user_id === user.id ? 'bg-white' : 'bg-white/40'}`}
                                style={{ width: `${(m.value / maxVal) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {completedGroup.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted mb-2">Recent Group Results</h3>
              <div className="space-y-2">
                {completedGroup.map(c => {
                  const winner = c.members.find(m => m.rank === 1)
                  const userMember = c.members.find(m => m.user_id === user.id)
                  return (
                    <div key={c.id} className="flex items-center justify-between bg-white/[0.04] rounded-lg p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground text-sm">{typeLabel(c)}</p>
                        <p className="text-xs text-muted">{c.members.length} members</p>
                      </div>
                      <div className="text-right ml-2">
                        {winner && (
                          <span className={`text-xs font-semibold ${winner.user_id === user.id ? 'text-amber-400' : 'text-muted'}`}>
                            {winner.user_id === user.id ? '1st Place' : `Winner: ${winner.username}`}
                          </span>
                        )}
                        {userMember && userMember.rank && userMember.rank > 1 && (
                          <p className="text-[10px] text-muted">You: #{userMember.rank}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!loading && groupChallenges.length === 0 && (
            <p className="text-muted text-sm">No group challenges yet. Create one to compete with multiple friends!</p>
          )}
        </>
      )}
    </section>
  )
}
