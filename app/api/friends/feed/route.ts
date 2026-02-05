import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeRecentPRsFromData } from '@/lib/pr-helper'

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  return createClient(url, key)
}

export interface FeedPR {
  user_id: string
  username: string
  exerciseName: string
  templateDayId: string
  workoutDate: string
  prType: 'heaviestSet' | 'e1RM'
  value: number
  dayLabel?: string
}

/** GET /api/friends/feed?currentUserId=...&limit=20
 * Returns aggregated recent PRs from all friends (who allow PR sharing).
 */
export async function GET(request: NextRequest) {
  try {
    const currentUserId = request.nextUrl.searchParams.get('currentUserId')
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 20, 50)

    if (!currentUserId) {
      return NextResponse.json({ error: 'Missing currentUserId' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Get all accepted friend relationships
    const { data: friendships } = await supabase
      .from('friend_requests')
      .select('from_user_id, to_user_id')
      .eq('status', 'accepted')
      .or(`from_user_id.eq.${currentUserId},to_user_id.eq.${currentUserId}`)

    if (!friendships?.length) {
      return NextResponse.json({ feed: [] as FeedPR[] })
    }

    // Get friend user IDs
    const friendIds = friendships.map((f) =>
      f.from_user_id === currentUserId ? f.to_user_id : f.from_user_id
    )

    // Get friends who allow PR sharing
    const { data: friendUsers } = await supabase
      .from('simple_users')
      .select('user_id, username, allow_friends_see_prs')
      .in('user_id', friendIds)

    const sharingFriends = (friendUsers ?? []).filter((f) => f.allow_friends_see_prs !== false)
    if (!sharingFriends.length) {
      return NextResponse.json({ feed: [] as FeedPR[] })
    }

    const sharingFriendIds = sharingFriends.map((f) => f.user_id)
    const usernameMap = new Map(sharingFriends.map((f) => [f.user_id, f.username]))

    // Get sessions for all sharing friends (last 30 days for efficiency)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0]

    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id, user_id, template_day_id, workout_date')
      .in('user_id', sharingFriendIds)
      .gte('workout_date', cutoffDate)
      .order('workout_date', { ascending: true })

    if (!sessions?.length) {
      return NextResponse.json({ feed: [] as FeedPR[] })
    }

    const sessionIds = sessions.map((s) => s.id)
    const { data: logs } = await supabase
      .from('exercise_logs')
      .select('session_id, exercise_name, weight, reps, set_type')
      .in('session_id', sessionIds)

    // Compute PRs per friend
    const feed: FeedPR[] = []
    const sessionByUser = new Map<string, typeof sessions>()
    sessions.forEach((s) => {
      const arr = sessionByUser.get(s.user_id) ?? []
      arr.push(s)
      sessionByUser.set(s.user_id, arr)
    })

    const sessionIdToUserId = new Map(sessions.map((s) => [s.id, s.user_id]))

    for (const [userId, userSessions] of sessionByUser) {
      const userSessionIds = new Set(userSessions.map((s) => s.id))
      const userLogs = (logs ?? []).filter((l) => userSessionIds.has(l.session_id))
      const prs = computeRecentPRsFromData(userSessions, userLogs, 10) // Top 10 per friend
      for (const pr of prs) {
        feed.push({
          user_id: userId,
          username: usernameMap.get(userId) ?? 'Unknown',
          exerciseName: pr.exerciseName,
          templateDayId: pr.templateDayId,
          workoutDate: pr.workoutDate,
          prType: pr.prType,
          value: pr.value,
        })
      }
    }

    // Sort by date (most recent first) and limit
    feed.sort((a, b) => b.workoutDate.localeCompare(a.workoutDate))
    const limitedFeed = feed.slice(0, limit)

    // Get day labels
    const dayIds = [...new Set(limitedFeed.map((p) => p.templateDayId))]
    const { data: days } = await supabase
      .from('template_days')
      .select('id, day_label')
      .in('id', dayIds)
    const dayLabels: Record<string, string> = {}
    days?.forEach((d) => { dayLabels[d.id] = d.day_label })

    const feedWithLabels = limitedFeed.map((p) => ({
      ...p,
      dayLabel: dayLabels[p.templateDayId],
    }))

    return NextResponse.json({ feed: feedWithLabels })
  } catch (e) {
    console.error('Friend feed API error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
