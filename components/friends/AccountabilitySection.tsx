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
  type AccountabilityPairWithUsers,
  type WeeklyStatus,
} from '@/lib/accountability'

interface AccountabilitySectionProps {
  friends: FriendRow[]
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

  if (!user) return null

  const pendingReceived = pairs.filter(p => p.status === 'pending' && p.partner_id === user.id)
  const pendingSent = pairs.filter(p => p.status === 'pending' && p.requester_id === user.id)
  const activePairs = pairs.filter(p => p.status === 'active')

  const partnerName = (p: AccountabilityPairWithUsers) =>
    p.requester_id === user.id ? p.partner_username : p.requester_username

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

                return (
                  <div key={p.id} className="rounded-xl p-4 bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/15 flex items-center justify-center text-xs font-semibold text-accent-light flex-shrink-0">
                          {partnerName(p).charAt(0).toUpperCase()}
                        </div>
                        <p className="text-foreground font-medium text-sm">{partnerName(p)}</p>
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
                    </div>

                    {/* Weekly status */}
                    <div className="flex gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-1 p-2.5 rounded-lg bg-white/[0.015]">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${status?.userTrained ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-white/[0.04] text-muted border border-white/[0.04]'}`}>
                          {status?.userTrained ? '✓' : '—'}
                        </div>
                        <span className="text-xs text-foreground">You</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 p-2.5 rounded-lg bg-white/[0.015]">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${partnerTrainedThisWeek ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-white/[0.04] text-muted border border-white/[0.04]'}`}>
                          {partnerTrainedThisWeek ? '✓' : '—'}
                        </div>
                        <span className="text-xs text-foreground truncate">{partnerName(p)}</span>
                      </div>
                    </div>

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
