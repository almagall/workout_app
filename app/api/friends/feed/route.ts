import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeRecentPRsFromData } from '@/lib/pr-helper'
import { getAchievementDefinition } from '@/lib/achievements'

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  return createClient(url, key)
}

export interface FeedPR {
  type: 'pr'
  user_id: string
  username: string
  exerciseName: string
  templateDayId: string
  workoutDate: string
  prType: 'heaviestSet' | 'e1RM'
  value: number
  dayLabel?: string
}

export interface FeedAchievement {
  type: 'achievement'
  user_id: string
  username: string
  achievement_id: string
  achievement_name: string
  unlocked_at: string
}

export type FeedItem = FeedPR | FeedAchievement

/** GET /api/friends/feed?currentUserId=...&limit=20
 * Returns aggregated recent PRs and achievement unlocks from all friends.
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
      return NextResponse.json({ feed: [] as FeedItem[] })
    }

    const friendIds = [...new Set(friendships.map((f) =>
      f.from_user_id === currentUserId ? f.to_user_id : f.from_user_id
    ))]

    // Username map for all friends (for PRs and achievements)
    const { data: friendUsers } = await supabase
      .from('simple_users')
      .select('user_id, username, allow_friends_see_prs')
      .in('user_id', friendIds)
    const allFriendUsers = friendUsers ?? []
    const usernameMap = new Map(allFriendUsers.map((f) => [f.user_id, f.username]))
    const sharingFriends = allFriendUsers.filter((f) => f.allow_friends_see_prs !== false)
    const sharingFriendIds = sharingFriends.map((f) => f.user_id)

    const prFeed: FeedPR[] = []
    if (sharingFriendIds.length > 0) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0]

      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('id, user_id, template_day_id, workout_date')
        .in('user_id', sharingFriendIds)
        .gte('workout_date', cutoffDate)
        .order('workout_date', { ascending: true })

      if (sessions?.length) {
        const sessionIds = sessions.map((s) => s.id)
        const { data: logs } = await supabase
          .from('exercise_logs')
          .select('session_id, exercise_name, weight, reps, set_type')
          .in('session_id', sessionIds)

        const sessionByUser = new Map<string, typeof sessions>()
        sessions.forEach((s) => {
          const arr = sessionByUser.get(s.user_id) ?? []
          arr.push(s)
          sessionByUser.set(s.user_id, arr)
        })

        for (const [userId, userSessions] of sessionByUser) {
          const userSessionIds = new Set(userSessions.map((s) => s.id))
          const userLogs = (logs ?? []).filter((l) => userSessionIds.has(l.session_id))
          const prs = computeRecentPRsFromData(userSessions, userLogs, 10)
          for (const pr of prs) {
            prFeed.push({
              type: 'pr',
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
      }
    }

    // Fetch achievement unlocks from all friends
    const achievementFeed: FeedAchievement[] = []
    if (friendIds.length > 0) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const cutoffIso = thirtyDaysAgo.toISOString()

      const { data: achievements } = await supabase
        .from('user_achievements')
        .select('user_id, achievement_id, unlocked_at')
        .in('user_id', friendIds)
        .gte('unlocked_at', cutoffIso)
        .order('unlocked_at', { ascending: false })
        .limit(50)

      for (const row of achievements ?? []) {
        const def = getAchievementDefinition(row.achievement_id as import('@/lib/achievements').AchievementId)
        achievementFeed.push({
          type: 'achievement',
          user_id: row.user_id,
          username: usernameMap.get(row.user_id) ?? 'Unknown',
          achievement_id: row.achievement_id,
          achievement_name: def?.name ?? row.achievement_id,
          unlocked_at: row.unlocked_at,
        })
      }
    }

    // Combined feed with date for sorting (date-only for consistent compare)
    const withDate: { item: FeedItem; date: string }[] = [
      ...prFeed.map((p) => ({ item: p, date: p.workoutDate })),
      ...achievementFeed.map((a) => ({ item: a, date: a.unlocked_at.slice(0, 10) })),
    ]
    withDate.sort((a, b) => b.date.localeCompare(a.date))
    const limited = withDate.slice(0, limit).map((x) => x.item)

    // Add day labels for PRs in the limited set
    const prsInLimited = limited.filter((x): x is FeedPR => x.type === 'pr')
    const dayIds = [...new Set(prsInLimited.map((p) => p.templateDayId))]
    let dayLabels: Record<string, string> = {}
    if (dayIds.length > 0) {
      const { data: days } = await supabase
        .from('template_days')
        .select('id, day_label')
        .in('id', dayIds)
      days?.forEach((d) => { dayLabels[d.id] = d.day_label })
    }
    const feedWithLabels: FeedItem[] = limited.map((item) => {
      if (item.type === 'pr') {
        return { ...item, dayLabel: dayLabels[item.templateDayId] }
      }
      return item
    })

    return NextResponse.json({ feed: feedWithLabels })
  } catch (e) {
    console.error('Friend feed API error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
