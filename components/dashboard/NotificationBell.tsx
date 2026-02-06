'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  getUnreadNotificationCount,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  acceptFriendRequest,
  declineFriendRequest,
  type NotificationWithFrom,
  type PRKudosMetadata,
  type PRCommentMetadata,
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

function isPRKudosMetadata(m: PRKudosMetadata | PRCommentMetadata | null | undefined): m is PRKudosMetadata {
  return !!m && 'reaction_type' in m || (!!m && !('comment_preview' in m))
}

function isPRCommentMetadata(m: PRKudosMetadata | PRCommentMetadata | null | undefined): m is PRCommentMetadata {
  return !!m && 'comment_preview' in m
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
            // Mark all as read when user opens dropdown (they have viewed them)
            if (unreadCount > 0) {
              await markAllNotificationsRead()
              setUnreadCount(0)
            }
          }
        }}
        className="relative p-2 rounded-md text-[#888888] hover:text-white hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Notifications"
      >
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-4 top-[4.5rem] z-50 w-[min(20rem,calc(100vw-2rem))] max-h-[min(24rem,70vh)] overflow-auto rounded-md border border-[#2a2a2a] bg-[#1a1a1a] shadow-lg lg:absolute lg:right-0 lg:top-auto lg:mt-1 lg:w-80">
          <div className="p-2 border-b border-[#2a2a2a] flex justify-between items-center gap-2">
            <span className="font-semibold text-white text-sm">Notifications</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={async () => {
                  await markAllNotificationsRead()
                  setUnreadCount(0)
                  refresh()
                }}
                className="text-xs text-[#888888] hover:text-white whitespace-nowrap"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-[#888888] hover:text-white hover:bg-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Close notifications"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="divide-y divide-[#2a2a2a]">
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
                    <p className="text-white">
                      <span className="font-medium">{n.from_username}</span> sent you a friend request.
                    </p>
                    <p className="text-xs text-[#888888] mt-0.5">{formatTime(n.created_at)}</p>
                    {n.reference_id && (
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          disabled={loading && actingId === n.reference_id}
                          onClick={() => handleAccept(n.reference_id)}
                          className="px-2 py-1 rounded bg-white text-black text-xs font-medium hover:bg-[#e5e5e5] disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={loading && actingId === n.reference_id}
                          onClick={() => handleDecline(n.reference_id, n.id)}
                          className="px-2 py-1 rounded border border-[#2a2a2a] text-[#e5e5e5] text-xs hover:bg-[#2a2a2a] disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </>
                )}
                {n.type === 'friend_accepted' && (
                  <>
                    <p className="text-white">
                      <span className="font-medium">{n.from_username}</span> accepted your friend request.
                    </p>
                    <p className="text-xs text-[#888888] mt-0.5">{formatTime(n.created_at)}</p>
                    <Link
                      href="/friends"
                      onClick={() => { markNotificationRead(n.id); setOpen(false); }}
                      className="inline-block mt-1 text-xs text-white underline"
                    >
                      View friends
                    </Link>
                  </>
                )}
                {n.type === 'pr_kudos' && isPRKudosMetadata(n.metadata) && (
                  <>
                    <p className="text-white">
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
                    <p className="text-white">
                      <span className="font-medium">{n.from_username}</span> commented on your{' '}
                      <span className="text-amber-300 font-medium">{n.metadata?.exercise_name ?? 'exercise'}</span> PR
                    </p>
                    {n.metadata?.comment_preview && (
                      <p className="text-xs text-[#e5e5e5] mt-1 italic">&quot;{n.metadata.comment_preview}&quot;</p>
                    )}
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
