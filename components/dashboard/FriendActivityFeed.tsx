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

  const date = new Date(y, m - 1, d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const diffDays = Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return ''
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getReactionEmoji(type: ReactionType): string {
  switch (type) {
    case 'kudos': return '👍'
    case 'strong': return '💪'
    case 'fire': return '🔥'
  }
}

function AvatarCircle({ name, variant }: { name: string; variant: 'pr' | 'workout' | 'achievement' }) {
  const colors = {
    pr: 'bg-amber-500/15 text-amber-400 border-amber-500/15',
    workout: 'bg-accent/10 text-accent-light border-accent/15',
    achievement: 'bg-amber-500/15 text-amber-400 border-amber-500/15',
  }
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 border ${colors[variant]}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export interface FriendActivityFeedProps {
  maxItems?: number
  showViewAllLink?: boolean
  scrollHeight?: string
}

export function FriendActivityFeed({ maxItems = 5, showViewAllLink = true, scrollHeight = '400px' }: FriendActivityFeedProps = {}) {
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
  const [actionError, setActionError] = useState<string | null>(null)

  const loadFeed = useCallback(async (userId: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/friends/feed?currentUserId=${encodeURIComponent(userId)}&limit=20`)
      if (!res.ok) throw new Error('Failed to load feed')
      const data = await res.json()
      
      const now = new Date()
      const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate())
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
        const itemDate = new Date(y, m - 1, d)
        return itemDate.getTime() <= todayLocal.getTime()
      })
      
      setFeed(validFeed)

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

  useEffect(() => {
    if (!user) return
    const intervalId = setInterval(() => {
      loadFeed(user.id)
    }, 300000)
    return () => clearInterval(intervalId)
  }, [user, loadFeed])

  const handleSendReaction = async (pr: FeedPR, reactionType: ReactionType) => {
    if (!user || sendingReaction) return
    const key = `${pr.user_id}|${pr.exerciseName}|${pr.templateDayId}|${pr.workoutDate}|${pr.prType}`
    if (reactedPRs.has(key)) return
    
    setActionError(null)
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
    } else {
      setActionError(result.error ?? 'Could not send reaction')
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
    setActionError(null)
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
    } else {
      setActionError(result.error ?? 'Could not post comment')
    }
    setPostingComment(false)
  }

  if (!user) return null

  return (
    <div className="rounded-2xl border border-white/[0.06] overflow-hidden relative" style={{ background: 'linear-gradient(180deg, rgba(19,19,22,0.95), rgba(13,13,16,0.98))', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
      <div className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.05), transparent 70%)' }} />
      <div className="px-4 py-3.5 border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-0.5 h-4 rounded-full bg-accent/50" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Activity</h2>
        </div>
        {showViewAllLink && (
          <Link href="/friends" className="text-xs font-medium text-accent-light/70 hover:text-accent-light transition-colors">
            View all
          </Link>
        )}
      </div>
      <div className="overflow-y-auto" style={scrollHeight ? { height: scrollHeight } : undefined}>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}
        {error && (
          <p className="text-red-400 text-sm text-center py-8">{error}</p>
        )}
        {actionError && (
          <p className="text-red-400 text-xs text-center py-2 px-4">{actionError}</p>
        )}
        {!loading && !error && feed.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <p className="text-muted text-sm mb-1">No recent activity</p>
            <Link href="/friends" className="text-xs text-accent-light/70 hover:text-accent-light transition-colors">
              Add friends to see their updates
            </Link>
          </div>
        )}
        {!loading && feed.length > 0 && (
          <div className="divide-y divide-white/[0.03]">
            {feed.slice(0, maxItems).map((item, i) => {
              if (item.type === 'achievement') {
                return (
                  <div
                    key={`${item.user_id}-achievement-${item.achievement_id}-${item.unlocked_at}-${i}`}
                    className="flex items-start gap-3 px-4 py-3.5 hover:bg-white/[0.015] transition-colors"
                  >
                    <AvatarCircle name={item.username} variant="achievement" />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm">
                        <span className="font-medium">{item.username}</span>
                        <span className="text-muted"> unlocked </span>
                        <span className="text-amber-400 font-medium">{item.achievement_name}</span>
                      </p>
                      <p className="text-muted text-[11px] mt-0.5">{formatDate(item.unlocked_at)}</p>
                    </div>
                  </div>
                )
              }
              if (item.type === 'workout') {
                return (
                  <div
                    key={`${item.user_id}-workout-${item.workoutDate}-${item.templateDayId}-${i}`}
                    className="flex items-start gap-3 px-4 py-3.5 hover:bg-white/[0.015] transition-colors"
                  >
                    <AvatarCircle name={item.username} variant="workout" />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm">
                        <span className="font-medium">{item.username}</span>
                        <span className="text-muted"> completed </span>
                        <span className="text-foreground font-medium">{item.dayLabel || 'Workout'}</span>
                        {item.hasPRs && (
                          <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/10">
                            PR
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-muted text-[11px]">
                          {item.exerciseCount} exercise{item.exerciseCount !== 1 ? 's' : ''}
                        </span>
                        <span className="text-white/10 text-[11px]">·</span>
                        <span className="text-muted text-[11px]">{formatDate(item.workoutDate)}</span>
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
                  className="px-4 py-3.5 hover:bg-white/[0.015] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <AvatarCircle name={pr.username} variant="pr" />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm">
                        <span className="font-medium">{pr.username}</span>
                        <span className="text-muted"> hit a new PR</span>
                      </p>
                      <p className="text-foreground font-medium text-sm mt-0.5">{pr.exerciseName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-accent-light font-bold text-sm tabular-nums">{pr.value} lbs</span>
                        <span className="text-white/10 text-[11px]">·</span>
                        <span className="text-muted text-[11px]">
                          {pr.prType === 'heaviestSet' ? 'Heaviest' : 'Est. 1RM'}
                        </span>
                        <span className="text-white/10 text-[11px]">·</span>
                        <span className="text-muted text-[11px]">{formatDate(pr.workoutDate)}</span>
                      </div>
                    </div>
                    <div className="relative shrink-0 flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => toggleComments(pr)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isCommentsOpen ? 'text-accent-light bg-accent/10' : 'text-muted hover:text-accent-light hover:bg-white/[0.04]'
                        }`}
                        title="Comment"
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
                    <div className="mt-3 ml-11 pt-3 border-t border-white/[0.04]">
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
                              <div className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center text-[9px] font-semibold text-foreground/60 flex-shrink-0 mt-0.5">
                                {c.from_username.charAt(0).toUpperCase()}
                              </div>
                              <div className="text-xs">
                                <span className="font-medium text-foreground">{c.from_username}</span>
                                <span className="text-foreground/60 ml-1">{c.comment}</span>
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
                          className="flex-1 text-xs px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => handlePostComment(pr)}
                          disabled={postingComment || !newComment.trim()}
                          className="px-3 py-2 text-xs font-medium rounded-lg bg-accent/20 text-accent-light hover:bg-accent/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
