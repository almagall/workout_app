'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import {
  lookupUserByUsername,
  sendFriendRequest,
  getPendingFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  getFriends,
  sendPRReaction,
  getReactedPRs,
  addPRComment,
  getPRComments,
  type FriendRequestWithFrom,
  type FriendRow,
  type ReactionType,
  type ReactionInfo,
  type PRComment,
} from '@/lib/friends'
import { checkAndUnlockAchievements } from '@/lib/achievements'
import type { RecentPR } from '@/lib/pr-helper'
import { FriendActivityFeed } from '@/components/dashboard/FriendActivityFeed'
import ChallengesSection from '@/components/friends/ChallengesSection'
import AccountabilitySection from '@/components/friends/AccountabilitySection'
import CompareModal from '@/components/friends/CompareModal'

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function AvatarCircle({ name, size = 'md', accent }: { name: string; size?: 'sm' | 'md' | 'lg'; accent?: boolean }) {
  const sizes = { sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-11 h-11 text-sm' }
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${accent ? 'bg-accent/15 text-accent-light border border-accent/20' : 'bg-white/[0.06] text-foreground/70 border border-white/[0.06]'}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function SectionHeader({ title, count, action }: { title: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-0.5 h-4 rounded-full bg-accent/50" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{title}</h2>
        {count != null && count > 0 && (
          <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full bg-accent/10 text-accent-light border border-accent/15">{count}</span>
        )}
      </div>
      {action}
    </div>
  )
}

export default function FriendsPage() {
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null)
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [pending, setPending] = useState<FriendRequestWithFrom[]>([])
  const [addUsername, setAddUsername] = useState('')
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [viewingFriend, setViewingFriend] = useState<FriendRow | null>(null)
  const [friendPRs, setFriendPRs] = useState<RecentPR[]>([])
  const [friendPRsLabels, setFriendPRsLabels] = useState<Record<string, string>>({})
  const [friendPRsLoading, setFriendPRsLoading] = useState(false)
  const [friendPRsError, setFriendPRsError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [reactedPRs, setReactedPRs] = useState<Map<string, ReactionInfo>>(new Map())
  const [sendingReaction, setSendingReaction] = useState<string | null>(null)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [expandedComments, setExpandedComments] = useState<string | null>(null)
  const [prComments, setPRComments] = useState<Map<string, PRComment[]>>(new Map())
  const [loadingComments, setLoadingComments] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [comparingFriend, setComparingFriend] = useState<FriendRow | null>(null)
  const [friendsExpanded, setFriendsExpanded] = useState(false)

  const refresh = () => {
    getFriends().then(setFriends)
    getPendingFriendRequests().then(setPending)
  }

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      window.location.href = '/get-started'
      return
    }
    setUser(currentUser)
    refresh()
    setLoading(false)
  }, [])

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')
    setAddSuccess('')
    const username = addUsername.trim()
    if (!username) return
    const res = await sendFriendRequest(username)
    if (res.ok) {
      setAddSuccess(`Friend request sent to ${username}.`)
      setAddUsername('')
      setShowAddModal(false)
      refresh()
      checkAndUnlockAchievements().catch(() => {})
    } else {
      setAddError(res.error ?? 'Failed to send request')
    }
  }

  const openAddModal = () => {
    setAddUsername('')
    setAddError('')
    setAddSuccess('')
    setShowAddModal(true)
  }

  const handleAccept = async (requestId: string) => {
    if (actingId) return
    setActingId(requestId)
    const res = await acceptFriendRequest(requestId)
    if (res.ok) {
      refresh()
      checkAndUnlockAchievements().catch(() => {})
    }
    setActingId(null)
  }

  const handleDecline = async (requestId: string) => {
    if (actingId) return
    setActingId(requestId)
    await declineFriendRequest(requestId)
    refresh()
    setActingId(null)
  }

  const loadFriendPRs = async (friend: FriendRow) => {
    if (!user) return
    setViewingFriend(friend)
    setFriendPRsLoading(true)
    setFriendPRsError('')
    setFriendPRs([])
    setFriendPRsLabels({})
    setReactedPRs(new Map())
    setShowReactionPicker(null)
    try {
      const [res, reacted] = await Promise.all([
        fetch(`/api/friends/${encodeURIComponent(friend.user_id)}/prs?currentUserId=${encodeURIComponent(user.id)}&limit=10`),
        getReactedPRs(friend.user_id),
      ])
      const data = await res.json()
      if (!res.ok) {
        setFriendPRsError(data.error || 'Could not load PRs')
        return
      }
      setFriendPRs(data.prs ?? [])
      setFriendPRsLabels(data.dayLabels ?? {})
      setReactedPRs(reacted)
    } catch {
      setFriendPRsError('Failed to load PRs')
    } finally {
      setFriendPRsLoading(false)
    }
  }

  const handleSendReaction = async (pr: RecentPR, reactionType: ReactionType) => {
    if (!viewingFriend || sendingReaction) return
    const key = `${pr.exerciseName}|${pr.templateDayId}|${pr.workoutDate}|${pr.prType}`
    if (reactedPRs.has(key)) return
    setSendingReaction(key)
    setShowReactionPicker(null)
    const result = await sendPRReaction({
      to_user_id: viewingFriend.user_id,
      exercise_name: pr.exerciseName,
      template_day_id: pr.templateDayId,
      workout_date: pr.workoutDate,
      pr_type: pr.prType,
      value: pr.value,
    }, reactionType)
    if (result.ok) {
      setReactedPRs((prev) => new Map(prev).set(key, { reaction_type: reactionType }))
    }
    setSendingReaction(null)
  }

  const getReactionEmoji = (type: ReactionType) => {
    switch (type) {
      case 'kudos': return '👍'
      case 'strong': return '💪'
      case 'fire': return '🔥'
    }
  }

  const toggleComments = async (pr: RecentPR) => {
    if (!viewingFriend) return
    const key = `${pr.exerciseName}|${pr.templateDayId}|${pr.workoutDate}|${pr.prType}`
    if (expandedComments === key) {
      setExpandedComments(null)
      return
    }
    setExpandedComments(key)
    setNewComment('')
    if (!prComments.has(key)) {
      setLoadingComments(key)
      const comments = await getPRComments(
        viewingFriend.user_id,
        pr.exerciseName,
        pr.templateDayId,
        pr.workoutDate,
        pr.prType
      )
      setPRComments((prev) => new Map(prev).set(key, comments))
      setLoadingComments(null)
    }
  }

  const handlePostComment = async (pr: RecentPR) => {
    if (!viewingFriend || postingComment || !newComment.trim()) return
    const key = `${pr.exerciseName}|${pr.templateDayId}|${pr.workoutDate}|${pr.prType}`
    setPostingComment(true)
    const result = await addPRComment({
      to_user_id: viewingFriend.user_id,
      exercise_name: pr.exerciseName,
      template_day_id: pr.templateDayId,
      workout_date: pr.workoutDate,
      pr_type: pr.prType,
      value: pr.value,
    }, newComment)
    if (result.ok) {
      const comments = await getPRComments(
        viewingFriend.user_id,
        pr.exerciseName,
        pr.templateDayId,
        pr.workoutDate,
        pr.prType
      )
      setPRComments((prev) => new Map(prev).set(key, comments))
      setNewComment('')
    }
    setPostingComment(false)
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-muted text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  const PREVIEW_COUNT = 3
  const showFriendsList = friendsExpanded ? friends : friends.slice(0, PREVIEW_COUNT)
  const hasMoreFriends = friends.length > PREVIEW_COUNT

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 relative">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 60% at 50% 0%, rgba(59,130,246,0.06), transparent 70%)' }} />

      {/* Page header */}
      <div className="relative flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Friends</h1>
          <p className="text-muted text-sm mt-0.5">{friends.length} friend{friends.length !== 1 ? 's' : ''} connected</p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="btn-primary text-sm gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Friend
        </button>
      </div>
      {addSuccess && (
        <div className="mb-6 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {addSuccess}
        </div>
      )}

      {/* Add friend modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div
            className="modal-glass max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[3px] rounded-t-xl" style={{ background: 'linear-gradient(90deg, #2563eb, #06b6d4, #2563eb)' }} />
            <div className="p-5 border-b border-white/[0.06] flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Add Friend</h3>
                <p className="text-xs text-muted mt-0.5">Send a friend request by username</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSendRequest} className="p-5">
              <div className="relative mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">@</span>
                <input
                  type="text"
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  placeholder="username"
                  autoFocus
                  className="w-full pl-8 pr-3 py-2.5 border border-white/[0.08] bg-white/[0.03] text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all placeholder:text-muted/50"
                />
              </div>
              {addError && <p className="mb-3 text-sm text-red-400 flex items-center gap-1.5"><svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{addError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-white/[0.06] text-foreground text-sm hover:bg-white/[0.04] transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-sm">
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pending requests */}
      {pending.length > 0 && (
        <section className="mb-6">
          <SectionHeader
            title="Pending Requests"
            count={pending.length}
          />
          <div className="space-y-2">
            {pending.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-accent/10 bg-accent/[0.03]"
                style={{ boxShadow: '0 0 20px rgba(59,130,246,0.04)' }}
              >
                <AvatarCircle name={req.from_username} accent />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium text-sm">{req.from_username}</p>
                  <p className="text-[11px] text-muted">wants to connect</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!!actingId}
                    onClick={() => handleAccept(req.id)}
                    className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={!!actingId}
                    onClick={() => handleDecline(req.id)}
                    className="px-3 py-1.5 rounded-lg border border-white/[0.06] text-muted text-xs hover:text-foreground hover:bg-white/[0.04] transition-colors disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Friends list - collapsible */}
      <section className="mb-6">
        <SectionHeader
          title="Your Friends"
          count={friends.length}
        />
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(19,19,22,0.95), rgba(13,13,16,0.98))', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
          {friends.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <p className="text-muted text-sm mb-1">No friends yet</p>
              <p className="text-muted/60 text-xs">Add friends by username to get started</p>
            </div>
          ) : (
            <>
              {/* Friend rows */}
              <div className="divide-y divide-white/[0.04]">
                {showFriendsList.map((f) => (
                  <div
                    key={f.user_id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group"
                  >
                    <AvatarCircle name={f.username} />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">{f.username}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setComparingFriend(f)}
                        className="p-1.5 rounded-lg text-muted hover:text-accent-light hover:bg-accent/[0.08] transition-colors"
                        title="Compare"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => loadFriendPRs(f)}
                        className="p-1.5 rounded-lg text-muted hover:text-amber-400 hover:bg-amber-500/[0.08] transition-colors"
                        title="View PRs"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Expand / collapse toggle */}
              {hasMoreFriends && (
                <button
                  type="button"
                  onClick={() => setFriendsExpanded(!friendsExpanded)}
                  className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-accent-light/80 hover:text-accent-light bg-white/[0.015] hover:bg-white/[0.03] border-t border-white/[0.04] transition-colors"
                >
                  {friendsExpanded ? (
                    <>
                      Show less
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </>
                  ) : (
                    <>
                      Show all {friends.length} friends
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </section>

      {/* Challenges */}
      <ChallengesSection friends={friends} />

      {/* Accountability Partners */}
      <AccountabilitySection friends={friends} />

      {/* Friend Activity */}
      <section className="mb-6">
        <FriendActivityFeed
          maxItems={20}
          showViewAllLink={false}
          scrollHeight="600px"
        />
      </section>

      {/* Compare modal */}
      {comparingFriend && (
        <CompareModal friend={comparingFriend} onClose={() => setComparingFriend(null)} />
      )}

      {/* Friend PRs modal */}
      {viewingFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => setViewingFriend(null)}>
          <div
            className="modal-glass max-w-md w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #2563eb, #06b6d4, #2563eb)' }} />
            <div className="p-4 border-b border-white/[0.06] flex items-center gap-3">
              <AvatarCircle name={viewingFriend.username} accent />
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground">{viewingFriend.username}</h3>
                <p className="text-xs text-muted">Recent Personal Records</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingFriend(null)}
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              {friendPRsLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                </div>
              )}
              {friendPRsError && <p className="text-red-400 text-sm text-center py-4">{friendPRsError}</p>}
              {!friendPRsLoading && !friendPRsError && friendPRs.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted text-sm">No recent PRs</p>
                </div>
              )}
              {!friendPRsLoading && friendPRs.length > 0 && (
                <div className="space-y-2">
                  {friendPRs.map((pr, i) => {
                    const key = `${pr.exerciseName}|${pr.templateDayId}|${pr.workoutDate}|${pr.prType}`
                    const reaction = reactedPRs.get(key)
                    const hasReacted = !!reaction
                    const isSending = sendingReaction === key
                    const isPickerOpen = showReactionPicker === key
                    const isCommentsOpen = expandedComments === key
                    const comments = prComments.get(key) ?? []
                    const isLoadingComments = loadingComments === key
                    return (
                      <div
                        key={`${pr.exerciseName}-${pr.workoutDate}-${pr.prType}-${i}`}
                        className="rounded-xl p-3.5 border border-white/[0.04] bg-white/[0.02]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground font-medium text-sm">{pr.exerciseName}</p>
                            <p className="text-[11px] text-muted mt-0.5">
                              {friendPRsLabels[pr.templateDayId] ?? 'Workout'} · {formatDate(pr.workoutDate)}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-accent-light font-bold text-base tabular-nums">{pr.value}</span>
                            <span className="text-[10px] text-muted ml-1">lbs</span>
                            <p className="text-[10px] text-muted">
                              {pr.prType === 'heaviestSet' ? 'Heaviest set' : 'Est. 1RM'}
                            </p>
                          </div>
                          <div className="relative ml-1 flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => toggleComments(pr)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isCommentsOpen ? 'text-accent-light bg-accent/10' : 'text-muted hover:text-accent-light hover:bg-white/[0.04]'
                              }`}
                              title="Comments"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </button>
                            {hasReacted ? (
                              <span
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/15 text-sm"
                                title={`Reacted: ${reaction.reaction_type}`}
                              >
                                {getReactionEmoji(reaction.reaction_type)}
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={isSending}
                                  onClick={() => setShowReactionPicker(isPickerOpen ? null : key)}
                                  className="p-1.5 rounded-lg text-muted hover:text-amber-400 hover:bg-white/[0.04] transition-colors disabled:opacity-60"
                                  title="React"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                  </svg>
                                </button>
                                {isPickerOpen && (
                                  <div className="absolute right-0 top-full mt-1 flex gap-1 rounded-lg p-1.5 shadow-lg z-10 border border-white/[0.06]" style={{ background: 'rgba(17,17,19,0.96)', backdropFilter: 'blur(12px)' }}>
                                    {(['kudos', 'strong', 'fire'] as ReactionType[]).map((type) => (
                                      <button
                                        key={type}
                                        type="button"
                                        onClick={() => handleSendReaction(pr, type)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.08] text-lg transition-colors"
                                        title={type}
                                      >
                                        {getReactionEmoji(type)}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {isCommentsOpen && (
                          <div className="mt-3 pt-3 border-t border-white/[0.04]">
                            {isLoadingComments && (
                              <p className="text-xs text-muted">Loading comments...</p>
                            )}
                            {!isLoadingComments && comments.length === 0 && (
                              <p className="text-xs text-muted mb-2">No comments yet</p>
                            )}
                            {!isLoadingComments && comments.length > 0 && (
                              <div className="space-y-2 mb-3">
                                {comments.map((c) => (
                                  <div key={c.id} className="flex items-start gap-2">
                                    <AvatarCircle name={c.from_username} size="sm" />
                                    <div className="text-sm">
                                      <span className="font-medium text-foreground">{c.from_username}</span>
                                      <span className="text-foreground/70 ml-1.5">{c.comment}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handlePostComment(pr)}
                                placeholder="Add a comment..."
                                maxLength={200}
                                className="flex-1 text-sm px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/20 transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => handlePostComment(pr)}
                                disabled={postingComment || !newComment.trim()}
                                className="btn-primary text-xs px-3 py-2 disabled:opacity-50"
                              >
                                Post
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
