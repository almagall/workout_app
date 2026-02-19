import { getCurrentUser } from './auth-simple'
import { createClient } from './supabase/client'
import { estimated1RM } from './estimated-1rm'

export type ChallengeType = 'workout_count' | 'e1rm' | 'total_volume' | 'consistency'
export type ChallengeStatus = 'pending' | 'active' | 'completed' | 'declined' | 'cancelled'

export interface ChallengeRow {
  id: string
  challenger_id: string
  challenged_id: string
  challenge_type: ChallengeType
  exercise_name: string | null
  duration_days: number
  start_date: string
  end_date: string
  status: ChallengeStatus
  winner_id: string | null
  created_at: string
}

export interface ChallengeWithUsers extends ChallengeRow {
  challenger_username: string
  challenged_username: string
  winner_username?: string | null
}

export interface ChallengeProgress {
  challengerValue: number
  challengedValue: number
}

export async function createChallenge(
  friendId: string,
  type: ChallengeType,
  durationDays: number,
  exerciseName?: string
): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }
  if (user.id === friendId) return { ok: false, error: "Can't challenge yourself" }
  if (type === 'e1rm' && !exerciseName?.trim()) return { ok: false, error: 'Exercise name required for e1RM challenges' }

  const supabase = createClient()
  const today = new Date()
  const startDate = today.toISOString().split('T')[0]
  const endDate = new Date(today.getTime() + durationDays * 86400000).toISOString().split('T')[0]

  const { error: insertErr } = await supabase.from('challenges').insert({
    challenger_id: user.id,
    challenged_id: friendId,
    challenge_type: type,
    exercise_name: type === 'e1rm' ? exerciseName!.trim() : null,
    duration_days: durationDays,
    start_date: startDate,
    end_date: endDate,
    status: 'pending',
  })

  if (insertErr) return { ok: false, error: insertErr.message }

  await supabase.from('notifications').insert({
    user_id: friendId,
    type: 'challenge_received',
    from_user_id: user.id,
    metadata: { challenge_type: type, exercise_name: exerciseName ?? null, duration_days: durationDays },
  })

  return { ok: true }
}

export async function acceptChallenge(challengeId: string): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const supabase = createClient()
  const { data: challenge, error: fetchErr } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .eq('challenged_id', user.id)
    .eq('status', 'pending')
    .single()

  if (fetchErr || !challenge) return { ok: false, error: 'Challenge not found or already handled' }

  const today = new Date()
  const startDate = today.toISOString().split('T')[0]
  const endDate = new Date(today.getTime() + challenge.duration_days * 86400000).toISOString().split('T')[0]

  const { error: updateErr } = await supabase
    .from('challenges')
    .update({ status: 'active', start_date: startDate, end_date: endDate })
    .eq('id', challengeId)

  if (updateErr) return { ok: false, error: updateErr.message }

  await supabase.from('notifications').insert({
    user_id: challenge.challenger_id,
    type: 'challenge_accepted',
    from_user_id: user.id,
    metadata: { challenge_type: challenge.challenge_type, exercise_name: challenge.exercise_name },
  })

  return { ok: true }
}

export async function declineChallenge(challengeId: string): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const supabase = createClient()
  const { error } = await supabase
    .from('challenges')
    .update({ status: 'declined' })
    .eq('id', challengeId)
    .eq('challenged_id', user.id)
    .eq('status', 'pending')

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function getChallenges(): Promise<ChallengeWithUsers[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()
  const { data: challenges, error } = await supabase
    .from('challenges')
    .select('*')
    .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)
    .in('status', ['pending', 'active', 'completed'])
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !challenges?.length) return []

  const userIds = [...new Set(challenges.flatMap(c => [c.challenger_id, c.challenged_id, c.winner_id].filter(Boolean)))]
  const { data: users } = await supabase
    .from('simple_users')
    .select('user_id, username')
    .in('user_id', userIds)

  const nameMap = new Map<string, string>()
  users?.forEach(u => nameMap.set(u.user_id, u.username))

  return challenges.map(c => ({
    ...c,
    challenger_username: nameMap.get(c.challenger_id) ?? 'Unknown',
    challenged_username: nameMap.get(c.challenged_id) ?? 'Unknown',
    winner_username: c.winner_id ? nameMap.get(c.winner_id) ?? null : null,
  }))
}

export async function getChallengeProgress(challenge: ChallengeRow): Promise<ChallengeProgress> {
  const supabase = createClient()

  if (challenge.challenge_type === 'workout_count') {
    const fetchCount = async (userId: string) => {
      const { count } = await supabase
        .from('workout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_complete', true)
        .gte('workout_date', challenge.start_date)
        .lte('workout_date', challenge.end_date)
      return count ?? 0
    }

    const [challengerValue, challengedValue] = await Promise.all([
      fetchCount(challenge.challenger_id),
      fetchCount(challenge.challenged_id),
    ])
    return { challengerValue, challengedValue }
  }

  if (challenge.challenge_type === 'total_volume') {
    const fetchVolume = async (userId: string) => {
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('is_complete', true)
        .gte('workout_date', challenge.start_date)
        .lte('workout_date', challenge.end_date)

      if (!sessions?.length) return 0
      const sessionIds = sessions.map(s => s.id)

      const { data: logs } = await supabase
        .from('exercise_logs')
        .select('weight, reps')
        .in('session_id', sessionIds)
        .eq('set_type', 'working')

      if (!logs?.length) return 0
      return logs.reduce((sum, l) => sum + l.weight * l.reps, 0)
    }

    const [challengerValue, challengedValue] = await Promise.all([
      fetchVolume(challenge.challenger_id),
      fetchVolume(challenge.challenged_id),
    ])
    return { challengerValue, challengedValue }
  }

  if (challenge.challenge_type === 'consistency') {
    const fetchDays = async (userId: string) => {
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('workout_date')
        .eq('user_id', userId)
        .eq('is_complete', true)
        .gte('workout_date', challenge.start_date)
        .lte('workout_date', challenge.end_date)

      const uniqueDays = new Set(sessions?.map(s => s.workout_date))
      return uniqueDays.size
    }

    const [challengerValue, challengedValue] = await Promise.all([
      fetchDays(challenge.challenger_id),
      fetchDays(challenge.challenged_id),
    ])
    return { challengerValue, challengedValue }
  }

  // e1rm challenge
  const fetchBestE1RM = async (userId: string) => {
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('is_complete', true)
      .gte('workout_date', challenge.start_date)
      .lte('workout_date', challenge.end_date)

    if (!sessions?.length) return 0

    const sessionIds = sessions.map(s => s.id)
    const { data: logs } = await supabase
      .from('exercise_logs')
      .select('weight, reps')
      .in('session_id', sessionIds)
      .eq('exercise_name', challenge.exercise_name!)
      .eq('set_type', 'working')

    if (!logs?.length) return 0
    return Math.max(...logs.map(l => Math.round(estimated1RM(l.weight, l.reps))))
  }

  const [challengerValue, challengedValue] = await Promise.all([
    fetchBestE1RM(challenge.challenger_id),
    fetchBestE1RM(challenge.challenged_id),
  ])
  return { challengerValue, challengedValue }
}

export async function finalizeExpiredChallenges(): Promise<void> {
  const user = getCurrentUser()
  if (!user) return

  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: expired } = await supabase
    .from('challenges')
    .select('*')
    .eq('status', 'active')
    .lt('end_date', today)
    .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)

  if (!expired?.length) return

  for (const challenge of expired) {
    const progress = await getChallengeProgress(challenge)
    let winnerId: string | null = null

    if (progress.challengerValue > progress.challengedValue) {
      winnerId = challenge.challenger_id
    } else if (progress.challengedValue > progress.challengerValue) {
      winnerId = challenge.challenged_id
    }

    await supabase
      .from('challenges')
      .update({ status: 'completed', winner_id: winnerId })
      .eq('id', challenge.id)

    const otherUserId = challenge.challenger_id === user.id ? challenge.challenged_id : challenge.challenger_id
    await supabase.from('notifications').insert({
      user_id: otherUserId,
      type: 'challenge_completed',
      from_user_id: user.id,
      metadata: {
        challenge_type: challenge.challenge_type,
        exercise_name: challenge.exercise_name,
        winner_id: winnerId,
        challenger_score: progress.challengerValue,
        challenged_score: progress.challengedValue,
      },
    })
  }
}
