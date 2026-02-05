'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-simple'
import {
  sendPRReaction,
  getReactedPRs,
  type ReactionType,
  type ReactionInfo,
} from '@/lib/friends'
import type { FeedPR } from '@/app/api/friends/feed/route'

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
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
  const [feed, setFeed] = useState<FeedPR[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reactedPRs, setReactedPRs] = useState<Map<string, ReactionInfo>>(new Map())
  const [sendingReaction, setSendingReaction] = useState<string | null>(null)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)

  const loadFeed = useCallback(async (userId: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/friends/feed?currentUserId=${encodeURIComponent(userId)}&limit=20`)
      if (!res.ok) throw new Error('Failed to load feed')
      const data = await res.json()
      setFeed(data.feed ?? [])

      // Load reactions for all friends in the feed
      const friendIds = [...new Set((data.feed ?? []).map((p: FeedPR) => p.user_id))] as string[]
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

  if (!user) return null

  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden">
      <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Friend Activity</h2>
        <Link href="/friends" className="text-sm text-amber-400 hover:text-amber-300">
          View all
        </Link>
      </div>
      <div className="p-4">
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
            {feed.slice(0, 5).map((pr, i) => {
              const key = `${pr.user_id}|${pr.exerciseName}|${pr.templateDayId}|${pr.workoutDate}|${pr.prType}`
              const reaction = reactedPRs.get(key)
              const hasReacted = !!reaction
              const isSending = sendingReaction === key
              const isPickerOpen = showReactionPicker === key
              
              return (
                <div
                  key={`${pr.user_id}-${pr.exerciseName}-${pr.workoutDate}-${pr.prType}-${i}`}
                  className="flex items-start gap-3 py-2 border-b border-[#2a2a2a] last:border-0"
                >
                  {/* Avatar placeholder */}
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
                  
                  <div className="relative shrink-0">
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
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
