/**
 * Friends and notifications: lookup by username, send/accept/decline requests,
 * list friends, notifications (friend_request, friend_accepted).
 */

import { getCurrentUser } from './auth-simple'
import { createClient } from './supabase/client'

export interface PublicUser {
  user_id: string
  username: string
}

export interface FriendRequestRow {
  id: string
  from_user_id: string
  to_user_id: string
  status: string
  created_at: string
}

export interface FriendRequestWithFrom {
  id: string
  from_user_id: string
  from_username: string
  status: string
  created_at: string
}

export interface FriendRow {
  user_id: string
  username: string
}

export type NotificationType = 'friend_request' | 'friend_accepted' | 'pr_kudos' | 'pr_comment' | 'achievement_unlocked'

export type ReactionType = 'kudos' | 'strong' | 'fire'

export interface NotificationRow {
  id: string
  user_id: string
  type: NotificationType
  from_user_id: string
  reference_id: string | null
  metadata?: string | null
  read: boolean
  created_at: string
}

export interface AchievementUnlockedMetadata {
  achievement_id: string
  achievement_name: string
}

export interface NotificationWithFrom {
  id: string
  type: NotificationType
  from_user_id: string
  from_username: string
  reference_id: string | null
  metadata?: PRKudosMetadata | PRCommentMetadata | AchievementUnlockedMetadata | null
  read: boolean
  created_at: string
}

export interface PRKudosMetadata {
  exercise_name: string
  pr_type: 'heaviestSet' | 'e1RM'
  value: number
  workout_date: string
  reaction_type?: ReactionType
}

export interface PRCommentMetadata {
  exercise_name: string
  pr_type: 'heaviestSet' | 'e1RM'
  value: number
  workout_date: string
  comment_preview: string
}

/** Look up a user by username (public info only). Case-insensitive match. */
export async function lookupUserByUsername(username: string): Promise<PublicUser | null> {
  const trimmed = username.trim()
  if (!trimmed) return null

  const supabase = createClient()
  const { data, error } = await supabase
    .from('simple_users')
    .select('user_id, username')
    .ilike('username', trimmed)
    .single()

  if (error || !data) return null
  return { user_id: data.user_id, username: data.username }
}

/** Send a friend request to the user with the given username. */
export async function sendFriendRequest(toUsername: string): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const target = await lookupUserByUsername(toUsername)
  if (!target) return { ok: false, error: 'User not found' }
  if (target.user_id === user.id) return { ok: false, error: "You can't send a request to yourself" }

  const supabase = createClient()

  const { data: existing } = await supabase
    .from('friend_requests')
    .select('id, status')
    .eq('from_user_id', user.id)
    .eq('to_user_id', target.user_id)
    .single()

  if (existing) {
    if (existing.status === 'accepted') return { ok: false, error: 'Already friends' }
    if (existing.status === 'pending') return { ok: false, error: 'Request already sent' }
    if (existing.status === 'declined') {
      // Allow re-sending after decline: update to pending and notify again
      await supabase
        .from('friend_requests')
        .update({ status: 'pending', created_at: new Date().toISOString() })
        .eq('id', existing.id)
      await supabase.from('notifications').insert({
        user_id: target.user_id,
        type: 'friend_request',
        from_user_id: user.id,
        reference_id: existing.id,
      })
      return { ok: true }
    }
  } else {
    const { error: insertErr } = await supabase.from('friend_requests').insert({
      from_user_id: user.id,
      to_user_id: target.user_id,
      status: 'pending',
    })
    if (insertErr) return { ok: false, error: insertErr.message }
  }

  const { data: req } = await supabase
    .from('friend_requests')
    .select('id')
    .eq('from_user_id', user.id)
    .eq('to_user_id', target.user_id)
    .single()

  if (req) {
    await supabase.from('notifications').insert({
      user_id: target.user_id,
      type: 'friend_request',
      from_user_id: user.id,
      reference_id: req.id,
    })
  }

  return { ok: true }
}

/** Get pending friend requests received by the current user. */
export async function getPendingFriendRequests(): Promise<FriendRequestWithFrom[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()
  const { data: requests, error } = await supabase
    .from('friend_requests')
    .select('id, from_user_id, status, created_at')
    .eq('to_user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error || !requests?.length) return []

  const fromIds = [...new Set(requests.map((r) => r.from_user_id))]
  const { data: users } = await supabase
    .from('simple_users')
    .select('user_id, username')
    .in('user_id', fromIds)

  const usernameMap = new Map<string, string>()
  users?.forEach((u) => usernameMap.set(u.user_id, u.username))

  return requests.map((r) => ({
    id: r.id,
    from_user_id: r.from_user_id,
    from_username: usernameMap.get(r.from_user_id) ?? 'Unknown',
    status: r.status,
    created_at: r.created_at,
  }))
}

/** Accept a friend request (caller must be the recipient). */
export async function acceptFriendRequest(requestId: string): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const supabase = createClient()
  const { data: req, error: fetchErr } = await supabase
    .from('friend_requests')
    .select('id, from_user_id, to_user_id')
    .eq('id', requestId)
    .eq('to_user_id', user.id)
    .eq('status', 'pending')
    .single()

  if (fetchErr || !req) return { ok: false, error: 'Request not found or already handled' }

  const { error: updateErr } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)

  if (updateErr) return { ok: false, error: updateErr.message }

  await supabase.from('notifications').insert({
    user_id: req.from_user_id,
    type: 'friend_accepted',
    from_user_id: user.id,
    reference_id: requestId,
  })

  return { ok: true }
}

/** Decline a friend request (caller must be the recipient). */
export async function declineFriendRequest(requestId: string): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const supabase = createClient()
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)
    .eq('to_user_id', user.id)
    .eq('status', 'pending')

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** List current user's friends (accepted requests, both directions). */
export async function getFriends(): Promise<FriendRow[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()
  const { data: accepted, error } = await supabase
    .from('friend_requests')
    .select('from_user_id, to_user_id')
    .eq('status', 'accepted')
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)

  if (error || !accepted?.length) return []

  const friendIds = accepted.map((r) => (r.from_user_id === user.id ? r.to_user_id : r.from_user_id))
  const uniqueIds = [...new Set(friendIds)]

  const { data: users } = await supabase
    .from('simple_users')
    .select('user_id, username')
    .in('user_id', uniqueIds)

  return (users ?? []).map((u) => ({ user_id: u.user_id, username: u.username }))
}

/** Check if current user is friends with target user id. */
export async function areFriendsWith(friendUserId: string): Promise<boolean> {
  const user = getCurrentUser()
  if (!user || user.id === friendUserId) return false

  const supabase = createClient()
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id')
    .eq('status', 'accepted')
    .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${friendUserId}),and(from_user_id.eq.${friendUserId},to_user_id.eq.${user.id})`)
    .limit(1)
    .single()

  return !error && !!data
}

/** Get notifications for the current user (newest first). */
export async function getNotifications(limit = 50): Promise<NotificationWithFrom[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()
  const { data: list, error } = await supabase
    .from('notifications')
    .select('id, type, from_user_id, reference_id, metadata, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !list?.length) return []

  const fromIds = [...new Set(list.map((n) => n.from_user_id))]
  const { data: users } = await supabase
    .from('simple_users')
    .select('user_id, username')
    .in('user_id', fromIds)

  const usernameMap = new Map<string, string>()
  users?.forEach((u) => usernameMap.set(u.user_id, u.username))

  return list.map((n) => {
    let metadata: PRKudosMetadata | PRCommentMetadata | AchievementUnlockedMetadata | null = null
    if ((n.type === 'pr_kudos' || n.type === 'pr_comment' || n.type === 'achievement_unlocked') && n.metadata) {
      try {
        metadata = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata
      } catch { /* ignore */ }
    }
    return {
      id: n.id,
      type: n.type as NotificationType,
      from_user_id: n.from_user_id,
      from_username: usernameMap.get(n.from_user_id) ?? 'Unknown',
      reference_id: n.reference_id,
      metadata,
      read: n.read,
      created_at: n.created_at,
    }
  })
}

/** Get unread notification count. */
export async function getUnreadNotificationCount(): Promise<number> {
  const user = getCurrentUser()
  if (!user) return 0

  const supabase = createClient()
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  if (error) return 0
  return count ?? 0
}

/** Mark a notification as read. */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const user = getCurrentUser()
  if (!user) return

  const supabase = createClient()
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)
}

/** Mark all notifications as read for the current user. */
export async function markAllNotificationsRead(): Promise<void> {
  const user = getCurrentUser()
  if (!user) return

  const supabase = createClient()
  await supabase.from('notifications').update({ read: true }).eq('user_id', user.id)
}

/** Delete all notifications for the current user. */
export async function clearAllNotifications(): Promise<void> {
  const user = getCurrentUser()
  if (!user) return

  const supabase = createClient()
  await supabase.from('notifications').delete().eq('user_id', user.id)
}

/** Get whether the given user allows friends to see their PRs. */
export async function getAllowFriendsSeePRs(userId: string): Promise<boolean> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('simple_users')
    .select('allow_friends_see_prs')
    .eq('user_id', userId)
    .single()

  if (error || data?.allow_friends_see_prs == null) return true
  return !!data.allow_friends_see_prs
}

/** Set current user's "allow friends to see my PRs" setting. */
export async function setAllowFriendsSeePRs(allow: boolean): Promise<void> {
  const user = getCurrentUser()
  if (!user) return

  const supabase = createClient()
  await supabase
    .from('simple_users')
    .update({ allow_friends_see_prs: allow, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
}

// ============ PR Kudos / Reactions ============

export interface PRIdentifier {
  to_user_id: string
  exercise_name: string
  template_day_id: string
  workout_date: string
  pr_type: 'heaviestSet' | 'e1RM'
  value: number
}

/** Send a reaction on a friend's PR. Creates a reaction record and notification. */
export async function sendPRReaction(
  pr: PRIdentifier,
  reactionType: ReactionType = 'kudos'
): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }
  if (user.id === pr.to_user_id) return { ok: false, error: "Can't react to your own PR" }

  const supabase = createClient()

  // Check if already reacted
  const { data: existing } = await supabase
    .from('pr_reactions')
    .select('id')
    .eq('from_user_id', user.id)
    .eq('to_user_id', pr.to_user_id)
    .eq('exercise_name', pr.exercise_name)
    .eq('template_day_id', pr.template_day_id)
    .eq('workout_date', pr.workout_date)
    .eq('pr_type', pr.pr_type)
    .single()

  if (existing) return { ok: false, error: 'Already reacted' }

  // Insert reaction
  const { error: insertErr } = await supabase.from('pr_reactions').insert({
    from_user_id: user.id,
    to_user_id: pr.to_user_id,
    exercise_name: pr.exercise_name,
    template_day_id: pr.template_day_id,
    workout_date: pr.workout_date,
    pr_type: pr.pr_type,
    reaction_type: reactionType,
  })

  if (insertErr) return { ok: false, error: insertErr.message }

  // Create notification for the PR owner
  const metadata: PRKudosMetadata = {
    exercise_name: pr.exercise_name,
    pr_type: pr.pr_type,
    value: pr.value,
    workout_date: pr.workout_date,
    reaction_type: reactionType,
  }

  await supabase.from('notifications').insert({
    user_id: pr.to_user_id,
    type: 'pr_kudos',
    from_user_id: user.id,
    metadata,
  })

  return { ok: true }
}

/** @deprecated Use sendPRReaction instead */
export async function sendPRKudos(pr: PRIdentifier): Promise<{ ok: boolean; error?: string }> {
  return sendPRReaction(pr, 'kudos')
}

/** Check if current user has already sent kudos on a specific PR. */
export async function hasReactedToPR(pr: Omit<PRIdentifier, 'value'>): Promise<boolean> {
  const user = getCurrentUser()
  if (!user) return false

  const supabase = createClient()
  const { data, error } = await supabase
    .from('pr_reactions')
    .select('id')
    .eq('from_user_id', user.id)
    .eq('to_user_id', pr.to_user_id)
    .eq('exercise_name', pr.exercise_name)
    .eq('template_day_id', pr.template_day_id)
    .eq('workout_date', pr.workout_date)
    .eq('pr_type', pr.pr_type)
    .single()

  return !error && !!data
}

export interface ReactionInfo {
  reaction_type: ReactionType
}

/** Get all PRs the current user has reacted to for a specific friend. Returns map of key -> reaction info. */
export async function getReactedPRs(friendUserId: string): Promise<Map<string, ReactionInfo>> {
  const user = getCurrentUser()
  if (!user) return new Map()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('pr_reactions')
    .select('exercise_name, template_day_id, workout_date, pr_type, reaction_type')
    .eq('from_user_id', user.id)
    .eq('to_user_id', friendUserId)

  if (error || !data) return new Map()

  const result = new Map<string, ReactionInfo>()
  data.forEach((r) => {
    const key = `${r.exercise_name}|${r.template_day_id}|${r.workout_date}|${r.pr_type}`
    result.set(key, { reaction_type: r.reaction_type || 'kudos' })
  })
  return result
}

/** @deprecated Use getReactedPRs instead */
export async function getReactedPRKeys(friendUserId: string): Promise<Set<string>> {
  const reacted = await getReactedPRs(friendUserId)
  return new Set(reacted.keys())
}

// ============ PR Comments ============

export interface PRComment {
  id: string
  from_user_id: string
  from_username: string
  comment: string
  created_at: string
}

export interface PRCommentIdentifier {
  to_user_id: string
  exercise_name: string
  template_day_id: string
  workout_date: string
  pr_type: 'heaviestSet' | 'e1RM'
  value: number
}

/** Add a comment on a friend's PR. Creates a comment record and notification. */
export async function addPRComment(
  pr: PRCommentIdentifier,
  comment: string
): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }
  if (user.id === pr.to_user_id) return { ok: false, error: "Can't comment on your own PR" }
  
  const trimmedComment = comment.trim()
  if (!trimmedComment) return { ok: false, error: 'Comment is empty' }
  if (trimmedComment.length > 200) return { ok: false, error: 'Comment too long (max 200 chars)' }

  const supabase = createClient()

  // Insert comment
  const { error: insertErr } = await supabase.from('pr_comments').insert({
    from_user_id: user.id,
    to_user_id: pr.to_user_id,
    exercise_name: pr.exercise_name,
    template_day_id: pr.template_day_id,
    workout_date: pr.workout_date,
    pr_type: pr.pr_type,
    comment: trimmedComment,
  })

  if (insertErr) return { ok: false, error: insertErr.message }

  // Create notification for the PR owner
  const metadata: PRCommentMetadata = {
    exercise_name: pr.exercise_name,
    pr_type: pr.pr_type,
    value: pr.value,
    workout_date: pr.workout_date,
    comment_preview: trimmedComment.slice(0, 50) + (trimmedComment.length > 50 ? '...' : ''),
  }

  await supabase.from('notifications').insert({
    user_id: pr.to_user_id,
    type: 'pr_comment',
    from_user_id: user.id,
    metadata,
  })

  return { ok: true }
}

/** Get comments on a specific PR. */
export async function getPRComments(
  toUserId: string,
  exerciseName: string,
  templateDayId: string,
  workoutDate: string,
  prType: 'heaviestSet' | 'e1RM',
  limit = 10
): Promise<PRComment[]> {
  const supabase = createClient()
  
  const { data: comments, error } = await supabase
    .from('pr_comments')
    .select('id, from_user_id, comment, created_at')
    .eq('to_user_id', toUserId)
    .eq('exercise_name', exerciseName)
    .eq('template_day_id', templateDayId)
    .eq('workout_date', workoutDate)
    .eq('pr_type', prType)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error || !comments?.length) return []

  // Get usernames for commenters
  const fromIds = [...new Set(comments.map((c) => c.from_user_id))]
  const { data: users } = await supabase
    .from('simple_users')
    .select('user_id, username')
    .in('user_id', fromIds)

  const usernameMap = new Map<string, string>()
  users?.forEach((u) => usernameMap.set(u.user_id, u.username))

  return comments.map((c) => ({
    id: c.id,
    from_user_id: c.from_user_id,
    from_username: usernameMap.get(c.from_user_id) ?? 'Unknown',
    comment: c.comment,
    created_at: c.created_at,
  }))
}
