import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estimated1RM } from '@/lib/estimated-1rm'

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  return createClient(url, key)
}

interface E1RMDataPoint {
  date: string
  e1rm: number
}

interface UserStats {
  e1rmHistory: E1RMDataPoint[]
  bestE1rm: number
  bestWeight: number
  totalSessions: number
  trend: 'up' | 'down' | 'stable'
  currentE1rm: number
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const currentUserId = searchParams.get('currentUserId')
  const friendUserId = searchParams.get('friendUserId')
  const exerciseName = searchParams.get('exerciseName')

  if (!currentUserId || !friendUserId) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Validate friendship
  const { data: friendship } = await supabase
    .from('friend_requests')
    .select('id')
    .eq('status', 'accepted')
    .or(
      `and(from_user_id.eq.${currentUserId},to_user_id.eq.${friendUserId}),and(from_user_id.eq.${friendUserId},to_user_id.eq.${currentUserId})`
    )
    .limit(1)

  if (!friendship?.length) {
    return NextResponse.json({ error: 'Not friends' }, { status: 403 })
  }

  // Get common exercises (two-step: fetch session IDs, then exercise names)
  const [{ data: userSessions }, { data: friendSessions }] = await Promise.all([
    supabase.from('workout_sessions').select('id').eq('user_id', currentUserId).eq('is_complete', true),
    supabase.from('workout_sessions').select('id').eq('user_id', friendUserId).eq('is_complete', true),
  ])

  const userSessionIds = (userSessions ?? []).map(s => s.id)
  const friendSessionIds = (friendSessions ?? []).map(s => s.id)

  const [{ data: userExercises }, { data: friendExercises }] = await Promise.all([
    userSessionIds.length
      ? supabase.from('exercise_logs').select('exercise_name').eq('set_type', 'working').in('session_id', userSessionIds)
      : Promise.resolve({ data: [] as { exercise_name: string }[] }),
    friendSessionIds.length
      ? supabase.from('exercise_logs').select('exercise_name').eq('set_type', 'working').in('session_id', friendSessionIds)
      : Promise.resolve({ data: [] as { exercise_name: string }[] }),
  ])

  const userExNames = new Set((userExercises ?? []).map(e => e.exercise_name))
  const friendExNames = new Set((friendExercises ?? []).map(e => e.exercise_name))
  const commonExercises = [...userExNames].filter(n => friendExNames.has(n)).sort()

  if (!exerciseName) {
    return NextResponse.json({ commonExercises })
  }

  // Build stats for each user
  async function getUserStats(userId: string): Promise<UserStats> {
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id, workout_date')
      .eq('user_id', userId)
      .eq('is_complete', true)
      .order('workout_date', { ascending: true })

    if (!sessions?.length) {
      return { e1rmHistory: [], bestE1rm: 0, bestWeight: 0, totalSessions: 0, trend: 'stable', currentE1rm: 0 }
    }

    const sessionIds = sessions.map(s => s.id)
    const { data: logs } = await supabase
      .from('exercise_logs')
      .select('session_id, weight, reps')
      .in('session_id', sessionIds)
      .eq('exercise_name', exerciseName)
      .eq('set_type', 'working')

    if (!logs?.length) {
      return { e1rmHistory: [], bestE1rm: 0, bestWeight: 0, totalSessions: 0, trend: 'stable', currentE1rm: 0 }
    }

    const sessionDateMap = new Map<string, string>()
    sessions.forEach(s => sessionDateMap.set(s.id, s.workout_date))

    // Group logs by session, compute max e1RM per session
    const sessionE1rm = new Map<string, number>()
    const sessionMaxWeight = new Map<string, number>()

    for (const log of logs) {
      const e1rm = Math.round(estimated1RM(log.weight, log.reps))
      const current = sessionE1rm.get(log.session_id) ?? 0
      if (e1rm > current) sessionE1rm.set(log.session_id, e1rm)
      const currentWeight = sessionMaxWeight.get(log.session_id) ?? 0
      if (log.weight > currentWeight) sessionMaxWeight.set(log.session_id, log.weight)
    }

    const relevantSessionIds = [...sessionE1rm.keys()]
    const e1rmHistory: E1RMDataPoint[] = relevantSessionIds
      .map(sid => ({
        date: sessionDateMap.get(sid)!,
        e1rm: sessionE1rm.get(sid)!,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const bestE1rm = Math.max(...e1rmHistory.map(p => p.e1rm))
    const bestWeight = Math.max(...[...sessionMaxWeight.values()])
    const totalSessions = relevantSessionIds.length

    // Trend: compare last 3 vs previous 3
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (e1rmHistory.length >= 4) {
      const recent = e1rmHistory.slice(-3)
      const earlier = e1rmHistory.slice(-6, -3)
      if (earlier.length) {
        const recentAvg = recent.reduce((s, p) => s + p.e1rm, 0) / recent.length
        const earlierAvg = earlier.reduce((s, p) => s + p.e1rm, 0) / earlier.length
        const diff = recentAvg - earlierAvg
        if (diff >= 5) trend = 'up'
        else if (diff <= -5) trend = 'down'
      }
    }

    const currentE1rm = e1rmHistory.length ? e1rmHistory[e1rmHistory.length - 1].e1rm : 0

    return { e1rmHistory, bestE1rm, bestWeight, totalSessions, trend, currentE1rm }
  }

  const [userStats, friendStats] = await Promise.all([
    getUserStats(currentUserId),
    getUserStats(friendUserId),
  ])

  // Get usernames
  const { data: usersData } = await supabase
    .from('simple_users')
    .select('user_id, username')
    .in('user_id', [currentUserId, friendUserId])

  const nameMap = new Map<string, string>()
  usersData?.forEach(u => nameMap.set(u.user_id, u.username))

  return NextResponse.json({
    commonExercises,
    user: { ...userStats, username: nameMap.get(currentUserId) ?? 'You' },
    friend: { ...friendStats, username: nameMap.get(friendUserId) ?? 'Friend' },
  })
}
