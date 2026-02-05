import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  return createClient(url, key)
}

export interface LeaderboardEntry {
  user_id: string
  username: string
  count: number
}

export interface LeaderboardData {
  weekly_workouts: LeaderboardEntry[]
  monthly_workouts: LeaderboardEntry[]
}

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Monday
  return new Date(now.setDate(diff)).toISOString().split('T')[0]
}

function getMonthStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
}

/** GET /api/leaderboards?currentUserId=... */
export async function GET(request: NextRequest) {
  try {
    const currentUserId = request.nextUrl.searchParams.get('currentUserId')

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

    // Collect user IDs including current user
    const userIds = new Set<string>([currentUserId])
    friendships?.forEach((f) => {
      userIds.add(f.from_user_id === currentUserId ? f.to_user_id : f.from_user_id)
    })

    const userIdArray = Array.from(userIds)

    // Get usernames
    const { data: users } = await supabase
      .from('simple_users')
      .select('user_id, username')
      .in('user_id', userIdArray)

    const usernameMap = new Map<string, string>()
    users?.forEach((u) => usernameMap.set(u.user_id, u.username))

    const weekStart = getWeekStart()
    const monthStart = getMonthStart()

    // Get weekly workout counts
    const { data: weeklySessions } = await supabase
      .from('workout_sessions')
      .select('user_id')
      .in('user_id', userIdArray)
      .gte('workout_date', weekStart)

    // Get monthly workout counts
    const { data: monthlySessions } = await supabase
      .from('workout_sessions')
      .select('user_id')
      .in('user_id', userIdArray)
      .gte('workout_date', monthStart)

    // Count per user
    const weeklyCount = new Map<string, number>()
    const monthlyCount = new Map<string, number>()

    weeklySessions?.forEach((s) => {
      weeklyCount.set(s.user_id, (weeklyCount.get(s.user_id) ?? 0) + 1)
    })

    monthlySessions?.forEach((s) => {
      monthlyCount.set(s.user_id, (monthlyCount.get(s.user_id) ?? 0) + 1)
    })

    // Build leaderboard entries
    const weeklyWorkouts: LeaderboardEntry[] = userIdArray
      .map((uid) => ({
        user_id: uid,
        username: usernameMap.get(uid) ?? 'Unknown',
        count: weeklyCount.get(uid) ?? 0,
      }))
      .sort((a, b) => b.count - a.count)

    const monthlyWorkouts: LeaderboardEntry[] = userIdArray
      .map((uid) => ({
        user_id: uid,
        username: usernameMap.get(uid) ?? 'Unknown',
        count: monthlyCount.get(uid) ?? 0,
      }))
      .sort((a, b) => b.count - a.count)

    const data: LeaderboardData = {
      weekly_workouts: weeklyWorkouts,
      monthly_workouts: monthlyWorkouts,
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error('Leaderboards API error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
