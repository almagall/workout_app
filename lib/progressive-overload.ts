import type { PlanType, ExerciseLog, PerformanceStatus } from '@/types/workout'

interface TargetCalculation {
  targetWeight: number | null
  targetReps: number | null
  targetRpe: number | null
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

interface PlanSettings {
  rep_range_min: number
  rep_range_max: number
  target_rpe_min: number
  target_rpe_max: number
  weight_increase_percent: number
  rep_increase: number
}

/**
 * Calculate targets for the next workout based on previous performance
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
    // Hypertrophy: Focus on volume (weight × reps) progression
    if (performanceStatus === 'overperformed') {
      // Gradual increase: 2.5-5% weight or +1-2 reps
      targetWeight = avgWeight * (1 + planSettings.weight_increase_percent / 100)
      targetReps = Math.min(
        avgReps + planSettings.rep_increase,
        planSettings.rep_range_max
      )
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
        // 2+ consecutive: deload
        targetWeight = avgWeight * 0.9
        targetReps = Math.max(avgReps - 2, planSettings.rep_range_min)
        targetRpe = planSettings.target_rpe_min
      }
    } else {
      // Met target: slight increase
      targetWeight = avgWeight * (1 + planSettings.weight_increase_percent / 200)
      targetReps = Math.min(avgReps + 1, planSettings.rep_range_max)
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
      // More aggressive weight increase for strength
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
        targetWeight = avgWeight * 0.85
        targetReps = Math.max(avgReps - 1, planSettings.rep_range_min)
        targetRpe = planSettings.target_rpe_min
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

/**
 * Calculate target for a single set based on the previous set's performance
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
  planSettings: PlanSettings
): TargetCalculation {
  // If no previous target, return null (first week)
  if (!previousSet.targetWeight || !previousSet.targetReps || !previousSet.targetRpe) {
    return {
      targetWeight: null,
      targetReps: null,
      targetRpe: null,
    }
  }

  // Evaluate this set's performance against its target
  const setStatus = evaluateSetPerformance(
    previousSet.weight,
    previousSet.reps,
    previousSet.rpe,
    previousSet.targetWeight,
    previousSet.targetReps,
    previousSet.targetRpe
  )

  let targetWeight: number
  let targetReps: number
  let targetRpe: number

  if (planType === 'hypertrophy') {
    // Hypertrophy: Focus on volume progression
    if (setStatus === 'overperformed') {
      // Gradual increase: 2.5-5% weight or +1-2 reps
      targetWeight = previousSet.weight * (1 + planSettings.weight_increase_percent / 100)
      targetReps = Math.min(
        previousSet.reps + planSettings.rep_increase,
        planSettings.rep_range_max
      )
      targetRpe = planSettings.target_rpe_max
    } else if (setStatus === 'underperformed') {
      // Maintain or slight reduction
      targetWeight = previousSet.weight * 0.975
      targetReps = Math.max(previousSet.reps - 1, planSettings.rep_range_min)
      targetRpe = planSettings.target_rpe_max
    } else {
      // Met target: slight increase
      targetWeight = previousSet.weight * (1 + planSettings.weight_increase_percent / 200)
      targetReps = Math.min(previousSet.reps + 1, planSettings.rep_range_max)
      targetRpe = planSettings.target_rpe_max
    }

    // Ensure targets are within rep range
    targetReps = Math.max(
      planSettings.rep_range_min,
      Math.min(targetReps, planSettings.rep_range_max)
    )
  } else {
    // Strength: Focus on weight progression
    if (setStatus === 'overperformed') {
      // More aggressive weight increase for strength
      targetWeight = previousSet.weight * (1 + planSettings.weight_increase_percent / 100)
      targetReps = Math.min(previousSet.reps, planSettings.rep_range_max)
      targetRpe = planSettings.target_rpe_max
    } else if (setStatus === 'underperformed') {
      // Slight reduction
      targetWeight = previousSet.weight * 0.95
      targetReps = Math.max(previousSet.reps - 1, planSettings.rep_range_min)
      targetRpe = planSettings.target_rpe_max
    } else {
      // Met target: slight increase
      targetWeight = previousSet.weight * (1 + planSettings.weight_increase_percent / 200)
      targetReps = Math.min(previousSet.reps, planSettings.rep_range_max)
      targetRpe = planSettings.target_rpe_max
    }

    // Ensure targets are within rep range
    targetReps = Math.max(
      planSettings.rep_range_min,
      Math.min(targetReps, planSettings.rep_range_max)
    )
  }

  // Round weight to nearest 2.5 lbs
  targetWeight = Math.round(targetWeight / 2.5) * 2.5

  return {
    targetWeight,
    targetReps: Math.round(targetReps),
    targetRpe,
  }
}

/**
 * Determine performance status for a set
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

  const weightMet = actualWeight >= targetWeight * 0.95
  const repsMet = actualReps >= targetReps
  const rpeMet = actualRpe <= targetRpe + 1

  if (weightMet && repsMet && rpeMet) {
    if (
      actualWeight > targetWeight * 1.05 ||
      actualReps > targetReps + 1 ||
      actualRpe < targetRpe - 1
    ) {
      return 'overperformed'
    }
    return 'met_target'
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
