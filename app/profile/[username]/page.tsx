'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-simple'
import { sendFriendRequest, sendPRReaction, getReactedPRs, type ReactionType, type ReactionInfo } from '@/lib/friends'
import type { ProfileData } from '@/app/api/profile/[username]/route'

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatMemberSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getReactionEmoji(type: ReactionType): string {
  switch (type) {
    case 'kudos': return '👍'
    case 'strong': return '💪'
    case 'fire': return '🔥'
  }
}

export default function ProfilePage({ params }: { params: { username: string } }) {
  const { username } = params
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sendingRequest, setSendingRequest] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [reactedPRs, setReactedPRs] = useState<Map<string, ReactionInfo>>(new Map())
  const [sendingReaction, setSendingReaction] = useState<string | null>(null)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      const currentUser = getCurrentUser()
      setUser(currentUser)

      try {
        const url = `/api/profile/${encodeURIComponent(username)}${currentUser ? `?currentUserId=${encodeURIComponent(currentUser.id)}` : ''}`
        const res = await fetch(url)
        if (!res.ok) {
          if (res.status === 404) {
            setError('User not found')
          } else {
            setError('Failed to load profile')
          }
          setLoading(false)
          return
        }
        const data = await res.json()
        setProfile(data.profile)

        // Load reactions if can see PRs and is friend
        if (data.profile.can_see_prs && data.profile.is_friend && currentUser) {
          const reacted = await getReactedPRs(data.profile.user_id)
          setReactedPRs(reacted)
        }
      } catch (e) {
        setError('Failed to load profile')
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [username])

  const handleAddFriend = async () => {
    if (!user || !profile || sendingRequest) return
    setSendingRequest(true)
    const result = await sendFriendRequest(profile.username)
    if (result.ok) {
      setRequestSent(true)
    }
    setSendingRequest(false)
  }

  const handleSendReaction = async (pr: ProfileData['recent_prs'][0], reactionType: ReactionType) => {
    if (!user || !profile || sendingReaction) return
    const key = `${pr.exerciseName}|${pr.templateDayId}|${pr.workoutDate}|${pr.prType}`
    if (reactedPRs.has(key)) return

    setSendingReaction(key)
    setShowReactionPicker(null)

    const result = await sendPRReaction({
      to_user_id: profile.user_id,
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted">Loading profile...</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <p className="text-red-400 text-lg mb-4">{error || 'Profile not found'}</p>
        <Link href="/dashboard" className="text-amber-400 hover:text-amber-300">
          Return to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link href="/dashboard" className="text-muted hover:text-foreground text-sm mb-6 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Profile header */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6 mt-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-2xl font-bold shrink-0">
              {profile.username.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{profile.username}</h1>
                  <p className="text-muted text-sm">Member since {formatMemberSince(profile.member_since)}</p>
                </div>

                {/* Action button */}
                {!profile.is_own_profile && user && (
                  <div>
                    {profile.is_friend ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Friends
                      </span>
                    ) : profile.is_pending_request || requestSent ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-400 text-sm">
                        Pending
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleAddFriend}
                        disabled={sendingRequest}
                        className="px-4 py-1.5 bg-amber-500 text-black font-medium rounded-full hover:bg-amber-400 disabled:opacity-60 transition-colors text-sm"
                      >
                        {sendingRequest ? 'Sending...' : 'Add Friend'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-6 mt-4">
                <div>
                  <p className="text-2xl font-bold text-foreground">{profile.total_workouts}</p>
                  <p className="text-muted text-sm">Workouts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">{profile.recent_prs.length}</p>
                  <p className="text-muted text-sm">Recent PRs</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent PRs section */}
        <div className="bg-card rounded-xl border border-border shadow-card mt-6">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Recent PRs</h2>
          </div>
          <div className="p-4">
            {!profile.can_see_prs && (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-[#444444] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-muted">
                  {profile.is_friend
                    ? 'This user has hidden their PRs from friends'
                    : 'Become friends to see their PRs'}
                </p>
              </div>
            )}
            {profile.can_see_prs && profile.recent_prs.length === 0 && (
              <p className="text-muted text-center py-8">No recent PRs</p>
            )}
            {profile.can_see_prs && profile.recent_prs.length > 0 && (
              <div className="space-y-3">
                {profile.recent_prs.map((pr, i) => {
                  const key = `${pr.exerciseName}|${pr.templateDayId}|${pr.workoutDate}|${pr.prType}`
                  const reaction = reactedPRs.get(key)
                  const hasReacted = !!reaction
                  const isSending = sendingReaction === key
                  const isPickerOpen = showReactionPicker === key
                  const canReact = profile.is_friend && !profile.is_own_profile

                  return (
                    <div
                      key={`${pr.exerciseName}-${pr.workoutDate}-${pr.prType}-${i}`}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium">{pr.exerciseName}</p>
                        <p className="text-xs text-muted">
                          {profile.day_labels[pr.templateDayId] ?? 'Workout'} · {formatDate(pr.workoutDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-amber-300 font-semibold">{pr.value} lbs</span>
                        <p className="text-xs text-muted">
                          {pr.prType === 'heaviestSet' ? 'Heaviest set' : 'Est. 1RM'}
                        </p>
                      </div>
                      {canReact && (
                        <div className="relative ml-2">
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
                                className="p-1.5 rounded-full text-muted hover:text-amber-400 hover:bg-elevated transition-colors disabled:opacity-60"
                                title="React"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                </svg>
                              </button>
                              {isPickerOpen && (
                                <div className="absolute right-0 top-full mt-1 flex gap-1 bg-elevated rounded-full p-1 shadow-lg z-10">
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
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
