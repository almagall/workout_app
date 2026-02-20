import type { PlanType, ExerciseLog, PerformanceStatus } from '@/types/workout'
import { estimated1RM } from '@/lib/estimated-1rm'

export interface TargetCalculation {
  targetWeight: number | null
  targetReps: number | null
  targetRpe: number | null
  /** True when target was held/reduced because logged RPE was above target band. */
  highRpeLastTime?: boolean
}

interface PreviousExerciseData {
  sets: Array<{
    weight: number
    reps: number
    rpe: number
    targetWeight: number | null
    targetReps: number | null
    targetRpe: number | null
  }>
}

export interface PlanSettings {
  rep_range_min: number
  rep_range_max: number
  target_rpe_min: number
  target_rpe_max: number
  weight_increase_percent: number
  rep_increase: number
  deload_frequency_weeks?: number
}

const DEFAULT_PLAN_SETTINGS: Record<PlanType, PlanSettings> = {
  hypertrophy: {
    rep_range_min: 10,
    rep_range_max: 15,
    target_rpe_min: 6,
    target_rpe_max: 8,
    weight_increase_percent: 1.75,
    rep_increase: 1,
    deload_frequency_weeks: 5,
  },
  strength: {
    rep_range_min: 3,
    rep_range_max: 6,
    target_rpe_min: 7,
    target_rpe_max: 9,
    weight_increase_percent: 2.75,
    rep_increase: 0,
    deload_frequency_weeks: 7,
  },
}

/** Default progressive overload settings per plan type. Used when no user settings exist (e.g. plan type is chosen per template). */
export function getDefaultPlanSettings(planType: PlanType): PlanSettings {
  return DEFAULT_PLAN_SETTINGS[planType]
}

/**
 * Calculate target for a single set based on the previous set's performance.
 *
 * Hypertrophy (custom templates): uses e1RM as single currency so weight and reps
 * always come from the same source and targets stay in [rep_range_min, rep_range_max]
 * without a separate clamping layer. Double progression is preserved: build reps
 * to rep_range_max, then bump e1RM and reset to rep_range_min.
 *
 * Strength: weight-focused progression unchanged.
 *
 * @param daysSinceLastSession Days since the last time this workout day was done.
 *   0-1: maintain; 14+: "welcome back" maintain; 2-13: normal progression.
 */
export function calculateSetTarget(
  previousSet: {
    weight: number
    reps: number
    rpe: number
    targetWeight: number | null
    targetReps: number | null
    targetRpe: number | null
  },
  planType: PlanType,
  planSettings: PlanSettings,
  consecutiveUnderperformance: number = 0,
  roundToLoadable?: (w: number) => number,
  daysSinceLastSession?: number | null
): TargetCalculation {
  // Evaluate performance against previous targets (if any)
  let setStatus: PerformanceStatus = 'met_target'
  if (previousSet.targetWeight && previousSet.targetReps && previousSet.targetRpe) {
    setStatus = evaluateSetPerformance(
      previousSet.weight,
      previousSet.reps,
      previousSet.rpe,
      previousSet.targetWeight,
      previousSet.targetReps,
      previousSet.targetRpe
    )
  }

  let targetWeight: number
  let targetReps: number
  let targetRpe: number
  let highRpeModulated = false

  if (planType === 'hypertrophy') {
    // --- Hypertrophy: e1RM-based double progression ---
    // All weight targets are derived from e1RM so they are always calibrated to
    // the user's current strength at the chosen rep count, and naturally stay
    // within [rep_range_min, rep_range_max] without a second patching layer.
    const currentE1RM = estimated1RM(previousSet.weight, previousSet.reps)

    // 1. Decide target e1RM based on performance
    let targetE1RM: number
    if (setStatus === 'overperformed') {
      targetE1RM = currentE1RM * (1 + planSettings.weight_increase_percent / 100)
    } else if (setStatus === 'underperformed') {
      if (consecutiveUnderperformance === 0) {
        targetE1RM = currentE1RM            // first miss: maintain strength level
      } else if (consecutiveUnderperformance === 1) {
        targetE1RM = currentE1RM * 0.975    // second consecutive: slight reduction
      } else {
        targetE1RM = currentE1RM * 0.95     // third+: larger reduction
      }
    } else {
      // met_target: smaller bump (sustainable progression)
      targetE1RM = currentE1RM * (1 + planSettings.weight_increase_percent / 200)
    }

    // 2. Decide target reps (double progression; previous reps clamped to valid range)
    const clampedPrevReps = Math.max(
      planSettings.rep_range_min,
      Math.min(previousSet.reps, planSettings.rep_range_max)
    )
    if (setStatus === 'overperformed') {
      // At rep max → reset to rep min (weight bump already in e1RM); otherwise add a rep
      targetReps =
        clampedPrevReps >= planSettings.rep_range_max
          ? planSettings.rep_range_min
          : Math.min(clampedPrevReps + planSettings.rep_increase, planSettings.rep_range_max)
    } else {
      targetReps = clampedPrevReps
    }

    // 3. Derive weight from target e1RM at target reps (inverse Epley)
    targetWeight = targetE1RM / (1 + targetReps / 30)
    targetRpe = planSettings.target_rpe_max

    // RPE-aware modulation: if effort was above target band, hold at current strength
    if (previousSet.rpe > planSettings.target_rpe_max && setStatus !== 'underperformed') {
      highRpeModulated = true
      targetReps = clampedPrevReps
      targetWeight = currentE1RM / (1 + targetReps / 30)
      targetRpe = planSettings.target_rpe_max
    }

    // Recency: same/next day or long gap → maintain to avoid overreaching
    if (
      daysSinceLastSession != null &&
      (daysSinceLastSession <= 1 || daysSinceLastSession >= 14)
    ) {
      targetReps = clampedPrevReps
      targetWeight = currentE1RM / (1 + targetReps / 30)
      targetRpe = planSettings.target_rpe_max
    }
  } else {
    // --- Strength: double-progression model ---
    // Phase 1: build reps within [rep_range_min, rep_range_max] at the same weight.
    // Phase 2: once rep_range_max is hit, bump weight and reset reps to rep_range_min.
    const clampedPrevReps = Math.max(
      planSettings.rep_range_min,
      Math.min(previousSet.reps, planSettings.rep_range_max)
    )
    const atRepMax = clampedPrevReps >= planSettings.rep_range_max

    if (setStatus === 'overperformed') {
      if (atRepMax) {
        // Hit the ceiling — bump weight, reset reps
        targetWeight = previousSet.weight * (1 + planSettings.weight_increase_percent / 100)
        targetReps = planSettings.rep_range_min
      } else {
        // Still building reps — add a rep, hold weight
        targetWeight = previousSet.weight
        targetReps = clampedPrevReps + 1
      }
      targetRpe = planSettings.target_rpe_max
    } else if (setStatus === 'underperformed') {
      if (consecutiveUnderperformance === 0) {
        targetWeight = previousSet.weight
        targetReps = clampedPrevReps
        targetRpe = planSettings.target_rpe_max
      } else {
        targetWeight = previousSet.weight * 0.95
        targetReps = Math.max(clampedPrevReps - 1, planSettings.rep_range_min)
        targetRpe = planSettings.target_rpe_max
      }
    } else {
      // met_target
      if (atRepMax) {
        // Sustained at rep max — small weight bump, reset reps
        targetWeight = previousSet.weight * (1 + planSettings.weight_increase_percent / 200)
        targetReps = planSettings.rep_range_min
      } else {
        // Still building reps — add a rep, hold weight
        targetWeight = previousSet.weight
        targetReps = clampedPrevReps + 1
      }
      targetRpe = planSettings.target_rpe_max
    }

    targetReps = Math.max(
      planSettings.rep_range_min,
      Math.min(targetReps, planSettings.rep_range_max)
    )

    // RPE-aware modulation for strength
    if (previousSet.rpe > planSettings.target_rpe_max && setStatus !== 'underperformed') {
      highRpeModulated = true
      targetWeight = previousSet.weight
      targetReps = clampedPrevReps
      targetRpe = planSettings.target_rpe_max
    }

    // Recency for strength
    if (
      daysSinceLastSession != null &&
      (daysSinceLastSession <= 1 || daysSinceLastSession >= 14)
    ) {
      targetWeight = previousSet.weight
      targetReps = clampedPrevReps
      targetRpe = planSettings.target_rpe_max
    }
  }

  // Round weight: use loadable if provided, else nearest 2.5 lbs
  targetWeight = roundToLoadable ? roundToLoadable(targetWeight) : Math.round(targetWeight / 2.5) * 2.5

  return {
    targetWeight,
    targetReps: Math.round(targetReps),
    targetRpe,
    highRpeLastTime: highRpeModulated || undefined,
  }
}

/**
 * Determine performance status for a set
 * Enhanced with better RPE consideration for fatigue detection
 */
export function evaluateSetPerformance(
  actualWeight: number,
  actualReps: number,
  actualRpe: number,
  targetWeight: number | null,
  targetReps: number | null,
  targetRpe: number | null
): PerformanceStatus {
  if (!targetWeight || !targetReps || !targetRpe) {
    return 'met_target' // No target means first week
  }

  const weightMet = actualWeight >= targetWeight * 0.95 // 5% tolerance
  const repsMet = actualReps >= targetReps
  const rpeMet = actualRpe <= targetRpe + 1 // 1 RPE tolerance

  // Enhanced RPE consideration: if RPE is significantly higher despite meeting weight/reps,
  // it may indicate fatigue or overreaching
  const rpeTooHigh = actualRpe > targetRpe + 2 // More than 2 RPE above target

  if (weightMet && repsMet && rpeMet) {
    // Check for overperformance
    if (
      actualWeight > targetWeight * 1.05 ||
      actualReps > targetReps + 1 ||
      actualRpe < targetRpe - 1
    ) {
      return 'overperformed'
    }
    // If RPE is too high despite meeting targets, consider it underperformance (fatigue)
    if (rpeTooHigh) {
      return 'underperformed'
    }
    return 'met_target'
  }

  // If RPE is way too high, definitely underperformed (fatigue indicator)
  if (rpeTooHigh) {
    return 'underperformed'
  }

  // e1RM scaling: when the lifter went heavier than target but did fewer reps,
  // compare estimated 1RMs to determine true performance
  if (actualWeight > targetWeight && !repsMet) {
    const actualE1RM = estimated1RM(actualWeight, actualReps)
    const targetE1RM = estimated1RM(targetWeight, targetReps)

    if (actualE1RM >= targetE1RM * 1.05) {
      return 'overperformed'
    }
    if (actualE1RM >= targetE1RM * 0.95) {
      return 'met_target'
    }
  }

  return 'underperformed'
}

/**
 * Calculate overall exercise performance
 */
export function calculateExercisePerformance(
  sets: Array<{
    weight: number
    reps: number
    rpe: number
    targetWeight: number | null
    targetReps: number | null
    targetRpe: number | null
  }>
): {
  status: PerformanceStatus
  overperformedCount: number
  metTargetCount: number
  underperformedCount: number
} {
  let overperformedCount = 0
  let metTargetCount = 0
  let underperformedCount = 0

  sets.forEach((set) => {
    const status = evaluateSetPerformance(
      set.weight,
      set.reps,
      set.rpe,
      set.targetWeight,
      set.targetReps,
      set.targetRpe
    )

    if (status === 'overperformed') overperformedCount++
    else if (status === 'met_target') metTargetCount++
    else underperformedCount++
  })

  let overallStatus: PerformanceStatus = 'met_target'
  if (overperformedCount > underperformedCount) {
    overallStatus = 'overperformed'
  } else if (underperformedCount > metTargetCount) {
    overallStatus = 'underperformed'
  }

  return {
    status: overallStatus,
    overperformedCount,
    metTargetCount,
    underperformedCount,
  }
}

/**
 * Calculate targets for the next workout based on previous performance
 * @deprecated This function uses average-based progression which is less precise.
 * Use calculateSetTarget for set-by-set progression instead.
 */
export function calculateTargets(
  previousExerciseData: PreviousExerciseData | null,
  planType: PlanType,
  planSettings: PlanSettings,
  consecutiveUnderperformance: number = 0
): TargetCalculation {
  // First week - no targets
  if (!previousExerciseData || previousExerciseData.sets.length === 0) {
    return {
      targetWeight: null,
      targetReps: null,
      targetRpe: null,
    }
  }

  const { sets } = previousExerciseData
  const numSets = sets.length

  // Calculate average performance across all sets
  const avgWeight = sets.reduce((sum, set) => sum + set.weight, 0) / numSets
  const avgReps = sets.reduce((sum, set) => sum + set.reps, 0) / numSets
  const avgRpe = sets.reduce((sum, set) => sum + set.rpe, 0) / numSets

  // Determine performance status
  let performanceStatus: PerformanceStatus = 'met_target'
  let overperformedCount = 0
  let underperformedCount = 0
  let metTargetCount = 0

  sets.forEach((set) => {
    if (set.targetWeight && set.targetReps && set.targetRpe) {
      const weightMet = set.weight >= set.targetWeight * 0.95 // Allow 5% tolerance
      const repsMet = set.reps >= set.targetReps
      const rpeMet = set.rpe <= set.targetRpe + 1 // Allow 1 RPE tolerance

      if (weightMet && repsMet && rpeMet) {
        if (set.weight > set.targetWeight * 1.05 || set.reps > set.targetReps + 1) {
          overperformedCount++
        } else {
          metTargetCount++
        }
      } else {
        underperformedCount++
      }
    }
  })

  // Determine overall performance
  if (overperformedCount > underperformedCount) {
    performanceStatus = 'overperformed'
  } else if (underperformedCount > metTargetCount) {
    performanceStatus = 'underperformed'
  }

  // Calculate new targets based on plan type and performance
  let targetWeight: number
  let targetReps: number
  let targetRpe: number

  if (planType === 'hypertrophy') {
    // Hypertrophy: Double progression - prioritize rep progression
    const isAtRepMax = avgReps >= planSettings.rep_range_max

    if (performanceStatus === 'overperformed') {
      if (isAtRepMax) {
        // Double progression: increase weight, reset to rep min
        targetWeight = avgWeight * (1 + planSettings.weight_increase_percent / 100)
        targetReps = planSettings.rep_range_min
      } else {
        // Increase reps first (volume priority)
        targetWeight = avgWeight // Maintain weight
        targetReps = Math.min(
          avgReps + planSettings.rep_increase,
          planSettings.rep_range_max
        )
      }
      targetRpe = planSettings.target_rpe_max
    } else if (performanceStatus === 'underperformed') {
      if (consecutiveUnderperformance === 0) {
        // First underperformance: maintain targets
        targetWeight = avgWeight
        targetReps = avgReps
        targetRpe = planSettings.target_rpe_max
      } else if (consecutiveUnderperformance === 1) {
        // Second consecutive: slight reduction
        targetWeight = avgWeight * 0.975
        targetReps = Math.max(avgReps - 1, planSettings.rep_range_min)
        targetRpe = planSettings.target_rpe_max
      } else {
        // 3+ consecutive: maintain or slight reduction
        targetWeight = avgWeight * 0.95
        targetReps = Math.max(avgReps - 1, planSettings.rep_range_min)
        targetRpe = planSettings.target_rpe_max
      }
    } else {
      // Met target: slight progression
      if (isAtRepMax) {
        targetWeight = avgWeight * (1 + planSettings.weight_increase_percent / 200)
        targetReps = planSettings.rep_range_min
      } else {
        targetWeight = avgWeight // Maintain weight
        targetReps = Math.min(avgReps + 1, planSettings.rep_range_max)
      }
      targetRpe = planSettings.target_rpe_max
    }

    // Ensure targets are within rep range
    targetReps = Math.max(
      planSettings.rep_range_min,
      Math.min(targetReps, planSettings.rep_range_max)
    )
  } else {
    // Strength: Focus on weight progression
    if (performanceStatus === 'overperformed') {
      targetWeight = avgWeight * (1 + planSettings.weight_increase_percent / 100)
      targetReps = Math.min(avgReps, planSettings.rep_range_max)
      targetRpe = planSettings.target_rpe_max
    } else if (performanceStatus === 'underperformed') {
      if (consecutiveUnderperformance === 0) {
        targetWeight = avgWeight
        targetReps = avgReps
        targetRpe = planSettings.target_rpe_max
      } else if (consecutiveUnderperformance === 1) {
        targetWeight = avgWeight * 0.95
        targetReps = Math.max(avgReps - 1, planSettings.rep_range_min)
        targetRpe = planSettings.target_rpe_max
      } else {
        targetWeight = avgWeight * 0.95
        targetReps = Math.max(avgReps - 1, planSettings.rep_range_min)
        targetRpe = planSettings.target_rpe_max
      }
    } else {
      targetWeight = avgWeight * (1 + planSettings.weight_increase_percent / 200)
      targetReps = Math.min(avgReps, planSettings.rep_range_max)
      targetRpe = planSettings.target_rpe_max
    }

    // Ensure targets are within rep range
    targetReps = Math.max(
      planSettings.rep_range_min,
      Math.min(targetReps, planSettings.rep_range_max)
    )
  }

  // Round weight to nearest 2.5 lbs (or 1.25 kg)
  targetWeight = Math.round(targetWeight / 2.5) * 2.5

  return {
    targetWeight,
    targetReps: Math.round(targetReps),
    targetRpe,
  }
}
