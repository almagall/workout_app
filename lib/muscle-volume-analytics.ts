import { createClient } from './supabase/client'
import { getCurrentUser } from './auth-simple'
import { getExerciseByName } from './exercise-database'

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Calves', 'Core'] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

/**
 * Get training volume per muscle group for a time period.
 * Volume = weighted sets: primary muscle gets 1.0 per set, secondary gets 0.5 per set.
 * Returns Record<MuscleGroup, totalVolume>.
 */
export async function getMuscleVolumeByPeriod(days: number): Promise<Record<string, number>> {
  const user = getCurrentUser()
  if (!user) return {}

  const supabase = createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = today.toISOString().split('T')[0]

  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_complete', true)
    .gte('workout_date', startDateStr)
    .lte('workout_date', endDateStr)

  if (error || !sessions || sessions.length === 0) {
    return {}
  }

  const sessionIds = sessions.map((s) => s.id)

  const { data: logs, error: logsError } = await supabase
    .from('exercise_logs')
    .select('exercise_name, set_type')
    .in('session_id', sessionIds)
    .eq('set_type', 'working')

  if (logsError || !logs) {
    return {}
  }

  const volume: Record<string, number> = {}
  for (const group of MUSCLE_GROUPS) {
    volume[group] = 0
  }

  for (const log of logs) {
    const entry = getExerciseByName(log.exercise_name)
    if (!entry) continue

    const primary = entry.muscleGroup
    const secondaries = entry.secondaryMuscleGroups ?? []

    volume[primary] = (volume[primary] ?? 0) + 1.0
    for (const sec of secondaries) {
      volume[sec] = (volume[sec] ?? 0) + 0.5
    }
  }

  return volume
}
