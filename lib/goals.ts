import { getCurrentUser } from './auth-simple'
import { createClient } from './supabase/client'

export type GoalType = 'e1rm' | 'weight' | 'streak' | 'custom'

export interface TrainingGoal {
  id: string
  user_id: string
  title: string
  exercise_name: string | null
  target_value: number | null
  goal_type: GoalType
  target_date: string | null
  note: string | null
  is_achieved: boolean
  created_at: string
  updated_at: string
  username?: string
}

export async function createGoal(params: {
  title: string
  exercise_name?: string
  target_value?: number
  goal_type?: GoalType
  target_date?: string
  note?: string
}): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const supabase = createClient()
  const { error } = await supabase.from('training_goals').insert({
    user_id: user.id,
    title: params.title.trim(),
    exercise_name: params.exercise_name?.trim() || null,
    target_value: params.target_value ?? null,
    goal_type: params.goal_type ?? 'custom',
    target_date: params.target_date || null,
    note: params.note?.trim() || null,
    is_achieved: false,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function getMyGoals(): Promise<TrainingGoal[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('training_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as TrainingGoal[]
}

export async function getFriendsGoals(): Promise<TrainingGoal[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()

  // Get accepted friend IDs
  const { data: friendRows } = await supabase
    .from('friend_requests')
    .select('from_user_id, to_user_id')
    .eq('status', 'accepted')
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)

  if (!friendRows?.length) return []

  const friendIds = friendRows.map(r =>
    r.from_user_id === user.id ? r.to_user_id : r.from_user_id
  )

  const { data: goals, error } = await supabase
    .from('training_goals')
    .select('*')
    .in('user_id', friendIds)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error || !goals?.length) return []

  const userIds = [...new Set(goals.map(g => g.user_id))]
  const { data: users } = await supabase
    .from('simple_users')
    .select('user_id, username')
    .in('user_id', userIds)

  const nameMap = new Map<string, string>()
  users?.forEach(u => nameMap.set(u.user_id, u.username))

  return goals.map(g => ({ ...g, username: nameMap.get(g.user_id) ?? 'Unknown' })) as TrainingGoal[]
}

export async function markAchieved(goalId: string): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const supabase = createClient()
  const { error } = await supabase
    .from('training_goals')
    .update({ is_achieved: true, updated_at: new Date().toISOString() })
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function deleteGoal(goalId: string): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const supabase = createClient()
  const { error } = await supabase
    .from('training_goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
