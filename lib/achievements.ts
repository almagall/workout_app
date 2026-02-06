/**
 * Achievements: definitions, unlock criteria, and notification on unlock.
 */

import { getCurrentUser } from './auth-simple'
import { createClient } from './supabase/client'
import { getWorkoutSessions } from './storage'
import { getFriends } from './friends'

export type AchievementId =
  | 'first_workout'
  | 'ten_workouts'
  | 'fifty_workouts'
  | 'hundred_workouts'
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'week_warrior'
  | 'friend_request_sent'
  | 'first_friend'
  | 'five_friends'
  | 'first_template'
  | 'early_adopter'

export type AchievementTier = 'easy' | 'medium' | 'hard' | 'legendary'

export interface AchievementDefinition {
  id: AchievementId
  name: string
  description: string
  tier: AchievementTier
  icon: string // emoji or short label
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  { id: 'first_workout', name: 'First Step', description: 'Log your first workout', tier: 'easy', icon: '🎯' },
  { id: 'ten_workouts', name: 'Getting Started', description: 'Log 10 workouts', tier: 'easy', icon: '📈' },
  { id: 'fifty_workouts', name: 'Dedicated', description: 'Log 50 workouts', tier: 'medium', icon: '💪' },
  { id: 'hundred_workouts', name: 'Centurion', description: 'Log 100 workouts', tier: 'hard', icon: '🏆' },
  { id: 'streak_3', name: 'Streak Starter', description: 'Complete 2 consecutive weeks with at least one workout each week', tier: 'easy', icon: '🔥' },
  { id: 'streak_7', name: 'Week Warrior', description: 'Complete 4 consecutive weeks with at least one workout each week', tier: 'medium', icon: '⚡' },
  { id: 'streak_30', name: 'Unstoppable', description: 'Complete 12 consecutive weeks with at least one workout each week', tier: 'hard', icon: '🌟' },
  { id: 'week_warrior', name: 'Busy Week', description: 'Log 3 workouts within 7 days', tier: 'easy', icon: '📅' },
  { id: 'friend_request_sent', name: 'Reaching Out', description: 'Send your first friend request', tier: 'easy', icon: '👋' },
  { id: 'first_friend', name: 'Making Friends', description: 'Add your first friend', tier: 'easy', icon: '🤝' },
  { id: 'five_friends', name: 'Social Butterfly', description: 'Add 5 friends', tier: 'medium', icon: '🦋' },
  { id: 'first_template', name: 'Template Builder', description: 'Create your first custom template', tier: 'easy', icon: '📋' },
  { id: 'early_adopter', name: 'Early Adopter', description: 'Unlock 5 different achievements', tier: 'medium', icon: '⭐' },
]

/** Get achievement definition by id. */
export function getAchievementDefinition(id: AchievementId): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find((a) => a.id === id)
}

/** Get all achievement IDs the current user has unlocked. */
export async function getUnlockedAchievementIds(): Promise<AchievementId[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', user.id)

  if (error) return []
  return (data ?? []).map((r) => r.achievement_id as AchievementId)
}

/** Return the Monday of the week (ISO week) for the given date in YYYY-MM-DD. */
function getWeekKey(yyyyMmDd: string): string {
  const d = new Date(yyyyMmDd + 'T12:00:00Z')
  const dayOfWeek = (d.getUTCDay() + 6) % 7 // Monday=0, Sunday=6
  d.setUTCDate(d.getUTCDate() - dayOfWeek)
  return d.toISOString().slice(0, 10)
}

/** Return date string (YYYY-MM-DD) that is `days` days before the given date. */
function dateSub(yyyyMmDd: string, days: number): string {
  const d = new Date(yyyyMmDd + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

/** Count consecutive workout weeks: from most recent week with a workout, count backward while each week has at least one. */
function getConsecutiveWorkoutWeeks(dates: string[]): number {
  const completedWeeks = new Set([...new Set(dates)].map(getWeekKey))
  if (completedWeeks.size === 0) return 0
  const sortedWeeks = [...completedWeeks].sort((a, b) => b.localeCompare(a))
  const mostRecentWeek = sortedWeeks[0]
  const today = new Date().toISOString().slice(0, 10)
  if (mostRecentWeek > getWeekKey(today)) return 0
  let count = 1
  let current = dateSub(mostRecentWeek, 7)
  while (completedWeeks.has(current)) {
    count++
    current = dateSub(current, 7)
  }
  return count
}

/** Check if user has 3+ workouts in any rolling 7-day window. */
function hasWeekWarrior(dates: string[]): boolean {
  const sorted = [...new Set(dates)].sort()
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i]
    const endDate = new Date(start + 'T12:00:00Z')
    endDate.setUTCDate(endDate.getUTCDate() + 6)
    const end = endDate.toISOString().slice(0, 10)
    const inWindow = sorted.filter((d) => d >= start && d <= end).length
    if (inWindow >= 3) return true
  }
  return false
}

/** Check and unlock any achievements the user now qualifies for; create notifications for newly unlocked. */
export async function checkAndUnlockAchievements(): Promise<AchievementId[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()
  const alreadyUnlocked = await getUnlockedAchievementIds()
  const newlyUnlocked: AchievementId[] = []

  const sessions = await getWorkoutSessions()
  const workoutCount = sessions.length
  const workoutDates = sessions.map((s) => s.workout_date)
  const consecutiveWeeks = getConsecutiveWorkoutWeeks(workoutDates)
  const weekWarrior = hasWeekWarrior(workoutDates)

  const friends = await getFriends()
  const friendCount = friends.length

  const { data: templates } = await supabase
    .from('workout_templates')
    .select('id')
    .eq('user_id', user.id)
  const templateCount = templates?.length ?? 0

  const { count: sentRequestCount } = await supabase
    .from('friend_requests')
    .select('*', { count: 'exact', head: true })
    .eq('from_user_id', user.id)

  const candidates: AchievementId[] = []
  if (workoutCount >= 1) candidates.push('first_workout')
  if (workoutCount >= 10) candidates.push('ten_workouts')
  if (workoutCount >= 50) candidates.push('fifty_workouts')
  if (workoutCount >= 100) candidates.push('hundred_workouts')
  if (consecutiveWeeks >= 2) candidates.push('streak_3')
  if (consecutiveWeeks >= 4) candidates.push('streak_7')
  if (consecutiveWeeks >= 12) candidates.push('streak_30')
  if (weekWarrior) candidates.push('week_warrior')
  if ((sentRequestCount ?? 0) >= 1) candidates.push('friend_request_sent')
  if (friendCount >= 1) candidates.push('first_friend')
  if (friendCount >= 5) candidates.push('five_friends')
  if (templateCount >= 1) candidates.push('first_template')

  for (const id of candidates) {
    if (alreadyUnlocked.includes(id)) continue
    const def = getAchievementDefinition(id as AchievementId)
    if (!def) continue

    const { error } = await supabase.from('user_achievements').insert({
      user_id: user.id,
      achievement_id: id,
    })
    if (error) continue

    alreadyUnlocked.push(id as AchievementId)
    newlyUnlocked.push(id as AchievementId)

    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'achievement_unlocked',
      from_user_id: user.id,
      reference_id: null,
      metadata: { achievement_id: id, achievement_name: def.name },
    })
  }

  if (alreadyUnlocked.length >= 5 && !alreadyUnlocked.includes('early_adopter')) {
    const { error } = await supabase.from('user_achievements').insert({
      user_id: user.id,
      achievement_id: 'early_adopter',
    })
    if (!error) {
      const def = getAchievementDefinition('early_adopter')!
      newlyUnlocked.push('early_adopter')
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'achievement_unlocked',
        from_user_id: user.id,
        reference_id: null,
        metadata: { achievement_id: 'early_adopter', achievement_name: def.name },
      })
    }
  }

  return newlyUnlocked
}
