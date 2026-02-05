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
  type FriendRequestWithFrom,
  type FriendRow,
} from '@/lib/friends'
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
      refresh()
    } else {
      setAddError(res.error ?? 'Failed to send request')
    }
  }

  const handleAccept = async (requestId: string) => {
    if (actingId) return
    setActingId(requestId)
    const res = await acceptFriendRequest(requestId)
    if (res.ok) refresh()
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
    try {
      const res = await fetch(
        `/api/friends/${encodeURIComponent(friend.user_id)}/prs?currentUserId=${encodeURIComponent(user.id)}&limit=10`
      )
      const data = await res.json()
      if (!res.ok) {
        setFriendPRsError(data.error || 'Could not load PRs')
        return
      }
      setFriendPRs(data.prs ?? [])
      setFriendPRsLabels(data.dayLabels ?? {})
    } catch {
      setFriendPRsError('Failed to load PRs')
    } finally {
      setFriendPRsLoading(false)
    }
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

      {/* Add friend by username */}
      <section className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-4 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Add friend</h2>
        <form onSubmit={handleSendRequest} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={addUsername}
            onChange={(e) => setAddUsername(e.target.value)}
            placeholder="Username"
            className="flex-1 min-w-[140px] px-3 py-2 border border-[#2a2a2a] bg-[#1a1a1a] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-white text-black font-medium rounded-md hover:bg-[#e5e5e5]"
          >
            Send request
          </button>
        </form>
        {addError && <p className="mt-2 text-sm text-red-400">{addError}</p>}
        {addSuccess && <p className="mt-2 text-sm text-green-400">{addSuccess}</p>}
      </section>

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
                <div className="space-y-2">
                  {friendPRs.map((pr, i) => (
                    <div
                      key={`${pr.exerciseName}-${pr.workoutDate}-${pr.prType}-${i}`}
                      className="flex items-center justify-between py-2 border-b border-[#2a2a2a] last:border-0"
                    >
                      <div>
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
