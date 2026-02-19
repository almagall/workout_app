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

  // Exclude friends already in a pair
  const pairedFriendIds = new Set(pairs.flatMap(p => [p.requester_id, p.partner_id]))
  const availableFriends = friends.filter(f => !pairedFriendIds.has(f.user_id))

  return (
    <section className="card-glass shadow-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Accountability</h2>
        <button
          type="button"
          onClick={() => { setShowPicker(!showPicker); setRequestError('') }}
          className="px-3 py-1.5 text-sm btn-primary"
        >
          Partner Up
        </button>
      </div>

      {loading && <p className="text-muted text-sm">Loading...</p>}

      {/* Partner picker */}
      {showPicker && (
        <div className="mb-4 bg-white/[0.04] rounded-lg p-3">
          <p className="text-sm text-foreground mb-2">Choose a friend:</p>
          {availableFriends.length === 0 ? (
            <p className="text-xs text-muted">No available friends (all already partnered or pending)</p>
          ) : (
            <div className="space-y-1">
              {availableFriends.map(f => (
                <button
                  key={f.user_id}
                  type="button"
                  onClick={() => handleRequest(f.user_id)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-[#2a2a2a] text-foreground text-sm transition-colors"
                >
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
          <h3 className="text-sm font-medium text-muted mb-2">Incoming Requests</h3>
          <div className="space-y-2">
            {pendingReceived.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white/[0.04] rounded-lg p-3">
                <p className="text-foreground text-sm font-medium">{p.requester_username}</p>
                <div className="flex gap-2">
                  <button type="button" disabled={!!actingId} onClick={() => handleAccept(p.id)} className="px-3 py-1 rounded btn-primary text-xs disabled:opacity-50">Accept</button>
                  <button type="button" disabled={!!actingId} onClick={() => handleDecline(p.id)} className="px-3 py-1 rounded border border-white/[0.06] text-foreground text-xs hover:bg-white/[0.04] disabled:opacity-50">Decline</button>
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
            {pendingSent.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white/[0.04] rounded-lg p-3">
                <p className="text-foreground text-sm">{p.partner_username}</p>
                <span className="text-xs text-muted">Waiting...</span>
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
              <div key={p.id} className="bg-white/[0.04] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-foreground font-medium">{partnerName(p)}</p>
                  <button
                    type="button"
                    onClick={() => handleEnd(p.id)}
                    className="text-xs text-muted hover:text-red-400 transition-colors"
                  >
                    End
                  </button>
                </div>

                {/* Streak */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <p className="text-foreground font-semibold text-lg leading-tight">{streak}-week streak</p>
                    <p className="text-xs text-muted">Both trained every week</p>
                  </div>
                </div>

                {/* Weekly status */}
                <div className="flex gap-4 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${status?.userTrained ? 'bg-green-500/20 text-green-400' : 'bg-[#252525] text-muted'}`}>
                      {status?.userTrained ? '✓' : '—'}
                    </span>
                    <span className="text-xs text-foreground">You</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${partnerTrainedThisWeek ? 'bg-green-500/20 text-green-400' : 'bg-[#252525] text-muted'}`}>
                      {partnerTrainedThisWeek ? '✓' : '—'}
                    </span>
                    <span className="text-xs text-foreground">{partnerName(p)}</span>
                  </div>
                </div>

                {/* Nudge */}
                {!partnerTrainedThisWeek && (
                  <button
                    type="button"
                    onClick={() => handleNudge(p.id)}
                    disabled={nudging === p.id}
                    className="w-full py-2 text-sm bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors disabled:opacity-50"
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
        <p className="text-muted text-sm">No accountability partners yet. Pair up with a friend to keep each other consistent!</p>
      )}
    </section>
  )
}
