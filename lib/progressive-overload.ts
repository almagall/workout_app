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
    rep_range_min: 8,
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
 * For custom hypertrophy: when raw target is outside [minReps, maxReps], recalculate
 * weight via inverse Epley so the target stays in range (e.g. 225×7 → lower weight×10).
 * Used only in custom-template path; presets use their own logic.
 */
export function clampHypertrophyTargetToRepRange(
  targetWeight: number,
  targetReps: number,
  minReps: number,
  maxReps: number,
  roundToLoadable?: (w: number) => number
): { targetWeight: number; targetReps: number } {
  let w = targetWeight
  let r = targetReps
  if (r < minReps && r >= 1) {
    const e1rm = estimated1RM(w, r)
    w = e1rm / (1 + minReps / 30)
    r = minReps
  } else if (r > maxReps) {
    const e1rm = estimated1RM(w, r)
    w = e1rm / (1 + maxReps / 30)
    r = maxReps
  }
  if (roundToLoadable) w = roundToLoadable(w)
  return { targetWeight: w, targetReps: r }
}

/**
 * Calculate target for a single set based on the previous set's performance
 * Uses double progression: increase reps to max, then increase weight and reset reps
 */
/**
 * @param daysSinceLastSession Days since the last time this workout day was done. When 0-1: maintain (no progression); when 14+: "welcome back" maintain; 2-13: normal progression.
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
  // If previous workout had targets, evaluate performance against them
  let setStatus: PerformanceStatus = 'met_target'
  
  if (previousSet.targetWeight && previousSet.targetReps && previousSet.targetRpe) {
    // Previous workout had targets - evaluate performance
    setStatus = evaluateSetPerformance(
      previousSet.weight,
      previousSet.reps,
      previousSet.rpe,
      previousSet.targetWeight,
      previousSet.targetReps,
      previousSet.targetRpe
    )
  } else {
    // Previous workout was first week (no targets) - treat as "met target" and calculate progressive overload
    setStatus = 'met_target'
  }

  let targetWeight: number
  let targetReps: number
  let targetRpe: number
  let highRpeModulated = false

  if (planType === 'hypertrophy') {
    // Hypertrophy: Double progression - prioritize rep progression, then weight
    const isAtRepMax = previousSet.reps >= planSettings.rep_range_max
    const isAtRepMin = previousSet.reps <= planSettings.rep_range_min

    if (setStatus === 'overperformed') {
      if (isAtRepMax) {
        // Double progression: increase weight, reset to rep min
        targetWeight = previousSet.weight * (1 + planSettings.weight_increase_percent / 100)
        targetReps = planSettings.rep_range_min
        targetRpe = planSettings.target_rpe_max
      } else {
        // Increase reps first (volume progression priority)
        targetWeight = previousSet.weight // Maintain weight
        targetReps = Math.min(
          previousSet.reps + planSettings.rep_increase,
          planSettings.rep_range_max
        )
        targetRpe = planSettings.target_rpe_max
      }
    } else if (setStatus === 'underperformed') {
      if (consecutiveUnderperformance === 0) {
        // First underperformance: maintain targets
        targetWeight = previousSet.weight
        targetReps = previousSet.reps
        targetRpe = planSettings.target_rpe_max
      } else if (consecutiveUnderperformance === 1) {
        // Second consecutive: slight reduction
        targetWeight = previousSet.weight * 0.975
        targetReps = Math.max(previousSet.reps - 1, planSettings.rep_range_min)
        targetRpe = planSettings.target_rpe_max
      } else {
        // 3+ consecutive: maintain or slight reduction
        targetWeight = previousSet.weight * 0.95
        targetReps = Math.max(previousSet.reps - 1, planSettings.rep_range_min)
        targetRpe = planSettings.target_rpe_max
      }
    } else {
      // Met target: maintain reps (only overperformed = +1 rep for sustainable progression)
      if (isAtRepMax) {
        // At rep max: increase weight, reset reps
        targetWeight = previousSet.weight * (1 + planSettings.weight_increase_percent / 200) // Half the increase
        targetReps = planSettings.rep_range_min
        targetRpe = planSettings.target_rpe_max
      } else {
        targetWeight = previousSet.weight
        targetReps = previousSet.reps
        targetRpe = planSettings.target_rpe_max
      }
    }

    // Ensure targets are within rep range
    targetReps = Math.max(
      planSettings.rep_range_min,
      Math.min(targetReps, planSettings.rep_range_max)
    )
  } else {
    // Strength: Focus on weight progression, maintain rep range
    const isAtStrengthRepMax = previousSet.reps >= planSettings.rep_range_max
    const weightPct = isAtStrengthRepMax ? planSettings.weight_increase_percent / 2 : planSettings.weight_increase_percent
    if (setStatus === 'overperformed') {
      // Increase weight, maintain or slightly adjust reps within range
      targetWeight = previousSet.weight * (1 + weightPct / 100)
      targetReps = Math.min(previousSet.reps, planSettings.rep_range_max)
      // If at rep max, try to maintain; if below, can increase slightly
      if (previousSet.reps < planSettings.rep_range_max) {
        targetReps = Math.min(previousSet.reps + 1, planSettings.rep_range_max)
      }
      targetRpe = planSettings.target_rpe_max
    } else if (setStatus === 'underperformed') {
      if (consecutiveUnderperformance === 0) {
        // First underperformance: maintain targets
        targetWeight = previousSet.weight
        targetReps = previousSet.reps
        targetRpe = planSettings.target_rpe_max
      } else if (consecutiveUnderperformance === 1) {
        // Second consecutive: slight reduction
        targetWeight = previousSet.weight * 0.95
        targetReps = Math.max(previousSet.reps - 1, planSettings.rep_range_min)
        targetRpe = planSettings.target_rpe_max
      } else {
        // 3+ consecutive: maintain or slight reduction
        targetWeight = previousSet.weight * 0.95
        targetReps = Math.max(previousSet.reps - 1, planSettings.rep_range_min)
        targetRpe = planSettings.target_rpe_max
      }
    } else {
      // Met target: slight weight increase (smaller when at top of rep range)
      targetWeight = previousSet.weight * (1 + weightPct / 200)
      targetReps = Math.min(previousSet.reps, planSettings.rep_range_max)
      targetRpe = planSettings.target_rpe_max
    }

    // Ensure targets are within rep range
    targetReps = Math.max(
      planSettings.rep_range_min,
      Math.min(targetReps, planSettings.rep_range_max)
    )
  }

  // RPE-aware modulation: if effort was above target band, hold or reduce next target
  if (previousSet.rpe > planSettings.target_rpe_max && setStatus !== 'underperformed') {
    highRpeModulated = true
    targetWeight = previousSet.weight
    targetReps = previousSet.reps
    targetRpe = planSettings.target_rpe_max
  }

  // Recency: same/next day or long gap ("welcome back") → maintain to avoid overreaching
  if (daysSinceLastSession != null) {
    if (daysSinceLastSession <= 1) {
      targetWeight = previousSet.weight
      targetReps = previousSet.reps
      targetRpe = planSettings.target_rpe_max
    } else if (daysSinceLastSession >= 14) {
      targetWeight = previousSet.weight
      targetReps = previousSet.reps
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
