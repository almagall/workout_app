import type { PlanType, PerformanceStatus } from '@/types/workout'

interface ExercisePerformance {
  exerciseName: string
  status: PerformanceStatus
  overperformedCount: number
  metTargetCount: number
  underperformedCount: number
  sets: Array<{
    weight: number
    reps: number
    rpe: number
    targetWeight: number | null
    targetReps: number | null
  }>
}

interface WorkoutPerformance {
  exercises: ExercisePerformance[]
  overallRating: number
}

/**
 * Generate feedback for a single exercise
 */
export function generateExerciseFeedback(
  performance: ExercisePerformance,
  planType: PlanType
): string {
  const { status, overperformedCount, metTargetCount, underperformedCount, sets } = performance

  if (status === 'overperformed') {
    if (planType === 'hypertrophy') {
      if (overperformedCount === sets.length) {
        return `You exceeded targets on all ${overperformedCount} set(s), indicating excellent muscle adaptation and strong recovery. This shows your muscles are growing and adapting to the training stimulus. Targets will increase next week to maintain progressive overload.`
      } else {
        return `You exceeded targets on ${overperformedCount} set(s), showing good progress. This indicates your muscles are adapting well. Targets will be adjusted upward next week.`
      }
    } else {
      if (overperformedCount === sets.length) {
        return `You exceeded targets on all ${overperformedCount} set(s), demonstrating significant strength gains. Your nervous system and muscles are adapting effectively. Targets will increase next week.`
      } else {
        return `You exceeded targets on ${overperformedCount} set(s), indicating strength progression. This shows good adaptation to the training load. Targets will be adjusted upward next week.`
      }
    }
  }

  if (status === 'underperformed') {
    if (planType === 'hypertrophy') {
      if (underperformedCount === sets.length) {
        return `You fell short on all ${underperformedCount} set(s), likely due to fatigue, insufficient recovery, or aggressive targets. This suggests systemic fatigue rather than a single bad set. Targets will be maintained or slightly reduced next week to allow proper recovery.`
      } else {
        return `You struggled on ${underperformedCount} set(s), suggesting partial fatigue or starting too aggressively. This may indicate the need for better recovery between workouts. Targets will be adjusted accordingly.`
      }
    } else {
      if (underperformedCount === sets.length) {
        return `You missed targets on all ${underperformedCount} set(s), possibly due to insufficient recovery, stress, or accumulated fatigue. Strength training requires adequate rest between sessions. Targets will be adjusted to ensure continued progress.`
      } else {
        return `You fell short on ${underperformedCount} set(s), suggesting fatigue buildup or starting too heavy. Focus on proper warm-up and technique. Targets will be adjusted to match your current capacity.`
      }
    }
  }

  // Met target
  if (planType === 'hypertrophy') {
    return `You met your targets on ${metTargetCount} set(s), indicating consistent progress and good recovery. This shows you're on track with your hypertrophy goals. Targets will increase slightly next week (2.5-5lbs or 1-2 reps) to continue progressive overload.`
  } else {
    return `You met your targets on ${metTargetCount} set(s), showing solid strength progression and good recovery. This indicates effective neuromuscular adaptation. Targets will increase conservatively next week (2.5-5lbs) to maintain progressive overload.`
  }
}

/**
 * Generate overall workout feedback
 */
export function generateWorkoutFeedback(workout: WorkoutPerformance, planType: PlanType): string {
  const { exercises, overallRating } = workout

  const overperformedExercises = exercises.filter((e) => e.status === 'overperformed').length
  const metTargetExercises = exercises.filter((e) => e.status === 'met_target').length
  const underperformedExercises = exercises.filter((e) => e.status === 'underperformed').length

  let feedback = ''

  if (overallRating >= 8) {
    feedback = `Outstanding workout! You performed exceptionally well across ${overperformedExercises} exercise(s). `
    if (planType === 'hypertrophy') {
      feedback += 'Your volume and intensity were on point. Keep this momentum going!'
    } else {
      feedback += 'Your strength is progressing well. Continue focusing on progressive overload.'
    }
  } else if (overallRating >= 6) {
    feedback = `Good workout overall. You met or exceeded targets on ${metTargetExercises + overperformedExercises} exercise(s). `
    if (underperformedExercises > 0) {
      feedback += `You struggled with ${underperformedExercises} exercise(s) - this is normal. Focus on recovery and we will adjust targets accordingly.`
    } else {
      feedback += 'You are making steady progress. Keep it up!'
    }
  } else {
    feedback = `This was a challenging workout. You underperformed on ${underperformedExercises} exercise(s). `
    if (planType === 'hypertrophy') {
      feedback +=
        'Consider factors like sleep, nutrition, stress, and recovery. We will adjust your targets to ensure continued progress. Remember, consistency is key.'
    } else {
      feedback +=
        'Strength training requires adequate recovery. Ensure you are getting enough sleep, proper nutrition, and managing stress. We will adjust targets to keep you progressing safely.'
    }
  }

  // Add plan-specific tips
  if (planType === 'hypertrophy') {
    feedback +=
      ' For hypertrophy, focus on controlled tempo, full range of motion, and the mind-muscle connection.'
  } else {
    feedback +=
      ' For strength training, prioritize perfect form, adequate warm-up, and sufficient rest between sets.'
  }

  return feedback
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

  // Round to 1 decimal place
  return Math.round(averageScore * 10) / 10
}
