'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-simple'
import {
  sendPRReaction,
  getReactedPRs,
  addPRComment,
  getPRComments,
  type ReactionType,
  type ReactionInfo,
  type PRComment,
} from '@/lib/friends'
import type { FeedPR, FeedWorkout, FeedItem } from '@/app/api/friends/feed/route'

function formatDate(dateStr: string): string {
  const dateOnly = dateStr.slice(0, 10)
  const [y, m, d] = dateOnly.split('-').map(Number)
  
  // Use UTC to avoid timezone issues
  const date = new Date(Date.UTC(y, m - 1, d))
  const now = new Date()
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  
  const diffDays = Math.floor((todayUTC.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  // Filter out future dates (negative days)
  if (diffDays < 0) return ''
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getReactionEmoji(type: ReactionType): string {
  switch (type) {
    case 'kudos': return '👍'
    case 'strong': return '💪'
    case 'fire': return '🔥'
  }
}

export function FriendActivityFeed() {
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reactedPRs, setReactedPRs] = useState<Map<string, ReactionInfo>>(new Map())
  const [sendingReaction, setSendingReaction] = useState<string | null>(null)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [expandedComments, setExpandedComments] = useState<string | null>(null)
  const [prComments, setPRComments] = useState<Map<string, PRComment[]>>(new Map())
  const [loadingComments, setLoadingComments] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  const loadFeed = useCallback(async (userId: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/friends/feed?currentUserId=${encodeURIComponent(userId)}&limit=20`)
      if (!res.ok) throw new Error('Failed to load feed')
      const data = await res.json()
      
      // Filter out any items with future dates (timezone issues can cause this)
      const now = new Date()
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const validFeed = (data.feed ?? []).filter((item: FeedItem) => {
        let dateStr = ''
        if (item.type === 'workout') {
          dateStr = item.workoutDate
        } else if (item.type === 'achievement') {
          dateStr = item.unlocked_at.slice(0, 10)
        } else if (item.type === 'pr') {
          dateStr = item.workoutDate
        }
        
        if (!dateStr) return false
        
        const [y, m, d] = dateStr.split('-').map(Number)
        const itemDate = new Date(Date.UTC(y, m - 1, d))
        return itemDate.getTime() <= todayUTC.getTime()
      })
      
      setFeed(validFeed)

      // Load reactions only for PR items (workout and achievement items have no reactions)
      const prItems = (data.feed ?? []).filter((x: FeedItem) => x.type === 'pr') as FeedPR[]
      const friendIds = [...new Set(prItems.map((p) => p.user_id))] as string[]
      const allReacted = new Map<string, ReactionInfo>()
      for (const friendId of friendIds) {
        const reacted = await getReactedPRs(friendId)
        reacted.forEach((v, k) => allReacted.set(`${friendId}|${k}`, v))
      }
      setReactedPRs(allReacted)
    } catch (e) {
      setError('Unable to load friend activity')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
    if (currentUser) {
      loadFeed(currentUser.id)
    } else {
      setLoading(false)
    }
  }, [loadFeed])

  // Auto-refresh feed every 5 minutes
  useEffect(() => {
    if (!user) return
    
    const intervalId = setInterval(() => {
      loadFeed(user.id)
    }, 300000) // 5 minutes
    
    // Cleanup interval on unmount
    return () => clearInterval(intervalId)
  }, [user, loadFeed])

  const handleSendReaction = async (pr: FeedPR, reactionType: ReactionType) => {
    if (!user || sendingReaction) return
    const key = `${pr.user_id}|${pr.exerciseName}|${pr.templateDayId}|${pr.workoutDate}|${pr.prType}`
    if (reactedPRs.has(key)) return
    
    setSendingReaction(key)
    setShowReactionPicker(null)
    
    const result = await sendPRReaction({
      to_user_id: pr.user_id,
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

  const toggleComments = async (pr: FeedPR) => {
    const key = `${pr.user_id}|${pr.exerciseName}|${pr.templateDayId}|${pr.workoutDate}|${pr.prType}`
    if (expandedComments === key) {
      setExpandedComments(null)
      return
    }
    setExpandedComments(key)
    setNewComment('')
    if (!prComments.has(key)) {
      setLoadingComments(key)
      const comments = await getPRComments(
        pr.user_id,
        pr.exerciseName,
        pr.templateDayId,
        pr.workoutDate,
        pr.prType
      )
      setPRComments((prev) => new Map(prev).set(key, comments))
      setLoadingComments(null)
    }
  }

  const handlePostComment = async (pr: FeedPR) => {
    if (!user || postingComment || !newComment.trim()) return
    const key = `${pr.user_id}|${pr.exerciseName}|${pr.templateDayId}|${pr.workoutDate}|${pr.prType}`
    setPostingComment(true)
    const result = await addPRComment(
      {
        to_user_id: pr.user_id,
        exercise_name: pr.exerciseName,
        template_day_id: pr.templateDayId,
        workout_date: pr.workoutDate,
        pr_type: pr.prType,
        value: pr.value,
      },
      newComment
    )
    if (result.ok) {
      const comments = await getPRComments(
        pr.user_id,
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

  if (!user) return null

  return (
    <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] overflow-hidden">
      <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Friend Activity</h2>
        <Link href="/friends" className="text-sm text-amber-400 hover:text-amber-300">
          View all
        </Link>
      </div>
      <div className="p-4 h-[400px] overflow-y-auto">
        {loading && (
          <p className="text-[#888888] text-sm text-center py-4">Loading...</p>
        )}
        {error && (
          <p className="text-red-400 text-sm text-center py-4">{error}</p>
        )}
        {!loading && !error && feed.length === 0 && (
          <div className="text-center py-4">
            <p className="text-[#888888] text-sm mb-2">No recent friend activity</p>
            <Link href="/friends" className="text-sm text-amber-400 hover:text-amber-300">
              Add friends to see their PRs
            </Link>
          </div>
        )}
        {!loading && feed.length > 0 && (
          <div className="space-y-3">
            {feed.slice(0, 5).map((item, i) => {
              if (item.type === 'achievement') {
                return (
                  <div
                    key={`${item.user_id}-achievement-${item.achievement_id}-${item.unlocked_at}-${i}`}
                    className="flex items-start gap-3 py-2 border-b border-[#2a2a2a] last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm font-medium shrink-0">
                      {item.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">
                        <span className="font-medium">{item.username}</span>
                        <span className="text-[#888888]"> unlocked </span>
                        <span className="text-amber-400 font-medium">{item.achievement_name}</span>
                      </p>
                      <p className="text-[#888888] text-xs mt-0.5">{formatDate(item.unlocked_at)}</p>
                    </div>
                  </div>
                )
              }
              if (item.type === 'workout') {
                return (
                  <div
                    key={`${item.user_id}-workout-${item.workoutDate}-${item.templateDayId}-${i}`}
                    className="flex items-start gap-3 py-2 border-b border-[#2a2a2a] last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-medium shrink-0">
                      {item.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">
                        <span className="font-medium">{item.username}</span>
                        <span className="text-[#888888]"> completed </span>
                        <span className="text-white font-medium">{item.dayLabel || 'Workout'}</span>
                        {item.hasPRs && (
                          <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded bg-amber-600/40 text-amber-300 border border-amber-500/50">
                            PR!
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[#888888] text-xs">
                          {item.exerciseCount} exercise{item.exerciseCount !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[#666666] text-xs">·</span>
                        <span className="text-[#888888] text-xs">{formatDate(item.workoutDate)}</span>
                      </div>
                    </div>
                  </div>
                )
              }
              const pr = item
              const key = `${pr.user_id}|${pr.exerciseName}|${pr.templateDayId}|${pr.workoutDate}|${pr.prType}`
              const reaction = reactedPRs.get(key)
              const hasReacted = !!reaction
              const isSending = sendingReaction === key
              const isPickerOpen = showReactionPicker === key
              const isCommentsOpen = expandedComments === key
              const comments = prComments.get(key) ?? []
              const isLoadingComments = loadingComments === key
              return (
                <div
                  key={`${pr.user_id}-${pr.exerciseName}-${pr.workoutDate}-${pr.prType}-${i}`}
                  className="py-2 border-b border-[#2a2a2a] last:border-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm font-medium shrink-0">
                      {pr.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">
                        <span className="font-medium">{pr.username}</span>
                        <span className="text-[#888888]"> hit a new PR!</span>
                      </p>
                      <p className="text-white font-medium mt-0.5">{pr.exerciseName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-amber-300 font-semibold text-sm">{pr.value} lbs</span>
                        <span className="text-[#888888] text-xs">
                          {pr.prType === 'heaviestSet' ? 'Heaviest' : 'Est. 1RM'}
                        </span>
                        <span className="text-[#666666] text-xs">·</span>
                        <span className="text-[#888888] text-xs">{formatDate(pr.workoutDate)}</span>
                      </div>
                    </div>
                    <div className="relative shrink-0 flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => toggleComments(pr)}
                        className={`p-1.5 rounded-full transition-colors ${
                          isCommentsOpen ? 'text-blue-400 bg-blue-500/20' : 'text-[#888888] hover:text-blue-400 hover:bg-[#2a2a2a]'
                        }`}
                        title="Comment"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>
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
                  {isCommentsOpen && (
                    <div className="mt-2 ml-11 pl-2 border-l-2 border-[#2a2a2a]">
                      {isLoadingComments && (
                        <p className="text-xs text-[#888888]">Loading comments...</p>
                      )}
                      {!isLoadingComments && comments.length === 0 && (
                        <p className="text-xs text-[#888888] mb-2">No comments yet</p>
                      )}
                      {!isLoadingComments && comments.length > 0 && (
                        <div className="space-y-1.5 mb-2">
                          {comments.map((c) => (
                            <div key={c.id} className="text-xs">
                              <span className="font-medium text-white">{c.from_username}</span>
                              <span className="text-[#e5e5e5] ml-1">{c.comment}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handlePostComment(pr)}
                          placeholder="Add a comment..."
                          maxLength={200}
                          className="flex-1 text-xs px-2 py-1.5 rounded bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder-[#888888] focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handlePostComment(pr)}
                          disabled={postingComment || !newComment.trim()}
                          className="px-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
  )
}
