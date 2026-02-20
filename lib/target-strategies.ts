/**
 * Preset-specific target calculation (e.g. 5/3/1 percentage-based).
 * Used when template.preset_id is set and preset has targetStrategy !== 'default'.
 * Custom templates always use default planType-based logic in progressive-overload.ts.
 */

/** Cycle week 1–3 for 5/3/1. */
export type CycleWeek = 1 | 2 | 3

export interface SetTargetResult {
  targetWeight: number | null
  targetReps: number | null
  targetRpe: number | null
}

/**
 * 5/3/1: Week 1 = 5/5/5+, Week 2 = 3/3/3+, Week 3 = 5/3/1+
 * Percentages of training max (TM). TM is typically 90% of 1RM.
 */
const FIVE31_PERCENTAGES: Record<CycleWeek, [number, number, number]> = {
  1: [65, 75, 85],
  2: [70, 80, 90],
  3: [75, 85, 95],
}

const FIVE31_REPS: Record<CycleWeek, [number, number, number]> = {
  1: [5, 5, 5], // last set is 5+
  2: [3, 3, 3], // last set is 3+
  3: [5, 3, 1], // last set is 1+
}

/**
 * Compute target for one working set in 5/3/1.
 * @param cycleWeek 1, 2, or 3
 * @param setIndex 0-based (0 = first working set)
 * @param trainingMax Typically 90% of estimated 1RM
 */
export function calculate531SetTarget(
  cycleWeek: CycleWeek,
  setIndex: 0 | 1 | 2,
  trainingMax: number,
  roundToLoadable?: (w: number) => number
): SetTargetResult {
  const pct = FIVE31_PERCENTAGES[cycleWeek][setIndex]
  const reps = FIVE31_REPS[cycleWeek][setIndex]
  const raw = trainingMax * (pct / 100)
  const targetWeight = roundToLoadable ? roundToLoadable(raw) : Math.round(raw * 2) / 2
  const isLastSet = setIndex === 2
  const targetRpe = isLastSet ? 9 : 8 // AMRAP on last set
  return {
    targetWeight,
    targetReps: reps,
    targetRpe,
  }
}

/**
 * Derive cycle week (1–3) from number of completed sessions for this template day.
 * Session 1 → week 1, session 2 → week 2, session 3 → week 3, session 4 → week 1, ...
 */
export function get531CycleWeek(sessionCount: number): CycleWeek {
  const w = (sessionCount % 3) || 3
  return w as CycleWeek
}

// —— Linear Progression (Starting Strength, StrongLifts) ——

const LOWER_BODY_EXERCISES = [
  'squat', 'deadlift', 'leg press', 'leg curl', 'leg extension',
  'romanian deadlift', 'front squat', 'lunge',
]

function isLowerBodyExercise(exerciseName: string): boolean {
  const lower = exerciseName.toLowerCase()
  return LOWER_BODY_EXERCISES.some((e) => lower.includes(e))
}

/**
 * Linear progression: add 5 lb upper, 10 lb lower per session.
 * On failure: repeat same weight. On 3+ consecutive failures: deload 10%.
 */
export function calculateLinearProgressionTarget(
  previousSet: {
    weight: number
    reps: number
    targetWeight: number | null
    targetReps: number | null
  },
  exerciseName: string,
  targetReps: number,
  consecutiveUnderperformance: number,
  roundToLoadable?: (w: number) => number
): SetTargetResult {
  const isLower = isLowerBodyExercise(exerciseName)
  const increment = isLower ? 10 : 5

  let targetWeight: number
  if (consecutiveUnderperformance >= 3) {
    targetWeight = previousSet.weight * 0.9
  } else if (previousSet.targetWeight != null && previousSet.targetReps != null) {
    const metTarget = previousSet.reps >= previousSet.targetReps && previousSet.weight >= (previousSet.targetWeight * 0.98)
    targetWeight = metTarget
      ? previousSet.weight + increment
      : previousSet.weight
  } else {
    targetWeight = previousSet.weight + increment
  }

  const rounded = roundToLoadable ? roundToLoadable(targetWeight) : Math.round(targetWeight * 2) / 2
  return {
    targetWeight: rounded,
    targetReps,
    targetRpe: 8,
  }
}

// —— GZCLP ——

/** GZCLP tier: T1 = 5x3+, T2 = 3x10, T3 = 3x10 */
export function calculateGZCLPSetTarget(
  tier: 1 | 2 | 3,
  setIndex: number,
  previousSet: {
    weight: number
    reps: number
    targetWeight: number | null
    targetReps: number | null
  },
  exerciseName: string,
  consecutiveUnderperformance: number,
  roundToLoadable?: (w: number) => number
): SetTargetResult {
  const round = (w: number) => roundToLoadable ? roundToLoadable(w) : Math.round(w * 2) / 2
  const isLower = isLowerBodyExercise(exerciseName)
  if (tier === 1) {
    const increment = isLower ? 10 : 5
    let targetWeight: number
    if (consecutiveUnderperformance >= 3) {
      targetWeight = previousSet.weight * 0.9
    } else if (previousSet.targetWeight != null) {
      const metTarget = previousSet.reps >= 3 && previousSet.weight >= (previousSet.targetWeight * 0.98)
      targetWeight = metTarget ? previousSet.weight + increment : previousSet.weight
    } else {
      targetWeight = previousSet.weight + increment
    }
    const isLastSet = setIndex >= 4
    return {
      targetWeight: round(targetWeight),
      targetReps: 3,
      targetRpe: isLastSet ? 9 : 8,
    }
  }
  if (tier === 2 || tier === 3) {
    const increment = isLower ? 5 : 2.5
    let targetWeight: number
    if (consecutiveUnderperformance >= 3) {
      targetWeight = previousSet.weight * 0.9
    } else if (previousSet.targetWeight != null) {
      const metTarget = previousSet.reps >= 10 && previousSet.weight >= (previousSet.targetWeight * 0.98)
      targetWeight = metTarget ? previousSet.weight + increment : previousSet.weight
    } else {
      targetWeight = previousSet.weight + increment
    }
    return {
      targetWeight: round(targetWeight),
      targetReps: 10,
      targetRpe: 8,
    }
  }
  return { targetWeight: null, targetReps: null, targetRpe: null }
}

// —— Texas Method ——

/** Texas Method: Volume 5x5, Recovery 2x5 light, Intensity 1x5 heavy */
export function getTexasMethodDayType(dayLabel: string): 'volume' | 'recovery' | 'intensity' | null {
  const label = dayLabel.toLowerCase()
  if (label.includes('volume')) return 'volume'
  if (label.includes('recovery')) return 'recovery'
  if (label.includes('intensity')) return 'intensity'
  return null
}

export function calculateTexasMethodSetTarget(
  dayType: 'volume' | 'recovery' | 'intensity',
  setIndex: number,
  previousSet: {
    weight: number
    reps: number
    targetWeight: number | null
    targetReps: number | null
  },
  exerciseName: string,
  consecutiveUnderperformance: number,
  roundToLoadable?: (w: number) => number
): SetTargetResult {
  const round = (w: number) => roundToLoadable ? roundToLoadable(w) : Math.round(w * 2) / 2
  const isLower = isLowerBodyExercise(exerciseName)
  const increment = isLower ? 10 : 5

  if (dayType === 'volume') {
    let targetWeight: number
    if (consecutiveUnderperformance >= 3) {
      targetWeight = previousSet.weight * 0.9
    } else if (previousSet.targetWeight != null) {
      const metTarget = previousSet.reps >= 5 && previousSet.weight >= (previousSet.targetWeight * 0.98)
      targetWeight = metTarget ? previousSet.weight + increment : previousSet.weight
    } else {
      targetWeight = previousSet.weight + increment
    }
    return {
      targetWeight: round(targetWeight),
      targetReps: 5,
      targetRpe: 8,
    }
  }
  if (dayType === 'recovery') {
    // Anchor to the previously stored target to keep recovery weight stable.
    // On first use (no stored target), use 80% of actual weight as a starting point.
    const base = previousSet.targetWeight ?? (previousSet.weight * 0.8)
    return {
      targetWeight: round(base > 0 ? base : previousSet.weight),
      targetReps: 5,
      targetRpe: 7,
    }
  }
  if (dayType === 'intensity') {
    let targetWeight: number
    if (consecutiveUnderperformance >= 2) {
      targetWeight = previousSet.weight * 0.95
    } else if (previousSet.targetWeight != null) {
      const metTarget = previousSet.reps >= 5 && previousSet.weight >= (previousSet.targetWeight * 0.98)
      targetWeight = metTarget ? previousSet.weight + increment : previousSet.weight
    } else {
      targetWeight = previousSet.weight + increment
    }
    return {
      targetWeight: round(targetWeight),
      targetReps: 5,
      targetRpe: 9,
    }
  }
  return { targetWeight: null, targetReps: null, targetRpe: null }
}
