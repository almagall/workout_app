'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  getUnreadNotificationCount,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearAllNotifications,
  acceptFriendRequest,
  declineFriendRequest,
  type NotificationWithFrom,
  type PRKudosMetadata,
  type PRCommentMetadata,
  type AchievementUnlockedMetadata,
  type ReactionType,
} from '@/lib/friends'

function getReactionEmoji(type?: ReactionType): string {
  switch (type) {
    case 'kudos': return '👍'
    case 'strong': return '💪'
    case 'fire': return '🔥'
    default: return '👍'
  }
}

type NotificationMetadata = PRKudosMetadata | PRCommentMetadata | AchievementUnlockedMetadata | null | undefined

function isPRKudosMetadata(m: NotificationMetadata): m is PRKudosMetadata {
  return !!m && typeof m === 'object' && 'reaction_type' in m
}

function isPRCommentMetadata(m: NotificationMetadata): m is PRCommentMetadata {
  return !!m && typeof m === 'object' && 'comment_preview' in m
}

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationWithFrom[]>([])
  const [loading, setLoading] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(() => {
    getUnreadNotificationCount().then(setUnreadCount)
    if (open) getNotifications(30).then(setNotifications)
  }, [open])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 15000)
    return () => clearInterval(t)
  }, [refresh])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAccept = async (refId: string | null) => {
    if (!refId || actingId) return
    setActingId(refId)
    setLoading(true)
    const res = await acceptFriendRequest(refId)
    if (res.ok) {
      const n = notifications.find((x) => x.reference_id === refId && x.type === 'friend_request')
      if (n) await markNotificationRead(n.id)
      refresh()
    }
    setActingId(null)
    setLoading(false)
  }

  const handleDecline = async (refId: string | null, notificationId: string) => {
    if (!refId || actingId) return
    setActingId(refId)
    setLoading(true)
    const res = await declineFriendRequest(refId)
    if (res.ok) await markNotificationRead(notificationId)
    refresh()
    setActingId(null)
    setLoading(false)
  }

  const formatTime = (createdAt: string) => {
    const d = new Date(createdAt)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString()
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={async () => {
          const willOpen = !open
          setOpen(willOpen)
          if (willOpen) {
            const list = await getNotifications(30)
            setNotifications(list)
            if (unreadCount > 0) {
              await markAllNotificationsRead()
              setUnreadCount(0)
            }
          }
        }}
        className="relative min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-md text-muted hover:text-foreground hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-accent/50"
        aria-label="Notifications"
      >
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-4 top-[4.5rem] z-[100] w-[min(20rem,calc(100vw-2rem))] max-h-[min(24rem,70vh)] overflow-auto rounded-xl border border-white/[0.08] bg-[#111113] shadow-[0_24px_48px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)] lg:absolute lg:right-0 lg:top-auto lg:mt-1 lg:w-80">
          <div className="p-2 border-b border-white/[0.06] flex justify-between items-center gap-2">
            <span className="font-semibold text-foreground text-sm">Notifications</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={async () => {
                  await clearAllNotifications()
                  setNotifications([])
                  setUnreadCount(0)
                  refresh()
                }}
                className="min-h-[44px] px-3 py-2 text-xs text-muted hover:text-foreground whitespace-nowrap rounded-md hover:bg-white/[0.04]"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-md text-muted hover:text-foreground hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-accent/40"
                aria-label="Close notifications"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {notifications.length === 0 && (
              <div className="p-4 text-sm text-[#888888]">No notifications</div>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 text-sm ${!n.read ? 'bg-[#252525]' : ''}`}
              >
                {n.type === 'friend_request' && (
                  <>
                    <p className="text-foreground">
                      <span className="font-medium">{n.from_username}</span> sent you a friend request.
                    </p>
                    <p className="text-xs text-[#888888] mt-0.5">{formatTime(n.created_at)}</p>
                    {n.reference_id && (
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          disabled={loading && actingId === n.reference_id}
                          onClick={() => handleAccept(n.reference_id)}
                          className="min-h-[44px] px-4 py-2.5 rounded btn-primary text-xs disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={loading && actingId === n.reference_id}
                          onClick={() => handleDecline(n.reference_id, n.id)}
                          className="min-h-[44px] px-4 py-2.5 rounded border border-white/[0.06] text-foreground text-xs hover:bg-white/[0.04] disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </>
                )}
                {n.type === 'friend_accepted' && (
                  <>
                    <p className="text-foreground">
                      <span className="font-medium">{n.from_username}</span> accepted your friend request.
                    </p>
                    <p className="text-xs text-[#888888] mt-0.5">{formatTime(n.created_at)}</p>
                    <Link
                      href="/friends"
                      onClick={() => { markNotificationRead(n.id); setOpen(false); }}
                      className="inline-block mt-1 text-xs text-foreground underline"
                    >
                      View friends
                    </Link>
                  </>
                )}
                {n.type === 'pr_kudos' && isPRKudosMetadata(n.metadata) && (
                  <>
                    <p className="text-foreground">
                      <span className="font-medium">{n.from_username}</span> reacted {getReactionEmoji(n.metadata?.reaction_type)} to your{' '}
                      <span className="text-amber-300 font-medium">{n.metadata?.exercise_name ?? 'exercise'}</span> PR!
                    </p>
                    {n.metadata && (
                      <p className="text-xs text-[#888888] mt-0.5">
                        {n.metadata.value} lbs ({n.metadata.pr_type === 'heaviestSet' ? 'Heaviest' : 'Est. 1RM'})
                      </p>
                    )}
                    <p className="text-xs text-[#888888] mt-0.5">{formatTime(n.created_at)}</p>
                  </>
                )}
                {n.type === 'pr_comment' && isPRCommentMetadata(n.metadata) && (
                  <>
                    <p className="text-foreground">
                      <span className="font-medium">{n.from_username}</span> commented on your{' '}
                      <span className="text-amber-300 font-medium">{n.metadata?.exercise_name ?? 'exercise'}</span> PR
                    </p>
                    {n.metadata?.comment_preview && (
                      <p className="text-xs text-[#e5e5e5] mt-1 italic">&quot;{n.metadata.comment_preview}&quot;</p>
                    )}
                    <p className="text-xs text-[#888888] mt-0.5">{formatTime(n.created_at)}</p>
                  </>
                )}
                {n.type === 'achievement_unlocked' && n.metadata && 'achievement_name' in n.metadata && (
                  <>
                    <p className="text-foreground">
                      <span className="font-medium text-amber-400">Achievement unlocked:</span>{' '}
                      {n.metadata.achievement_name}
                    </p>
                    <p className="text-xs text-[#888888] mt-0.5">{formatTime(n.created_at)}</p>
                    <Link
                      href="/achievements"
                      onClick={() => { markNotificationRead(n.id); setOpen(false); }}
                      className="inline-block mt-1 text-xs text-foreground underline"
                    >
                      View achievements
                    </Link>
                  </>
                )}
                {n.type === 'challenge_received' && (
                  <>
                    <p className="text-foreground">
                      <span className="font-medium">{n.from_username}</span> challenged you!{' '}
                      {n.metadata && typeof n.metadata === 'object' && 'challenge_type' in n.metadata && (
                        <span className="text-muted">
                          ({(n.metadata as Record<string, unknown>).challenge_type === 'workout_count' ? 'Most Workouts' : `e1RM — ${(n.metadata as Record<string, unknown>).exercise_name}`}{' '}
                          · {String((n.metadata as Record<string, unknown>).duration_days)}d)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[#888888] mt-0.5">{formatTime(n.created_at)}</p>
                    <Link href="/friends" onClick={() => { markNotificationRead(n.id); setOpen(false); }} className="inline-block mt-1 text-xs text-foreground underline">View challenges</Link>
                  </>
                )}
                {n.type === 'challenge_accepted' && (
                  <>
                    <p className="text-foreground">
                      <span className="font-medium">{n.from_username}</span> accepted your challenge!
                    </p>
                    <p className="text-xs text-[#888888] mt-0.5">{formatTime(n.created_at)}</p>
                    <Link href="/friends" onClick={() => { markNotificationRead(n.id); setOpen(false); }} className="inline-block mt-1 text-xs text-foreground underline">View challenges</Link>
                  </>
                )}
                {n.type === 'challenge_completed' && (
                  <>
                    <p className="text-foreground">
                      Challenge complete!{' '}
                      {n.metadata && typeof n.metadata === 'object' && 'winner_id' in n.metadata
                        ? (n.metadata as Record<string, unknown>).winner_id
                          ? 'Check results'
                          : "It's a tie!"
                        : ''}
                    </p>
                    <p className="text-xs text-[#888888] mt-0.5">{formatTime(n.created_at)}</p>
                    <Link href="/friends" onClick={() => { markNotificationRead(n.id); setOpen(false); }} className="inline-block mt-1 text-xs text-foreground underline">View results</Link>
                  </>
                )}
                {n.type === 'accountability_request' && (
                  <>
                    <p className="text-foreground">
                      <span className="font-medium">{n.from_username}</span> wants to be accountability partners
                    </p>
                    <p className="text-xs text-[#888888] mt-0.5">{formatTime(n.created_at)}</p>
                    <Link href="/friends" onClick={() => { markNotificationRead(n.id); setOpen(false); }} className="inline-block mt-1 text-xs text-foreground underline">View request</Link>
                  </>
                )}
                {n.type === 'accountability_accepted' && (
                  <>
                    <p className="text-foreground">
                      <span className="font-medium">{n.from_username}</span> is now your accountability partner!
                    </p>
                    <p className="text-xs text-[#888888] mt-0.5">{formatTime(n.created_at)}</p>
                    <Link href="/friends" onClick={() => { markNotificationRead(n.id); setOpen(false); }} className="inline-block mt-1 text-xs text-foreground underline">View partners</Link>
                  </>
                )}
                {n.type === 'accountability_nudge' && (
                  <>
                    <p className="text-foreground">
                      <span className="font-medium">{n.from_username}</span> is nudging you to train this week!
                    </p>
                    <p className="text-xs text-[#888888] mt-0.5">{formatTime(n.created_at)}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
