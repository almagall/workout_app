import type { PlanType, PerformanceStatus } from '@/types/workout'

interface SetData {
  weight: number
  reps: number
  rpe: number
  targetWeight: number | null
  targetReps: number | null
  targetRpe: number | null
}

interface ExercisePerformance {
  exerciseName: string
  status: PerformanceStatus
  overperformedCount: number
  metTargetCount: number
  underperformedCount: number
  sets: SetData[]
}

interface WorkoutPerformance {
  exercises: ExercisePerformance[]
  overallRating: number
}

export interface E1RMTrendContext {
  trend: 'up' | 'down' | 'stable'
  changeLbs: number | null
  message: string
}

export interface FeedbackContext {
  underperformanceMap?: Map<string, number>
  lastSessionRpeMap?: Map<string, number>
  targetStrategy?: string | null
  e1rmTrendMap?: Map<string, E1RMTrendContext>
  /** Consecutive sessions (before today) where exercise met/overperformed. Used for "N sessions in a row." */
  hitStreakMap?: Map<string, number>
  /** Days since last time user did this workout day. Used for "First time back in 2 weeks." */
  daysSinceLastSession?: number | null
}

/** Helper: avg RPE of working sets */
function avgRpe(sets: SetData[]): number {
  if (sets.length === 0) return 0
  const sum = sets.reduce((s, x) => s + x.rpe, 0)
  return Math.round((sum / sets.length) * 10) / 10
}

/** Helper: max RPE in sets */
function maxRpe(sets: SetData[]): number {
  return sets.length === 0 ? 0 : Math.max(...sets.map((s) => s.rpe))
}

/** Helper: actionable rep cue when close to target */
function repCue(
  sets: SetData[],
  status: PerformanceStatus
): string | null {
  if (status !== 'underperformed' || sets.length === 0) return null
  const avg = avgRpe(sets)
  const withTargets = sets.filter((s) => s.targetReps != null)
  if (withTargets.length === 0) return null
  const avgReps = withTargets.reduce((s, x) => s + x.reps, 0) / withTargets.length
  const avgTarget = withTargets.reduce((s, x) => s + (x.targetReps ?? 0), 0) / withTargets.length
  const gap = Math.round(avgTarget - avgReps)
  if (gap <= 0) return null
  if (gap === 1) return 'Try 1 extra rep next time—you were close.'
  if (gap <= 3) return `Aim for ${gap} more rep(s) next time.`
  return null
}

/** Helper: RPE-based actionable cue */
function rpeCue(
  sets: SetData[],
  lastSessionRpe: number | undefined,
  status: PerformanceStatus
): string | null {
  const currentAvg = avgRpe(sets)
  const currentMax = maxRpe(sets)
  if (status === 'overperformed' && currentMax >= 9) {
    return 'You pushed to RPE 9+. Next session aim for RPE 7–8 to manage fatigue.'
  }
  if (status === 'underperformed' && lastSessionRpe != null && lastSessionRpe >= 8.5) {
    return `Last session averaged RPE ${lastSessionRpe}; today aim for RPE 7–8 to recover.`
  }
  if (status === 'underperformed' && currentAvg >= 9) {
    return 'Today felt very hard (RPE 9+). Consider lighter weight or extra rest next time.'
  }
  if (status === 'met_target' && currentAvg >= 8.5) {
    return 'Solid effort at RPE 8–9. Keep this intensity for progressive overload.'
  }
  return null
}

/** Helper: deload suggestion based on underperformance streak */
function deloadCue(
  consecutiveUnderperformance: number,
  programType: string | null
): string | null {
  if (consecutiveUnderperformance < 2) return null
  if (consecutiveUnderperformance >= 3) {
    if (programType === '531') {
      return 'Consider a deload: reduce weight to ~70% for 1 week, or take an extra rest day.'
    }
    if (programType === 'startingStrength' || programType === 'stronglifts' || programType === 'gzclp') {
      return 'Consider a deload: reduce weight 10% for next session, then work back up.'
    }
    return 'Consider a deload: reduce weight 5–10% for 1–2 sessions to allow recovery.'
  }
  if (consecutiveUnderperformance === 2) {
    return 'You\'ve missed 2 sessions in a row. If you miss again, consider a planned deload.'
  }
  return null
}

/** Helper: program-specific phrasing */
function programPhrase(
  programType: string | null,
  planType: PlanType,
  status: PerformanceStatus,
  isOverperformed: boolean
): string {
  if (programType === '531') {
    if (status === 'overperformed') {
      return 'The AMRAP set is meant to be pushed—nice work hitting extra reps.'
    }
    if (status === 'underperformed') {
      return 'On 5/3/1, the last set is AMRAP at RPE 9. If you couldn\'t hit targets, consider recovery.'
    }
    return 'You hit your prescribed percentages. Next week, push the AMRAP set to RPE 9.'
  }
  if (programType === 'startingStrength' || programType === 'stronglifts') {
    if (status === 'overperformed') {
      return 'Linear progression is working—add 5 lb (upper) or 10 lb (lower) next session.'
    }
    if (status === 'underperformed') {
      return 'Repeat same weight next session. If you miss again, consider a deload.'
    }
    return 'Met your reps—add 5 lb (upper) or 10 lb (lower) next session.'
  }
  if (programType === 'phul') {
    if (status === 'overperformed') {
      return 'Good adaptation. Keep power days heavy (RPE 8) and hypertrophy days moderate (RPE 7–8).'
    }
    if (status === 'underperformed') {
      return 'Recovery matters on PHUL—ensure adequate sleep and nutrition between sessions.'
    }
    return 'Solid work. Power days: RPE 8. Hypertrophy days: RPE 7–8 for volume.'
  }
  if (programType === 'gzclp') {
    if (status === 'overperformed') {
      return 'T1 AMRAP set looked good. T2/T3 should stay moderate—RPE 7–8.'
    }
    if (status === 'underperformed') {
      return 'GZCLP uses linear progression—repeat same weight next session if you missed.'
    }
    return 'T1: push last set to RPE 9. T2/T3: keep RPE 7–8.'
  }
  if (programType === 'texasMethod') {
    if (status === 'overperformed') {
      return 'Volume and intensity balance looks good. Keep recovery day light (RPE 6–7).'
    }
    if (status === 'underperformed') {
      return 'Texas Method is demanding. If you\'re struggling, consider an extra recovery day.'
    }
    return 'On track. Volume day: 5x5. Intensity day: push for a new 5RM.'
  }
  // Default hypertrophy/strength
  if (planType === 'hypertrophy') {
    if (status === 'overperformed') {
      return 'Volume and intensity were on point. Targets will increase next week.'
    }
    if (status === 'underperformed') {
      return 'Focus on recovery and mind-muscle connection. Targets will adjust accordingly.'
    }
    return 'Good volume. Aim for RPE 7–8 across sets for optimal hypertrophy.'
  } else {
    if (status === 'overperformed') {
      return 'Strength progression is solid. Targets will increase conservatively.'
    }
    if (status === 'underperformed') {
      return 'Prioritize form and recovery. Targets will adjust to match your capacity.'
    }
    return 'Good strength work. Keep RPE 7–8 on working sets.'
  }
}

/**
 * Generate feedback for a single exercise
 */
export function generateExerciseFeedback(
  performance: ExercisePerformance,
  planType: PlanType,
  context?: FeedbackContext
): string {
  const { exerciseName, status, overperformedCount, metTargetCount, underperformedCount, sets } =
    performance

  // Include current session in streak if underperformed
  const streak = (context?.underperformanceMap?.get(exerciseName) ?? 0) + (status === 'underperformed' ? 1 : 0)
  const lastSessionRpe = context?.lastSessionRpeMap?.get(exerciseName)
  const programType = context?.targetStrategy ?? null
  const previousHitStreak = context?.hitStreakMap?.get(exerciseName) ?? 0
  const currentHitStreak =
    status === 'met_target' || status === 'overperformed' ? previousHitStreak + 1 : 0

  const parts: string[] = []

  // Primary message by status
  if (status === 'overperformed') {
    if (overperformedCount === sets.length) {
      parts.push(
        `You exceeded targets on all ${overperformedCount} set(s). ${programPhrase(
          programType,
          planType,
          'overperformed',
          true
        )}`
      )
    } else {
      parts.push(
        `You exceeded targets on ${overperformedCount} set(s). ${programPhrase(
          programType,
          planType,
          'overperformed',
          true
        )}`
      )
    }
  } else if (status === 'underperformed') {
    if (underperformedCount === sets.length) {
      parts.push(
        `You fell short on all ${underperformedCount} set(s). ${programPhrase(
          programType,
          planType,
          'underperformed',
          false
        )}`
      )
    } else {
      parts.push(
        `You struggled on ${underperformedCount} set(s). ${programPhrase(
          programType,
          planType,
          'underperformed',
          false
        )}`
      )
    }
  } else {
    parts.push(
      `You met your targets on ${metTargetCount} set(s). ${programPhrase(
        programType,
        planType,
        'met_target',
        false
      )}`
    )
  }

  // RPE cue
  const rpe = rpeCue(sets, lastSessionRpe, status)
  if (rpe) parts.push(rpe)

  // Rep cue (actionable)
  const rep = repCue(sets, status)
  if (rep) parts.push(rep)

  // Deload suggestion
  const deload = deloadCue(streak, programType)
  if (deload) parts.push(deload)

  // e1RM trend (readiness / progress)
  const e1rmTrend = context?.e1rmTrendMap?.get(exerciseName)
  if (e1rmTrend?.message) parts.push(e1rmTrend.message)

  // Hit streak (sessions in a row meeting target)
  if (currentHitStreak >= 2) {
    parts.push(`You've hit this exercise ${currentHitStreak} sessions in a row.`)
  }

  return parts.join(' ')
}

/**
 * Generate overall workout feedback
 */
export function generateWorkoutFeedback(
  workout: WorkoutPerformance,
  planType: PlanType,
  context?: FeedbackContext
): string {
  const { exercises, overallRating } = workout

  const overperformedExercises = exercises.filter((e) => e.status === 'overperformed').length
  const metTargetExercises = exercises.filter((e) => e.status === 'met_target').length
  const underperformedExercises = exercises.filter((e) => e.status === 'underperformed').length

  // Overall session RPE (avg across all working sets)
  const allSets = exercises.flatMap((e) => e.sets)
  const sessionAvgRpe = avgRpe(allSets)
  const sessionMaxRpe = maxRpe(allSets)

  // Previous session RPE (if available)
  const lastSessionRpes = exercises
    .map((e) => context?.lastSessionRpeMap?.get(e.exerciseName))
    .filter((r): r is number => r != null)
  const prevSessionAvgRpe =
    lastSessionRpes.length > 0
      ? lastSessionRpes.reduce((a, b) => a + b, 0) / lastSessionRpes.length
      : null

  const programType = context?.targetStrategy ?? null

  const parts: string[] = []

  if ((context?.daysSinceLastSession ?? 0) >= 14) {
    parts.push('First time back in 2+ weeks—targets were kept conservative. ')
  }

  if (overallRating >= 8) {
    parts.push(
      `Outstanding workout! You performed exceptionally well across ${overperformedExercises} exercise(s). `
    )
    if (programType === '531') {
      parts.push('You hit your prescribed percentages and pushed the AMRAP sets. ')
    } else if (programType === 'startingStrength' || programType === 'stronglifts') {
      parts.push('Linear progression is on track—add weight next session. ')
    } else if (programType === 'gzclp') {
      parts.push('T1 progression looks good—keep T2/T3 moderate. ')
    } else if (programType === 'phul') {
      parts.push('Power and hypertrophy balance is working. ')
    } else if (planType === 'hypertrophy') {
      parts.push('Your volume and intensity were on point. ')
    } else {
      parts.push('Your strength is progressing well. ')
    }
    if (sessionMaxRpe >= 9) {
      parts.push('Today you pushed to RPE 9+—aim for RPE 7–8 next session to manage fatigue.')
    } else {
      parts.push('Keep this momentum going!')
    }
  } else if (overallRating >= 6) {
    parts.push(
      `Good workout overall. You met or exceeded targets on ${metTargetExercises + overperformedExercises} exercise(s). `
    )
    if (underperformedExercises > 0) {
      parts.push(
        `You struggled with ${underperformedExercises} exercise(s)—this is normal. `
      )
      if (prevSessionAvgRpe != null && prevSessionAvgRpe >= 8.5) {
        parts.push(
          `Last session averaged RPE ${prevSessionAvgRpe}; consider aiming for RPE 7–8 next time to recover. `
        )
      }
      parts.push('Targets will adjust accordingly.')
    } else {
      parts.push('Steady progress. ')
      if (sessionAvgRpe >= 7 && sessionAvgRpe <= 8.5) {
        parts.push(`RPE ${sessionAvgRpe} across sets—ideal for progressive overload.`)
      } else {
        parts.push('Keep it up!')
      }
    }
  } else {
    parts.push(
      `This was a challenging workout. You underperformed on ${underperformedExercises} exercise(s). `
    )
    if (prevSessionAvgRpe != null && prevSessionAvgRpe >= 8.5) {
      parts.push(
        `Last session averaged RPE ${prevSessionAvgRpe}; today aim for RPE 6–7 next session to recover. `
      )
    }
    if (planType === 'hypertrophy') {
      parts.push(
        'Consider sleep, nutrition, stress, and recovery. We will adjust targets accordingly. For hypertrophy, focus on controlled tempo and full range of motion.'
      )
    } else {
      parts.push(
        'Ensure adequate sleep, nutrition, and stress management. Targets will adjust to keep you progressing safely. Prioritize form and rest between sets.'
      )
    }
  }

  // Deload suggestion if any exercise has 2+ underperformance streak (include current session)
  const maxUnderperformance = Math.max(
    ...exercises.map((e) =>
      (context?.underperformanceMap?.get(e.exerciseName) ?? 0) + (e.status === 'underperformed' ? 1 : 0)
    ),
    0
  )
  const deload = deloadCue(maxUnderperformance, programType)
  if (deload) {
    parts.push(` ${deload}`)
  }

  return parts.join('')
}

/**
 * Calculate overall workout rating (1-10)
 */
export function calculateWorkoutRating(workout: WorkoutPerformance): number {
  const { exercises } = workout
  if (exercises.length === 0) return 5

  let totalScore = 0
  exercises.forEach((exercise) => {
    if (exercise.status === 'overperformed') {
      totalScore += 9
    } else if (exercise.status === 'met_target') {
      totalScore += 7
    } else {
      totalScore += 4
    }
  })

  const averageScore = totalScore / exercises.length
  return Math.round(averageScore * 10) / 10
}
