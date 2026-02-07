import { createClient } from './supabase/client'
import { getCurrentUser } from './auth-simple'
import { estimated1RM } from './estimated-1rm'
import type { StrengthStandard } from '@/types/profile'

// Strength standards based on Symmetric Strength / ExRx.net
// Standards are in lbs for each bodyweight (male)
const MALE_STANDARDS: Record<number, Record<string, Record<string, number>>> = {
  150: {
    'Bench Press': { beginner: 95, novice: 120, intermediate: 165, advanced: 215, elite: 270 },
    'Squat': { beginner: 130, novice: 175, intermediate: 250, advanced: 330, elite: 410 },
    'Deadlift': { beginner: 165, novice: 220, intermediate: 305, advanced: 400, elite: 500 },
    'Overhead Press': { beginner: 60, novice: 80, intermediate: 110, advanced: 145, elite: 185 },
  },
  165: {
    'Bench Press': { beginner: 105, novice: 135, intermediate: 185, advanced: 245, elite: 300 },
    'Squat': { beginner: 145, novice: 200, intermediate: 280, advanced: 360, elite: 445 },
    'Deadlift': { beginner: 185, novice: 245, intermediate: 340, advanced: 445, elite: 550 },
    'Overhead Press': { beginner: 65, novice: 90, intermediate: 120, advanced: 160, elite: 205 },
  },
  180: {
    'Bench Press': { beginner: 115, novice: 150, intermediate: 205, advanced: 270, elite: 330 },
    'Squat': { beginner: 160, novice: 220, intermediate: 310, advanced: 395, elite: 485 },
    'Deadlift': { beginner: 205, novice: 270, intermediate: 375, advanced: 485, elite: 595 },
    'Overhead Press': { beginner: 75, novice: 100, intermediate: 135, advanced: 175, elite: 225 },
  },
  198: {
    'Bench Press': { beginner: 130, novice: 165, intermediate: 225, advanced: 295, elite: 360 },
    'Squat': { beginner: 175, novice: 240, intermediate: 335, advanced: 430, elite: 525 },
    'Deadlift': { beginner: 225, novice: 295, intermediate: 410, advanced: 525, elite: 640 },
    'Overhead Press': { beginner: 80, novice: 110, intermediate: 145, advanced: 190, elite: 240 },
  },
  220: {
    'Bench Press': { beginner: 140, novice: 180, intermediate: 245, advanced: 320, elite: 390 },
    'Squat': { beginner: 190, novice: 260, intermediate: 360, advanced: 465, elite: 565 },
    'Deadlift': { beginner: 245, novice: 320, intermediate: 445, advanced: 565, elite: 685 },
    'Overhead Press': { beginner: 90, novice: 120, intermediate: 160, advanced: 205, elite: 260 },
  },
}

// Female standards (typically 60-70% of male standards)
const FEMALE_STANDARDS: Record<number, Record<string, Record<string, number>>> = {
  120: {
    'Bench Press': { beginner: 45, novice: 60, intermediate: 85, advanced: 115, elite: 145 },
    'Squat': { beginner: 70, novice: 100, intermediate: 145, advanced: 190, elite: 240 },
    'Deadlift': { beginner: 90, novice: 125, intermediate: 175, advanced: 230, elite: 290 },
    'Overhead Press': { beginner: 30, novice: 40, intermediate: 60, advanced: 80, elite: 100 },
  },
  140: {
    'Bench Press': { beginner: 55, novice: 70, intermediate: 100, advanced: 135, elite: 170 },
    'Squat': { beginner: 85, novice: 120, intermediate: 170, advanced: 225, elite: 280 },
    'Deadlift': { beginner: 110, novice: 145, intermediate: 205, advanced: 270, elite: 335 },
    'Overhead Press': { beginner: 35, novice: 50, intermediate: 70, advanced: 95, elite: 120 },
  },
  165: {
    'Bench Press': { beginner: 65, novice: 85, intermediate: 120, advanced: 155, elite: 195 },
    'Squat': { beginner: 100, novice: 140, intermediate: 195, advanced: 255, elite: 320 },
    'Deadlift': { beginner: 125, novice: 170, intermediate: 235, advanced: 310, elite: 385 },
    'Overhead Press': { beginner: 40, novice: 55, intermediate: 80, advanced: 105, elite: 135 },
  },
}

/**
 * Normalize exercise name to match standards table
 */
export function normalizeExerciseName(name: string): string | null {
  const normalized = name.toLowerCase().trim()

  if (normalized.includes('bench') && !normalized.includes('close')) {
    return 'Bench Press'
  }
  if (normalized.includes('squat') && !normalized.includes('pistol')) {
    return 'Squat'
  }
  if (normalized.includes('deadlift')) {
    return 'Deadlift'
  }
  if (normalized.includes('overhead press') || normalized.includes('ohp') || normalized.includes('military press')) {
    return 'Overhead Press'
  }

  return null
}

/**
 * Interpolate standards for bodyweights between table entries
 */
function interpolateStandard(
  weight: number,
  standards: Record<number, Record<string, Record<string, number>>>,
  exercise: string,
  tier: string
): number | null {
  const weights = Object.keys(standards).map(Number).sort((a, b) => a - b)

  // If exact match exists
  if (standards[weight]?.[exercise]?.[tier]) {
    return standards[weight][exercise][tier]
  }

  // Find surrounding weights
  let lower = null
  let upper = null

  for (const w of weights) {
    if (w <= weight) lower = w
    if (w >= weight && upper === null) upper = w
  }

  if (!lower || !upper || !standards[lower]?.[exercise]?.[tier] || !standards[upper]?.[exercise]?.[tier]) {
    return null
  }

  // Linear interpolation
  const lowerVal = standards[lower][exercise][tier]
  const upperVal = standards[upper][exercise][tier]
  const ratio = (weight - lower) / (upper - lower)
  return lowerVal + (upperVal - lowerVal) * ratio
}

/**
 * Get standards for a specific lift, bodyweight, and gender
 */
export function getStandardForLift(
  exercise: string,
  bodyweight: number,
  gender: 'male' | 'female' | 'other'
): Record<string, number> | null {
  const standards = gender === 'female' ? FEMALE_STANDARDS : MALE_STANDARDS
  const normalizedExercise = normalizeExerciseName(exercise)

  if (!normalizedExercise) return null

  const tiers = ['beginner', 'novice', 'intermediate', 'advanced', 'elite']
  const result: Record<string, number> = {}

  for (const tier of tiers) {
    const value = interpolateStandard(bodyweight, standards, normalizedExercise, tier)
    if (value) {
      result[tier] = Math.round(value)
    }
  }

  return Object.keys(result).length > 0 ? result : null
}

/**
 * Calculate strength tier for a specific lift
 */
export function calculateStrengthTier(
  currentWeight: number,
  bodyweight: number,
  exercise: string,
  gender: 'male' | 'female' | 'other'
): StrengthStandard | null {
  const standards = getStandardForLift(exercise, bodyweight, gender)
  if (!standards) return null

  const tiers: Array<'beginner' | 'novice' | 'intermediate' | 'advanced' | 'elite'> = [
    'beginner',
    'novice',
    'intermediate',
    'advanced',
    'elite',
  ]

  let tier: typeof tiers[number] = 'beginner'

  // Find which tier the user falls into
  for (let i = 0; i < tiers.length; i++) {
    if (currentWeight >= standards[tiers[i]]) {
      tier = tiers[i]
    }
  }

  const currentTierWeight = standards[tier]
  const currentTierIndex = tiers.indexOf(tier)
  const nextTierIndex = Math.min(currentTierIndex + 1, tiers.length - 1)
  const nextTierName = tiers[nextTierIndex]
  const nextTierWeight = standards[nextTierName]

  return {
    exercise: normalizeExerciseName(exercise) || exercise,
    currentWeight,
    tier,
    currentTierWeight,
    nextTierWeight,
    nextTierName,
  }
}

/**
 * Get all strength standards for user's main lifts
 */
export async function getAllStrengthStandards(): Promise<StrengthStandard[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()

  // Get user's bodyweight and gender
  const { data: profile } = await supabase
    .from('simple_users')
    .select('bodyweight, bodyweight_unit, gender')
    .eq('user_id', user.id)
    .single()

  if (!profile || !profile.bodyweight || !profile.gender) {
    return []
  }

  let bodyweight = profile.bodyweight

  // Convert to lbs if needed (standards are in lbs)
  if (profile.bodyweight_unit === 'kg') {
    bodyweight = bodyweight * 2.20462
  }

  // Get main lifts: Bench Press, Squat, Deadlift, Overhead Press
  const mainExercises = ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press']
  const results: StrengthStandard[] = []

  for (const exerciseName of mainExercises) {
    // Find this exercise in user's templates
    const { data: logs } = await supabase
      .from('exercise_logs')
      .select('weight, reps, set_type, workout_sessions!inner(user_id, is_complete)')
      .eq('workout_sessions.user_id', user.id)
      .eq('workout_sessions.is_complete', true)
      .eq('set_type', 'working')
      .ilike('exercise_name', `%${exerciseName}%`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (logs && logs.length > 0) {
      // Get max estimated 1RM
      const maxE1RM = Math.max(...logs.map(log => estimated1RM(log.weight, log.reps)))

      const standard = calculateStrengthTier(maxE1RM, bodyweight, exerciseName, profile.gender)
      if (standard) {
        results.push(standard)
      }
    }
  }

  return results
}
