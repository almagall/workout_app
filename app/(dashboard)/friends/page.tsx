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
  getAllowFriendsSeePRs,
  setAllowFriendsSeePRs,
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

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
  const [allowFriendsSeePRs, setAllowFriendsSeePRsState] = useState(true)
  const [viewingFriend, setViewingFriend] = useState<FriendRow | null>(null)
  const [friendPRs, setFriendPRs] = useState<RecentPR[]>([])
  const [friendPRsLabels, setFriendPRsLabels] = useState<Record<string, string>>({})
  const [friendPRsLoading, setFriendPRsLoading] = useState(false)
  const [friendPRsError, setFriendPRsError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [reactedPRs, setReactedPRs] = useState<Map<string, ReactionInfo>>(new Map())
  const [sendingReaction, setSendingReaction] = useState<string | null>(null)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  // Comments state
  const [expandedComments, setExpandedComments] = useState<string | null>(null)
  const [prComments, setPRComments] = useState<Map<string, PRComment[]>>(new Map())
  const [loadingComments, setLoadingComments] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)

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
    getAllowFriendsSeePRs(currentUser.id).then(setAllowFriendsSeePRsState)
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
    
    // Load comments if not already loaded
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
      // Reload comments
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

  const toggleAllowPRs = async () => {
    const next = !allowFriendsSeePRs
    await setAllowFriendsSeePRs(next)
    setAllowFriendsSeePRsState(next)
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-[#888888]">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Friends</h1>

      {/* Add friend button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2 bg-white text-black font-medium rounded-md hover:bg-[#e5e5e5]"
        >
          Add Friend
        </button>
        {addSuccess && <p className="mt-2 text-sm text-green-400">{addSuccess}</p>}
      </div>

      {/* Add friend modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setShowAddModal(false)}>
          <div
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#2a2a2a] flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Add Friend</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#2a2a2a]"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSendRequest} className="p-4">
              <label className="block text-sm text-[#e5e5e5] mb-2">Enter username</label>
              <input
                type="text"
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                placeholder="Username"
                autoFocus
                className="w-full px-3 py-2 border border-[#2a2a2a] bg-[#111111] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white mb-3"
              />
              {addError && <p className="mb-3 text-sm text-red-400">{addError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded border border-[#2a2a2a] text-[#e5e5e5] text-sm hover:bg-[#2a2a2a]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-white text-black font-medium rounded-md hover:bg-[#e5e5e5]"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pending requests */}
      {pending.length > 0 && (
        <section className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-4 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">Pending requests</h2>
          <ul className="space-y-2">
            {pending.map((req) => (
              <li
                key={req.id}
                className="flex items-center justify-between py-2 border-b border-[#2a2a2a] last:border-0"
              >
                <span className="text-white font-medium">{req.from_username}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!!actingId}
                    onClick={() => handleAccept(req.id)}
                    className="px-3 py-1 rounded bg-white text-black text-sm font-medium hover:bg-[#e5e5e5] disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={!!actingId}
                    onClick={() => handleDecline(req.id)}
                    className="px-3 py-1 rounded border border-[#2a2a2a] text-[#e5e5e5] text-sm hover:bg-[#2a2a2a] disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Friends list */}
      <section className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-4 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Your friends</h2>
        {friends.length === 0 ? (
          <p className="text-[#888888] text-sm">No friends yet. Send a request by username above.</p>
        ) : (
          <ul className="space-y-2">
            {friends.map((f) => (
              <li
                key={f.user_id}
                className="flex items-center justify-between py-2 border-b border-[#2a2a2a] last:border-0"
              >
                <span className="text-white font-medium">{f.username}</span>
                <button
                  type="button"
                  onClick={() => loadFriendPRs(f)}
                  className="text-sm text-[#888888] hover:text-white"
                >
                  View recent PRs
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Privacy: allow friends to see my PRs */}
      <section className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-4 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Privacy</h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allowFriendsSeePRs}
            onChange={toggleAllowPRs}
            className="rounded border-[#2a2a2a] bg-[#1a1a1a] text-white focus:ring-white"
          />
          <span className="text-[#e5e5e5] text-sm">Allow friends to see my recent PRs</span>
        </label>
      </section>

      {/* Modal / panel: Friend's recent PRs */}
      {viewingFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setViewingFriend(null)}>
          <div
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#2a2a2a] flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">{viewingFriend.username}&apos;s recent PRs</h3>
              <button
                type="button"
                onClick={() => setViewingFriend(null)}
                className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#2a2a2a]"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              {friendPRsLoading && <p className="text-[#888888] text-sm">Loading...</p>}
              {friendPRsError && <p className="text-red-400 text-sm">{friendPRsError}</p>}
              {!friendPRsLoading && !friendPRsError && friendPRs.length === 0 && (
                <p className="text-[#888888] text-sm">No recent PRs</p>
              )}
              {!friendPRsLoading && friendPRs.length > 0 && (
                <div className="space-y-3">
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
                        className="border-b border-[#2a2a2a] last:border-0 pb-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium">{pr.exerciseName}</p>
                            <p className="text-xs text-[#888888]">
                              {friendPRsLabels[pr.templateDayId] ?? 'Workout'} · {formatDate(pr.workoutDate)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-amber-300 font-semibold">{pr.value} lbs</span>
                            <p className="text-xs text-[#888888]">
                              {pr.prType === 'heaviestSet' ? 'Heaviest set' : 'Est. 1RM'}
                            </p>
                          </div>
                          <div className="relative ml-2 flex items-center gap-1">
                            {/* Comment toggle button */}
                            <button
                              type="button"
                              onClick={() => toggleComments(pr)}
                              className={`p-1.5 rounded-full transition-colors ${
                                isCommentsOpen ? 'text-blue-400 bg-blue-500/20' : 'text-[#888888] hover:text-blue-400 hover:bg-[#2a2a2a]'
                              }`}
                              title="Comments"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </button>
                            {/* Reaction button */}
                            {hasReacted ? (
                              <span
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-lg"
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
                                  className="p-1.5 rounded-full text-[#888888] hover:text-amber-400 hover:bg-[#2a2a2a] transition-colors disabled:opacity-60"
                                  title="React"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                  </svg>
                                </button>
                                {isPickerOpen && (
                                  <div className="absolute right-0 top-full mt-1 flex gap-1 bg-[#2a2a2a] rounded-full p-1 shadow-lg z-10">
                                    {(['kudos', 'strong', 'fire'] as ReactionType[]).map((type) => (
                                      <button
                                        key={type}
                                        type="button"
                                        onClick={() => handleSendReaction(pr, type)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#3a3a3a] text-lg transition-colors"
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
                        {/* Comments section */}
                        {isCommentsOpen && (
                          <div className="mt-2 pl-2 border-l-2 border-[#2a2a2a]">
                            {isLoadingComments && (
                              <p className="text-xs text-[#888888]">Loading comments...</p>
                            )}
                            {!isLoadingComments && comments.length === 0 && (
                              <p className="text-xs text-[#888888] mb-2">No comments yet</p>
                            )}
                            {!isLoadingComments && comments.length > 0 && (
                              <div className="space-y-2 mb-2">
                                {comments.map((c) => (
                                  <div key={c.id} className="text-sm">
                                    <span className="font-medium text-white">{c.from_username}</span>
                                    <span className="text-[#e5e5e5] ml-1">{c.comment}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2 mt-2">
                              <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handlePostComment(pr)}
                                placeholder="Add a comment..."
                                maxLength={200}
                                className="flex-1 text-sm px-2 py-1 rounded bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder-[#888888] focus:outline-none focus:border-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => handlePostComment(pr)}
                                disabled={postingComment || !newComment.trim()}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
