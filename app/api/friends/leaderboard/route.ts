import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getISOWeekBounds(): { startDate: string; endDate: string } {
  const now = new Date()
  const day = now.getUTCDay() || 7
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - day + 1)
  monday.setUTCHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return {
    startDate: monday.toISOString().split('T')[0],
    endDate: sunday.toISOString().split('T')[0],
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const currentUserId = searchParams.get('currentUserId')

  if (!currentUserId) {
    return NextResponse.json({ error: 'Missing currentUserId' }, { status: 400 })
  }

  const supabase = await createClient()
  const { startDate, endDate } = getISOWeekBounds()

  // Get accepted friends
  const { data: friendRows } = await supabase
    .from('friend_requests')
    .select('from_user_id, to_user_id')
    .eq('status', 'accepted')
    .or(`from_user_id.eq.${currentUserId},to_user_id.eq.${currentUserId}`)

  const friendIds = (friendRows ?? []).map(r =>
    r.from_user_id === currentUserId ? r.to_user_id : r.from_user_id
  )

  const allUserIds = [currentUserId, ...friendIds]

  // Fetch usernames
  const { data: users } = await supabase
    .from('simple_users')
    .select('user_id, username')
    .in('user_id', allUserIds)

  const nameMap = new Map<string, string>()
  users?.forEach(u => nameMap.set(u.user_id, u.username))

  // Fetch this-week workout counts for all users
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('user_id')
    .in('user_id', allUserIds)
    .eq('is_complete', true)
    .gte('workout_date', startDate)
    .lte('workout_date', endDate)

  const countMap = new Map<string, number>()
  allUserIds.forEach(id => countMap.set(id, 0))
  sessions?.forEach(s => countMap.set(s.user_id, (countMap.get(s.user_id) ?? 0) + 1))

  // Fetch all-time workout counts for streak computation (simplified: total sessions in last 12 weeks)
  const twelveWeeksAgo = new Date()
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)
  const twelveWeeksAgoStr = twelveWeeksAgo.toISOString().split('T')[0]

  const { data: allSessions } = await supabase
    .from('workout_sessions')
    .select('user_id, workout_date')
    .in('user_id', allUserIds)
    .eq('is_complete', true)
    .gte('workout_date', twelveWeeksAgoStr)

  // Compute simple streak: consecutive weeks (from current ISO week backwards) with at least 1 workout
  function getISOWeek(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
  }

  const sessionsByUser = new Map<string, Set<string>>()
  allUserIds.forEach(id => sessionsByUser.set(id, new Set()))
  allSessions?.forEach(s => sessionsByUser.get(s.user_id)?.add(getISOWeek(s.workout_date)))

  function computeStreak(trainedWeeks: Set<string>): number {
    const now = new Date()
    let streak = 0
    // Check up to 12 past weeks
    for (let i = 0; i <= 12; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      const week = getISOWeek(d.toISOString().split('T')[0])
      if (trainedWeeks.has(week)) {
        streak++
      } else if (i > 0) {
        break
      }
    }
    return streak
  }

  const leaderboard = allUserIds.map(userId => ({
    userId,
    username: nameMap.get(userId) ?? 'Unknown',
    workoutCount: countMap.get(userId) ?? 0,
    currentStreak: computeStreak(sessionsByUser.get(userId) ?? new Set()),
    isCurrentUser: userId === currentUserId,
  }))

  leaderboard.sort((a, b) => b.workoutCount - a.workoutCount || b.currentStreak - a.currentStreak)

  return NextResponse.json({ leaderboard, weekStart: startDate, weekEnd: endDate })
}
