import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeRecentPRsFromData, type RecentPR } from '@/lib/pr-helper'

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  return createClient(url, key)
}

export interface ProfileData {
  user_id: string
  username: string
  total_prs: number
  total_workouts: number
  member_since: string
  is_friend: boolean
  is_pending_request: boolean
  is_own_profile: boolean
  can_see_prs: boolean
  recent_prs: RecentPR[]
  day_labels: Record<string, string>
}

/** GET /api/profile/[username]?currentUserId=... */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const currentUserId = request.nextUrl.searchParams.get('currentUserId')

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Get the profile user
    const { data: profileUser, error: userErr } = await supabase
      .from('simple_users')
      .select('user_id, username, total_prs, total_workouts, allow_friends_see_prs, created_at')
      .eq('username', username.toLowerCase())
      .single()

    if (userErr || !profileUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isOwnProfile = currentUserId === profileUser.user_id

    // Check friendship status if not own profile
    let isFriend = false
    let isPendingRequest = false

    if (currentUserId && !isOwnProfile) {
      const { data: friendship } = await supabase
        .from('friend_requests')
        .select('status')
        .or(
          `and(from_user_id.eq.${currentUserId},to_user_id.eq.${profileUser.user_id}),and(from_user_id.eq.${profileUser.user_id},to_user_id.eq.${currentUserId})`
        )
        .single()

      if (friendship) {
        isFriend = friendship.status === 'accepted'
        isPendingRequest = friendship.status === 'pending'
      }
    }

    // Determine if we can show PRs
    const canSeePRs = isOwnProfile || (isFriend && profileUser.allow_friends_see_prs !== false)

    // Get recent PRs if allowed
    let recentPRs: RecentPR[] = []
    const dayLabels: Record<string, string> = {}

    if (canSeePRs) {
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('id, template_day_id, workout_date')
        .eq('user_id', profileUser.user_id)
        .order('workout_date', { ascending: true })

      if (sessions?.length) {
        const sessionIds = sessions.map((s) => s.id)
        const { data: logs } = await supabase
          .from('exercise_logs')
          .select('session_id, exercise_name, weight, reps, set_type')
          .in('session_id', sessionIds)

        recentPRs = computeRecentPRsFromData(sessions, logs ?? [], 10)

        // Get day labels
        const dayIds = [...new Set(sessions.map((s) => s.template_day_id))]
        const { data: days } = await supabase
          .from('template_days')
          .select('id, day_label')
          .in('id', dayIds)
        days?.forEach((d) => { dayLabels[d.id] = d.day_label })
      }
    }

    // Compute actual counts from data
    const { count: workoutCount } = await supabase
      .from('workout_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profileUser.user_id)

    const profile: ProfileData = {
      user_id: profileUser.user_id,
      username: profileUser.username,
      total_prs: profileUser.total_prs ?? 0,
      total_workouts: workoutCount ?? 0,
      member_since: profileUser.created_at ?? new Date().toISOString(),
      is_friend: isFriend,
      is_pending_request: isPendingRequest,
      is_own_profile: isOwnProfile,
      can_see_prs: canSeePRs,
      recent_prs: recentPRs,
      day_labels: dayLabels,
    }

    return NextResponse.json({ profile })
  } catch (e) {
    console.error('Profile API error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
