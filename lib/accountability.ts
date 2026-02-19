import { getCurrentUser } from './auth-simple'
import { createClient } from './supabase/client'

export type AccountabilityStatus = 'pending' | 'active' | 'ended'

export interface AccountabilityPairRow {
  id: string
  requester_id: string
  partner_id: string
  status: AccountabilityStatus
  streak_count: number
  last_both_trained_week: string | null
  created_at: string
}

export interface AccountabilityPairWithUsers extends AccountabilityPairRow {
  requester_username: string
  partner_username: string
}

export interface WeeklyStatus {
  userTrained: boolean
  partnerTrained: boolean
}

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function getMondayOfISOWeek(isoWeek: string): Date {
  const [yearStr, weekStr] = isoWeek.split('-W')
  const year = parseInt(yearStr)
  const week = parseInt(weekStr)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() || 7
  const monday = new Date(jan4.getTime() + ((week - 1) * 7 - (dayOfWeek - 1)) * 86400000)
  return monday
}

function previousISOWeek(isoWeek: string): string {
  const monday = getMondayOfISOWeek(isoWeek)
  monday.setUTCDate(monday.getUTCDate() - 7)
  return getISOWeek(monday)
}

export async function requestPartner(friendId: string): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }
  if (user.id === friendId) return { ok: false, error: "Can't partner with yourself" }

  const supabase = createClient()

  // Check for existing pair in either direction
  const { data: existing } = await supabase
    .from('accountability_pairs')
    .select('id, status')
    .or(
      `and(requester_id.eq.${user.id},partner_id.eq.${friendId}),and(requester_id.eq.${friendId},partner_id.eq.${user.id})`
    )
    .in('status', ['pending', 'active'])
    .limit(1)

  if (existing?.length) {
    if (existing[0].status === 'active') return { ok: false, error: 'Already accountability partners' }
    return { ok: false, error: 'Request already pending' }
  }

  const { error: insertErr } = await supabase.from('accountability_pairs').insert({
    requester_id: user.id,
    partner_id: friendId,
    status: 'pending',
  })

  if (insertErr) return { ok: false, error: insertErr.message }

  await supabase.from('notifications').insert({
    user_id: friendId,
    type: 'accountability_request',
    from_user_id: user.id,
  })

  return { ok: true }
}

export async function acceptPartner(pairId: string): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const supabase = createClient()
  const { data: pair, error: fetchErr } = await supabase
    .from('accountability_pairs')
    .select('*')
    .eq('id', pairId)
    .eq('partner_id', user.id)
    .eq('status', 'pending')
    .single()

  if (fetchErr || !pair) return { ok: false, error: 'Request not found or already handled' }

  const { error: updateErr } = await supabase
    .from('accountability_pairs')
    .update({ status: 'active' })
    .eq('id', pairId)

  if (updateErr) return { ok: false, error: updateErr.message }

  await supabase.from('notifications').insert({
    user_id: pair.requester_id,
    type: 'accountability_accepted',
    from_user_id: user.id,
  })

  return { ok: true }
}

export async function declinePartner(pairId: string): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const supabase = createClient()
  const { error } = await supabase
    .from('accountability_pairs')
    .update({ status: 'ended' })
    .eq('id', pairId)
    .eq('partner_id', user.id)
    .eq('status', 'pending')

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function endPartnership(pairId: string): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const supabase = createClient()
  const { error } = await supabase
    .from('accountability_pairs')
    .update({ status: 'ended' })
    .eq('id', pairId)
    .or(`requester_id.eq.${user.id},partner_id.eq.${user.id}`)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function getAccountabilityPairs(): Promise<AccountabilityPairWithUsers[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()
  const { data: pairs, error } = await supabase
    .from('accountability_pairs')
    .select('*')
    .or(`requester_id.eq.${user.id},partner_id.eq.${user.id}`)
    .in('status', ['pending', 'active'])
    .order('created_at', { ascending: false })

  if (error || !pairs?.length) return []

  const userIds = [...new Set(pairs.flatMap(p => [p.requester_id, p.partner_id]))]
  const { data: users } = await supabase
    .from('simple_users')
    .select('user_id, username')
    .in('user_id', userIds)

  const nameMap = new Map<string, string>()
  users?.forEach(u => nameMap.set(u.user_id, u.username))

  return pairs.map(p => ({
    ...p,
    requester_username: nameMap.get(p.requester_id) ?? 'Unknown',
    partner_username: nameMap.get(p.partner_id) ?? 'Unknown',
  }))
}

async function hasTrainedInWeek(userId: string, isoWeek: string): Promise<boolean> {
  const monday = getMondayOfISOWeek(isoWeek)
  const sunday = new Date(monday.getTime() + 6 * 86400000)
  const startDate = monday.toISOString().split('T')[0]
  const endDate = sunday.toISOString().split('T')[0]

  const supabase = createClient()
  const { count } = await supabase
    .from('workout_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_complete', true)
    .gte('workout_date', startDate)
    .lte('workout_date', endDate)

  return (count ?? 0) > 0
}

export async function getWeeklyStatus(pair: AccountabilityPairRow): Promise<WeeklyStatus> {
  const user = getCurrentUser()
  if (!user) return { userTrained: false, partnerTrained: false }

  const currentWeek = getISOWeek(new Date())
  const partnerId = pair.requester_id === user.id ? pair.partner_id : pair.requester_id

  const [userTrained, partnerTrained] = await Promise.all([
    hasTrainedInWeek(user.id, currentWeek),
    hasTrainedInWeek(partnerId, currentWeek),
  ])

  return { userTrained, partnerTrained }
}

export async function computeStreak(pair: AccountabilityPairRow): Promise<number> {
  const currentWeek = getISOWeek(new Date())
  let streak = 0
  let week = previousISOWeek(currentWeek)

  // Walk backward from last completed week
  for (let i = 0; i < 52; i++) {
    const [aTrained, bTrained] = await Promise.all([
      hasTrainedInWeek(pair.requester_id, week),
      hasTrainedInWeek(pair.partner_id, week),
    ])

    if (aTrained && bTrained) {
      streak++
      week = previousISOWeek(week)
    } else {
      break
    }
  }

  // Also check current week: if both have trained, include it
  const [aCurrent, bCurrent] = await Promise.all([
    hasTrainedInWeek(pair.requester_id, currentWeek),
    hasTrainedInWeek(pair.partner_id, currentWeek),
  ])
  if (aCurrent && bCurrent) streak++

  // Persist updated streak
  if (streak !== pair.streak_count) {
    const supabase = createClient()
    await supabase
      .from('accountability_pairs')
      .update({ streak_count: streak, last_both_trained_week: aCurrent && bCurrent ? currentWeek : previousISOWeek(currentWeek) })
      .eq('id', pair.id)
  }

  return streak
}

export async function nudgePartner(pairId: string): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const supabase = createClient()
  const { data: pair, error: fetchErr } = await supabase
    .from('accountability_pairs')
    .select('*')
    .eq('id', pairId)
    .eq('status', 'active')
    .or(`requester_id.eq.${user.id},partner_id.eq.${user.id}`)
    .single()

  if (fetchErr || !pair) return { ok: false, error: 'Partnership not found' }

  const partnerId = pair.requester_id === user.id ? pair.partner_id : pair.requester_id

  // Rate-limit: check if nudge sent this week
  const currentWeek = getISOWeek(new Date())
  const weekMonday = getMondayOfISOWeek(currentWeek)
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', partnerId)
    .eq('from_user_id', user.id)
    .eq('type', 'accountability_nudge')
    .gte('created_at', weekMonday.toISOString())

  if ((count ?? 0) > 0) return { ok: false, error: 'Already nudged this week' }

  // Check if partner already trained
  const partnerTrained = await hasTrainedInWeek(partnerId, currentWeek)
  if (partnerTrained) return { ok: false, error: 'Partner already trained this week' }

  await supabase.from('notifications').insert({
    user_id: partnerId,
    type: 'accountability_nudge',
    from_user_id: user.id,
  })

  return { ok: true }
}
