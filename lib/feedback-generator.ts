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
      return `Excellent work! You exceeded your targets on ${overperformedCount} set(s). This shows great progress. Next week, we will increase your targets to continue progressive overload. Keep maintaining good form and control.`
    } else {
      return `Outstanding performance! You lifted more than targeted on ${overperformedCount} set(s). Your strength is improving. We'll adjust your targets upward next week to keep challenging you.`
    }
  }

  if (status === 'underperformed') {
    if (planType === 'hypertrophy') {
      if (underperformedCount === sets.length) {
        return `You didn't meet your targets this week. This could be due to fatigue, poor recovery, or targets being too aggressive. We'll maintain or slightly reduce targets next week. Focus on proper form, adequate rest, and nutrition.`
      } else {
        return `You struggled on ${underperformedCount} set(s). This might indicate fatigue or the need for better recovery. Ensure you're getting enough sleep, proper nutrition, and adequate rest between workouts.`
      }
    } else {
      if (underperformedCount === sets.length) {
        return `You didn't hit your strength targets. This is normal and can happen due to various factors like recovery, stress, or sleep. We'll adjust targets accordingly. Make sure you're warming up properly and maintaining technique.`
      } else {
        return `Some sets were challenging. For strength training, quality over quantity is key. Focus on perfect form and controlled movements. Recovery is crucial for strength gains.`
      }
    }
  }

  // Met target
  if (planType === 'hypertrophy') {
    return `Great job hitting your targets! You are on track with your hypertrophy goals. We will make a small increase next week to continue your progress. Keep focusing on the mind-muscle connection and controlled movements.`
  } else {
    return `Solid performance! You met your strength targets. We'll make a conservative increase next week. Remember to prioritize form and control over ego lifting.`
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
