import { getCurrentUser } from './auth-simple'
import { createClient } from './supabase/client'
import { estimated1RM } from './estimated-1rm'

export type GroupChallengeType = 'workout_count' | 'e1rm' | 'total_volume' | 'consistency'
export type GroupChallengeStatus = 'pending' | 'active' | 'completed' | 'cancelled'
export type MemberStatus = 'invited' | 'accepted' | 'declined'

export interface GroupChallengeRow {
  id: string
  creator_id: string
  challenge_type: GroupChallengeType
  exercise_name: string | null
  duration_days: number
  start_date: string
  end_date: string
  status: GroupChallengeStatus
  created_at: string
}

export interface GroupChallengeMember {
  id: string
  challenge_id: string
  user_id: string
  status: MemberStatus
  final_score: number | null
  rank: number | null
  joined_at: string
  username?: string
}

export interface GroupChallengeWithMembers extends GroupChallengeRow {
  members: GroupChallengeMember[]
  creator_username: string
}

export interface MemberProgress {
  user_id: string
  username: string
  value: number
}

export async function createGroupChallenge(
  friendIds: string[],
  type: GroupChallengeType,
  durationDays: number,
  exerciseName?: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }
  if (friendIds.length < 2) return { ok: false, error: 'Need at least 2 friends for a group challenge' }
  if (type === 'e1rm' && !exerciseName?.trim()) return { ok: false, error: 'Exercise name required for e1RM challenges' }

  const supabase = createClient()
  const today = new Date()
  const startDate = today.toISOString().split('T')[0]
  const endDate = new Date(today.getTime() + durationDays * 86400000).toISOString().split('T')[0]

  const { data: challenge, error: insertErr } = await supabase
    .from('group_challenges')
    .insert({
      creator_id: user.id,
      challenge_type: type,
      exercise_name: type === 'e1rm' ? exerciseName!.trim() : null,
      duration_days: durationDays,
      start_date: startDate,
      end_date: endDate,
      status: 'pending',
    })
    .select()
    .single()

  if (insertErr || !challenge) return { ok: false, error: insertErr?.message ?? 'Failed to create challenge' }

  const membersToInsert = [
    { challenge_id: challenge.id, user_id: user.id, status: 'accepted' as const },
    ...friendIds.map(fid => ({ challenge_id: challenge.id, user_id: fid, status: 'invited' as const })),
  ]

  const { error: membersErr } = await supabase.from('group_challenge_members').insert(membersToInsert)
  if (membersErr) return { ok: false, error: membersErr.message }

  for (const fid of friendIds) {
    await supabase.from('notifications').insert({
      user_id: fid,
      type: 'challenge_received',
      from_user_id: user.id,
      metadata: { group: true, challenge_type: type, exercise_name: exerciseName ?? null, duration_days: durationDays },
    })
  }

  return { ok: true }
}

export async function acceptGroupChallenge(challengeId: string): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const supabase = createClient()

  const { error: updateErr } = await supabase
    .from('group_challenge_members')
    .update({ status: 'accepted' })
    .eq('challenge_id', challengeId)
    .eq('user_id', user.id)
    .eq('status', 'invited')

  if (updateErr) return { ok: false, error: updateErr.message }

  const { data: members } = await supabase
    .from('group_challenge_members')
    .select('status')
    .eq('challenge_id', challengeId)

  const allAccepted = members?.every(m => m.status === 'accepted' || m.status === 'declined')
  const acceptedCount = members?.filter(m => m.status === 'accepted').length ?? 0

  if (allAccepted && acceptedCount >= 2) {
    const today = new Date()
    const { data: challenge } = await supabase
      .from('group_challenges')
      .select('duration_days')
      .eq('id', challengeId)
      .single()

    if (challenge) {
      const startDate = today.toISOString().split('T')[0]
      const endDate = new Date(today.getTime() + challenge.duration_days * 86400000).toISOString().split('T')[0]
      await supabase
        .from('group_challenges')
        .update({ status: 'active', start_date: startDate, end_date: endDate })
        .eq('id', challengeId)
    }
  }

  return { ok: true }
}

export async function declineGroupChallenge(challengeId: string): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const supabase = createClient()
  const { error } = await supabase
    .from('group_challenge_members')
    .update({ status: 'declined' })
    .eq('challenge_id', challengeId)
    .eq('user_id', user.id)
    .eq('status', 'invited')

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function getGroupChallenges(): Promise<GroupChallengeWithMembers[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()

  const { data: memberRows } = await supabase
    .from('group_challenge_members')
    .select('challenge_id')
    .eq('user_id', user.id)

  if (!memberRows?.length) return []

  const challengeIds = [...new Set(memberRows.map(m => m.challenge_id))]

  const { data: challenges, error } = await supabase
    .from('group_challenges')
    .select('*')
    .in('id', challengeIds)
    .in('status', ['pending', 'active', 'completed'])
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !challenges?.length) return []

  const { data: allMembers } = await supabase
    .from('group_challenge_members')
    .select('*')
    .in('challenge_id', challengeIds)

  const userIds = [...new Set([
    ...challenges.map(c => c.creator_id),
    ...(allMembers ?? []).map(m => m.user_id),
  ])]

  const { data: users } = await supabase
    .from('simple_users')
    .select('user_id, username')
    .in('user_id', userIds)

  const nameMap = new Map<string, string>()
  users?.forEach(u => nameMap.set(u.user_id, u.username))

  return challenges.map(c => ({
    ...c,
    creator_username: nameMap.get(c.creator_id) ?? 'Unknown',
    members: (allMembers ?? [])
      .filter(m => m.challenge_id === c.id)
      .map(m => ({ ...m, username: nameMap.get(m.user_id) ?? 'Unknown' })),
  }))
}

async function computeUserScore(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  type: GroupChallengeType,
  startDate: string,
  endDate: string,
  exerciseName: string | null,
): Promise<number> {
  if (type === 'workout_count') {
    const { count } = await supabase
      .from('workout_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_complete', true)
      .gte('workout_date', startDate)
      .lte('workout_date', endDate)
    return count ?? 0
  }

  if (type === 'consistency') {
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('workout_date')
      .eq('user_id', userId)
      .eq('is_complete', true)
      .gte('workout_date', startDate)
      .lte('workout_date', endDate)
    const uniqueDays = new Set(sessions?.map(s => s.workout_date))
    return uniqueDays.size
  }

  if (type === 'total_volume') {
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('is_complete', true)
      .gte('workout_date', startDate)
      .lte('workout_date', endDate)

    if (!sessions?.length) return 0
    const sessionIds = sessions.map(s => s.id)

    const { data: logs } = await supabase
      .from('exercise_logs')
      .select('weight, reps')
      .in('session_id', sessionIds)
      .eq('set_type', 'working')
      .is('duration_seconds', null)

    if (!logs?.length) return 0
    return logs.reduce((sum, l) => sum + l.weight * l.reps, 0)
  }

  if (type === 'e1rm' && exerciseName) {
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('is_complete', true)
      .gte('workout_date', startDate)
      .lte('workout_date', endDate)

    if (!sessions?.length) return 0
    const sessionIds = sessions.map(s => s.id)

    const { data: logs } = await supabase
      .from('exercise_logs')
      .select('weight, reps')
      .in('session_id', sessionIds)
      .eq('exercise_name', exerciseName)
      .eq('set_type', 'working')
      .is('duration_seconds', null)

    if (!logs?.length) return 0
    return Math.max(...logs.map(l => Math.round(estimated1RM(l.weight, l.reps))))
  }

  return 0
}

export async function getGroupChallengeProgress(challenge: GroupChallengeRow, members: GroupChallengeMember[]): Promise<MemberProgress[]> {
  const supabase = createClient()
  const accepted = members.filter(m => m.status === 'accepted')

  const results = await Promise.all(
    accepted.map(async (m) => ({
      user_id: m.user_id,
      username: m.username ?? 'Unknown',
      value: await computeUserScore(supabase, m.user_id, challenge.challenge_type as GroupChallengeType, challenge.start_date, challenge.end_date, challenge.exercise_name),
    })),
  )

  return results.sort((a, b) => b.value - a.value)
}

export async function finalizeGroupChallenges(): Promise<void> {
  const user = getCurrentUser()
  if (!user) return

  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: memberRows } = await supabase
    .from('group_challenge_members')
    .select('challenge_id')
    .eq('user_id', user.id)

  if (!memberRows?.length) return

  const { data: expired } = await supabase
    .from('group_challenges')
    .select('*')
    .eq('status', 'active')
    .lt('end_date', today)
    .in('id', memberRows.map(m => m.challenge_id))

  if (!expired?.length) return

  for (const challenge of expired) {
    const { data: members } = await supabase
      .from('group_challenge_members')
      .select('*')
      .eq('challenge_id', challenge.id)
      .eq('status', 'accepted')

    if (!members?.length) continue

    const scores = await Promise.all(
      members.map(async (m) => ({
        ...m,
        score: await computeUserScore(supabase, m.user_id, challenge.challenge_type as GroupChallengeType, challenge.start_date, challenge.end_date, challenge.exercise_name),
      })),
    )

    scores.sort((a, b) => b.score - a.score)

    for (let i = 0; i < scores.length; i++) {
      await supabase
        .from('group_challenge_members')
        .update({ final_score: scores[i].score, rank: i + 1 })
        .eq('id', scores[i].id)
    }

    await supabase
      .from('group_challenges')
      .update({ status: 'completed' })
      .eq('id', challenge.id)
  }
}
