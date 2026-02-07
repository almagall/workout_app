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
  rank: number
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

function calculateRanks(entries: Omit<LeaderboardEntry, 'rank'>[]): LeaderboardEntry[] {
  // Sort by count descending
  const sorted = [...entries].sort((a, b) => b.count - a.count)
  
  const ranked: LeaderboardEntry[] = []
  let currentRank = 1
  
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i]
    
    // If this entry has the same count as the previous, use the same rank
    if (i > 0 && entry.count === sorted[i - 1].count) {
      ranked.push({ ...entry, rank: ranked[i - 1].rank })
    } else {
      // Otherwise, use the current position as rank (accounts for ties)
      ranked.push({ ...entry, rank: currentRank })
    }
    
    currentRank++
  }
  
  return ranked
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

    // Get weekly workout counts (only completed workouts)
    const { data: weeklySessions } = await supabase
      .from('workout_sessions')
      .select('user_id')
      .in('user_id', userIdArray)
      .gte('workout_date', weekStart)
      .eq('is_complete', true)

    // Get monthly workout counts (only completed workouts)
    const { data: monthlySessions } = await supabase
      .from('workout_sessions')
      .select('user_id')
      .in('user_id', userIdArray)
      .gte('workout_date', monthStart)
      .eq('is_complete', true)

    // Count per user
    const weeklyCount = new Map<string, number>()
    const monthlyCount = new Map<string, number>()

    weeklySessions?.forEach((s) => {
      weeklyCount.set(s.user_id, (weeklyCount.get(s.user_id) ?? 0) + 1)
    })

    monthlySessions?.forEach((s) => {
      monthlyCount.set(s.user_id, (monthlyCount.get(s.user_id) ?? 0) + 1)
    })

    // Build leaderboard entries (without rank)
    const weeklyWorkoutsUnsorted = userIdArray
      .map((uid) => ({
        user_id: uid,
        username: usernameMap.get(uid) ?? 'Unknown',
        count: weeklyCount.get(uid) ?? 0,
      }))
      .sort((a, b) => b.count - a.count)

    const monthlyWorkoutsUnsorted = userIdArray
      .map((uid) => ({
        user_id: uid,
        username: usernameMap.get(uid) ?? 'Unknown',
        count: monthlyCount.get(uid) ?? 0,
      }))
      .sort((a, b) => b.count - a.count)

    // Apply ranking with tie support
    const weeklyWorkouts = calculateRanks(weeklyWorkoutsUnsorted)
    const monthlyWorkouts = calculateRanks(monthlyWorkoutsUnsorted)

    console.log('🏆 Leaderboard data:', {
      weeklyCount: weeklyWorkouts.length,
      monthlyCount: monthlyWorkouts.length,
      weeklyTop3: weeklyWorkouts.slice(0, 3).map(e => ({ username: e.username, count: e.count, rank: e.rank })),
      monthlyTop3: monthlyWorkouts.slice(0, 3).map(e => ({ username: e.username, count: e.count, rank: e.rank }))
    })

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
