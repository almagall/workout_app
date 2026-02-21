'use client'

import { useState, useEffect, useCallback } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import type { FriendRow } from '@/lib/friends'
import {
  requestPartner,
  acceptPartner,
  declinePartner,
  endPartnership,
  getAccountabilityPairs,
  getWeeklyStatus,
  computeStreak,
  nudgePartner,
  setWeeklyGoal,
  sendCheckin,
  getCheckins,
  type AccountabilityPairWithUsers,
  type WeeklyStatus,
  type AccountabilityCheckin,
} from '@/lib/accountability'

interface AccountabilitySectionProps {
  friends: FriendRow[]
}

function milestoneForStreak(streak: number): { label: string; color: string } | null {
  if (streak >= 20) return { label: 'Legend', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' }
  if (streak >= 10) return { label: 'Diamond', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' }
  if (streak >= 5) return { label: 'Gold', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
  if (streak >= 3) return { label: 'On Fire', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' }
  return null
}

function formatRelativeTime(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function AccountabilitySection({ friends }: AccountabilitySectionProps) {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [pairs, setPairs] = useState<AccountabilityPairWithUsers[]>([])
  const [weeklyStatuses, setWeeklyStatuses] = useState<Map<string, WeeklyStatus>>(new Map())
  const [streaks, setStreaks] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)
  const [nudging, setNudging] = useState<string | null>(null)
  const [nudgeError, setNudgeError] = useState('')
  const [requestError, setRequestError] = useState('')

  // Expanded partner card state
  const [expandedPair, setExpandedPair] = useState<string | null>(null)
  const [checkins, setCheckins] = useState<Map<string, AccountabilityCheckin[]>>(new Map())
  const [loadingCheckins, setLoadingCheckins] = useState<string | null>(null)
  const [newCheckinMsg, setNewCheckinMsg] = useState<Map<string, string>>(new Map())
  const [postingCheckin, setPostingCheckin] = useState<string | null>(null)

  // Weekly goal editing
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  const [goalInput, setGoalInput] = useState('')
  const [savingGoal, setSavingGoal] = useState(false)

  const loadPairs = useCallback(async () => {
    const list = await getAccountabilityPairs()
    setPairs(list)

    const activePairs = list.filter(p => p.status === 'active')
    const statusMap = new Map<string, WeeklyStatus>()
    const streakMap = new Map<string, number>()

    await Promise.all(
      activePairs.map(async p => {
        const [status, streak] = await Promise.all([getWeeklyStatus(p), computeStreak(p)])
        statusMap.set(p.id, status)
        streakMap.set(p.id, streak)
      })
    )

    setWeeklyStatuses(statusMap)
    setStreaks(streakMap)
  }, [])

  useEffect(() => {
    const u = getCurrentUser()
    if (u) setUser(u)
    loadPairs().finally(() => setLoading(false))
  }, [loadPairs])

  const handleRequest = async (friendId: string) => {
    setRequestError('')
    const res = await requestPartner(friendId)
    if (res.ok) {
      setShowPicker(false)
      await loadPairs()
    } else {
      setRequestError(res.error ?? 'Failed to send request')
    }
  }

  const handleAccept = async (id: string) => {
    if (actingId) return
    setActingId(id)
    await acceptPartner(id)
    await loadPairs()
    setActingId(null)
  }

  const handleDecline = async (id: string) => {
    if (actingId) return
    setActingId(id)
    await declinePartner(id)
    await loadPairs()
    setActingId(null)
  }

  const handleEnd = async (id: string) => {
    if (actingId) return
    setActingId(id)
    await endPartnership(id)
    await loadPairs()
    setActingId(null)
  }

  const handleNudge = async (pairId: string) => {
    setNudgeError('')
    setNudging(pairId)
    const res = await nudgePartner(pairId)
    if (!res.ok) setNudgeError(res.error ?? 'Failed to nudge')
    setNudging(null)
  }

  const toggleExpanded = async (pairId: string) => {
    if (expandedPair === pairId) {
      setExpandedPair(null)
      return
    }
    setExpandedPair(pairId)
    if (!checkins.has(pairId)) {
      setLoadingCheckins(pairId)
      const data = await getCheckins(pairId, 5)
      setCheckins(prev => new Map(prev).set(pairId, data))
      setLoadingCheckins(null)
    }
  }

  const handlePostCheckin = async (pairId: string) => {
    const msg = newCheckinMsg.get(pairId) ?? ''
    if (!msg.trim() || postingCheckin) return
    setPostingCheckin(pairId)
    const res = await sendCheckin(pairId, msg)
    if (res.ok) {
      const data = await getCheckins(pairId, 5)
      setCheckins(prev => new Map(prev).set(pairId, data))
      setNewCheckinMsg(prev => { const n = new Map(prev); n.delete(pairId); return n })
    }
    setPostingCheckin(null)
  }

  const handleSaveGoal = async (pairId: string) => {
    setSavingGoal(true)
    const val = goalInput === '' ? null : parseInt(goalInput)
    const res = await setWeeklyGoal(pairId, val)
    if (res.ok) {
      setEditingGoal(null)
      await loadPairs()
    }
    setSavingGoal(false)
  }

  if (!user) return null

  const pendingReceived = pairs.filter(p => p.status === 'pending' && p.partner_id === user.id)
  const pendingSent = pairs.filter(p => p.status === 'pending' && p.requester_id === user.id)
  const activePairs = pairs.filter(p => p.status === 'active')

  const partnerName = (p: AccountabilityPairWithUsers) =>
    p.requester_id === user.id ? p.partner_username : p.requester_username

  const myGoal = (p: AccountabilityPairWithUsers) =>
    p.requester_id === user.id ? p.requester_weekly_goal : p.partner_weekly_goal

  const partnerGoal = (p: AccountabilityPairWithUsers) =>
    p.requester_id === user.id ? p.partner_weekly_goal : p.requester_weekly_goal

  const pairedFriendIds = new Set(pairs.flatMap(p => [p.requester_id, p.partner_id]))
  const availableFriends = friends.filter(f => !pairedFriendIds.has(f.user_id))

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-0.5 h-4 rounded-full bg-accent/50" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Accountability</h2>
        </div>
        <button
          type="button"
          onClick={() => { setShowPicker(!showPicker); setRequestError('') }}
          className="btn-primary text-xs px-3 py-1.5"
        >
          Partner Up
        </button>
      </div>

      <div className="rounded-2xl border border-white/[0.06] overflow-hidden relative" style={{ background: 'linear-gradient(180deg, rgba(19,19,22,0.95), rgba(13,13,16,0.98))', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
        <div className="absolute -top-10 -left-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.05), transparent 70%)' }} />

        <div className="p-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          )}

          {/* Partner picker */}
          {showPicker && (
            <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs font-medium text-foreground mb-2.5">Choose a friend:</p>
              {availableFriends.length === 0 ? (
                <p className="text-[11px] text-muted">No available friends (all already partnered or pending)</p>
              ) : (
                <div className="space-y-0.5">
                  {availableFriends.map(f => (
                    <button
                      key={f.user_id}
                      type="button"
                      onClick={() => handleRequest(f.user_id)}
                      className="w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-lg hover:bg-white/[0.03] text-foreground text-sm transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-[10px] font-semibold text-foreground/70 flex-shrink-0">
                        {f.username.charAt(0).toUpperCase()}
                      </div>
                      {f.username}
                    </button>
                  ))}
                </div>
              )}
              {requestError && <p className="text-xs text-red-400 mt-2">{requestError}</p>}
            </div>
          )}

          {/* Pending received */}
          {pendingReceived.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2.5">Incoming Requests</p>
              <div className="space-y-2">
                {pendingReceived.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl p-3.5 bg-accent/[0.03] border border-accent/10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/15 flex items-center justify-center text-xs font-semibold text-accent-light flex-shrink-0">
                        {p.requester_username.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-foreground text-sm font-medium">{p.requester_username}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" disabled={!!actingId} onClick={() => handleAccept(p.id)} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">Accept</button>
                      <button type="button" disabled={!!actingId} onClick={() => handleDecline(p.id)} className="px-3 py-1.5 rounded-lg border border-white/[0.06] text-muted text-xs hover:text-foreground hover:bg-white/[0.04] transition-colors disabled:opacity-50">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending sent */}
          {pendingSent.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2.5">Sent</p>
              <div className="space-y-2">
                {pendingSent.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl p-3.5 bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-xs font-semibold text-foreground/70 flex-shrink-0">
                        {p.partner_username.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-foreground text-sm">{p.partner_username}</p>
                    </div>
                    <span className="text-[11px] text-muted/60">Waiting...</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active partnerships */}
          {activePairs.length > 0 && (
            <div className="space-y-3">
              {activePairs.map(p => {
                const status = weeklyStatuses.get(p.id)
                const streak = streaks.get(p.id) ?? p.streak_count
                const partnerTrainedThisWeek = status?.partnerTrained ?? false
                const milestone = milestoneForStreak(streak)
                const myGoalVal = myGoal(p)
                const partnerGoalVal = partnerGoal(p)
                const myCount = status?.userWorkoutCount ?? 0
                const partnerCount = status?.partnerWorkoutCount ?? 0
                const isExpanded = expandedPair === p.id
                const pairCheckins = checkins.get(p.id) ?? []

                return (
                  <div key={p.id} className="rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
                    {/* Card header */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/15 flex items-center justify-center text-xs font-semibold text-accent-light flex-shrink-0">
                            {partnerName(p).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-foreground font-medium text-sm">{partnerName(p)}</p>
                            {milestone && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${milestone.color}`}>
                                {milestone.label}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEnd(p.id)}
                          className="text-[11px] text-muted/60 hover:text-red-400 transition-colors"
                        >
                          End
                        </button>
                      </div>

                      {/* Streak */}
                      <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-white/[0.015] border border-white/[0.03]">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/15 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 23a7.5 7.5 0 01-5.138-12.963C8.204 8.774 11.5 6.5 11 1.5c6 4 9 8 3 14 1 0 2.5 0 5-2.47.27.68.5 1.43.5 2.47a7.5 7.5 0 01-7.5 7.5z" /></svg>
                        </div>
                        <div>
                          <p className="text-foreground font-bold text-lg leading-tight tabular-nums">{streak}-week streak</p>
                          <p className="text-[11px] text-muted">Both trained every week</p>
                        </div>
                        {milestone && (
                          <div className="ml-auto">
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${milestone.color}`}>{milestone.label}</span>
                          </div>
                        )}
                      </div>

                      {/* This week: actual count vs goal */}
                      <div className="flex gap-2 mb-3">
                        {/* You */}
                        <div className="flex-1 p-2.5 rounded-lg bg-white/[0.015] border border-white/[0.03]">
                          <p className="text-[10px] text-muted mb-1.5">You this week</p>
                          <div className="flex items-end gap-1">
                            <span className={`text-xl font-bold tabular-nums leading-none ${status?.userTrained ? 'text-green-400' : 'text-muted'}`}>
                              {myCount}
                            </span>
                            {myGoalVal != null && (
                              <span className="text-[11px] text-muted mb-0.5">/ {myGoalVal}</span>
                            )}
                          </div>
                          {myGoalVal != null && (
                            <div className="mt-1.5 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${myCount >= myGoalVal ? 'bg-green-400' : 'bg-accent'}`}
                                style={{ width: `${Math.min((myCount / myGoalVal) * 100, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                        {/* Partner */}
                        <div className="flex-1 p-2.5 rounded-lg bg-white/[0.015] border border-white/[0.03]">
                          <p className="text-[10px] text-muted mb-1.5">{partnerName(p)} this week</p>
                          <div className="flex items-end gap-1">
                            <span className={`text-xl font-bold tabular-nums leading-none ${partnerTrainedThisWeek ? 'text-green-400' : 'text-muted'}`}>
                              {partnerCount}
                            </span>
                            {partnerGoalVal != null && (
                              <span className="text-[11px] text-muted mb-0.5">/ {partnerGoalVal}</span>
                            )}
                          </div>
                          {partnerGoalVal != null && (
                            <div className="mt-1.5 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${partnerCount >= partnerGoalVal ? 'bg-green-400' : 'bg-amber-400/70'}`}
                                style={{ width: `${Math.min((partnerCount / partnerGoalVal) * 100, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Set my goal */}
                      {editingGoal === p.id ? (
                        <div className="flex items-center gap-2 mb-3">
                          <input
                            type="number"
                            min={1}
                            max={14}
                            value={goalInput}
                            onChange={e => setGoalInput(e.target.value)}
                            placeholder="# workouts"
                            className="flex-1 px-3 py-2 text-sm border border-white/[0.08] bg-white/[0.03] text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 placeholder:text-muted/50"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveGoal(p.id)}
                            disabled={savingGoal}
                            className="btn-primary text-xs px-3 py-2 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingGoal(null); setGoalInput('') }}
                            className="text-xs text-muted hover:text-foreground transition-colors px-2"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setEditingGoal(p.id); setGoalInput(myGoalVal != null ? String(myGoalVal) : '') }}
                          className="text-[11px] text-muted hover:text-accent-light transition-colors mb-3 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          {myGoalVal != null ? `My goal: ${myGoalVal} workouts/week` : 'Set my weekly goal'}
                        </button>
                      )}

                      {/* Nudge */}
                      {!partnerTrainedThisWeek && (
                        <button
                          type="button"
                          onClick={() => handleNudge(p.id)}
                          disabled={nudging === p.id}
                          className="w-full py-2.5 text-xs font-medium bg-amber-500/8 text-amber-400 border border-amber-500/15 rounded-lg hover:bg-amber-500/15 transition-colors disabled:opacity-50"
                        >
                          {nudging === p.id ? 'Sending...' : 'Nudge to Train'}
                        </button>
                      )}
                    </div>

                    {/* Check-in toggle */}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(p.id)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted hover:text-foreground bg-white/[0.01] hover:bg-white/[0.03] border-t border-white/[0.04] transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        Check-ins
                      </span>
                      <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    {/* Check-in panel */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-3 border-t border-white/[0.04]">
                        {loadingCheckins === p.id ? (
                          <p className="text-xs text-muted py-2">Loading...</p>
                        ) : (
                          <>
                            {pairCheckins.length === 0 ? (
                              <p className="text-xs text-muted mb-3">No check-ins yet. Be the first!</p>
                            ) : (
                              <div className="space-y-2.5 mb-3">
                                {[...pairCheckins].reverse().map(ci => (
                                  <div key={ci.id} className="flex items-start gap-2">
                                    <div className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-[10px] font-semibold text-foreground/70 flex-shrink-0 mt-0.5">
                                      {(ci.username ?? '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="text-xs font-medium text-foreground">{ci.username ?? 'Unknown'}</span>
                                        <span className="text-[10px] text-muted/50">{formatRelativeTime(ci.created_at)}</span>
                                      </div>
                                      <p className="text-xs text-secondary mt-0.5">{ci.message}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newCheckinMsg.get(p.id) ?? ''}
                                onChange={e => setNewCheckinMsg(prev => { const n = new Map(prev); n.set(p.id, e.target.value); return n })}
                                onKeyDown={e => e.key === 'Enter' && handlePostCheckin(p.id)}
                                placeholder="Quick update... (max 160)"
                                maxLength={160}
                                className="flex-1 text-xs px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/20 transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => handlePostCheckin(p.id)}
                                disabled={postingCheckin === p.id || !(newCheckinMsg.get(p.id) ?? '').trim()}
                                className="btn-primary text-xs px-3 py-2 disabled:opacity-50"
                              >
                                Send
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {nudgeError && <p className="text-xs text-red-400 mt-1">{nudgeError}</p>}
            </div>
          )}

          {!loading && pairs.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <p className="text-muted text-sm">No accountability partners yet</p>
              <p className="text-muted/60 text-xs mt-0.5">Pair up with a friend to stay consistent</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
