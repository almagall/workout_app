import { createClient } from './supabase/client'
import { getCurrentUser } from './auth-simple'
import type { ConsistencyMetrics } from '@/types/profile'

/**
 * Get weekly target hit rates for past N weeks
 */
export async function getWeeklyHitRates(weeks: number = 12): Promise<number[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()

  // Calculate start date (N weeks ago)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - (weeks * 7))
  const startDateStr = startDate.toISOString().split('T')[0]

  // Get all sessions in date range
  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('id, workout_date')
    .eq('user_id', user.id)
    .eq('is_complete', true)
    .gte('workout_date', startDateStr)
    .order('workout_date', { ascending: true })

  if (error || !sessions || sessions.length === 0) {
    return []
  }

  // Get all exercise logs for these sessions
  const sessionIds = sessions.map(s => s.id)
  const { data: logs, error: logsError } = await supabase
    .from('exercise_logs')
    .select('session_id, performance_status, set_type')
    .in('session_id', sessionIds)
    .eq('set_type', 'working')

  if (logsError || !logs) {
    return []
  }

  // Group sessions by week
  const weeklyHitRates: number[] = []
  const weekBuckets: { [key: number]: { met: number; total: number } } = {}

  sessions.forEach(session => {
    const sessionDate = new Date(session.workout_date)
    const weeksSinceStart = Math.floor(
      (sessionDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    )

    if (!weekBuckets[weeksSinceStart]) {
      weekBuckets[weeksSinceStart] = { met: 0, total: 0 }
    }

    const sessionLogs = logs.filter(log => log.session_id === session.id)
    sessionLogs.forEach(log => {
      if (log.performance_status) {
        weekBuckets[weeksSinceStart].total++
        if (log.performance_status === 'met_target' || log.performance_status === 'overperformed') {
          weekBuckets[weeksSinceStart].met++
        }
      }
    })
  })

  // Calculate hit rate for each week
  for (let i = 0; i < weeks; i++) {
    if (weekBuckets[i] && weekBuckets[i].total > 0) {
      const hitRate = (weekBuckets[i].met / weekBuckets[i].total) * 100
      weeklyHitRates.push(hitRate)
    } else {
      weeklyHitRates.push(0)
    }
  }

  return weeklyHitRates
}

/**
 * Calculate consistency score from hit rate variance
 */
export async function calculateConsistency(weeks: number = 12): Promise<ConsistencyMetrics> {
  const weeklyHitRates = await getWeeklyHitRates(weeks)

  if (weeklyHitRates.length === 0) {
    return {
      score: 0,
      weeklyHitRates: [],
      variance: 0,
      trend: 'stable',
      insights: ['Not enough data yet. Keep logging workouts!'],
    }
  }

  // Filter out weeks with no data (0%)
  const validRates = weeklyHitRates.filter(rate => rate > 0)

  if (validRates.length < 2) {
    return {
      score: 0,
      weeklyHitRates,
      variance: 0,
      trend: 'stable',
      insights: ['Not enough consistent data for analysis.'],
    }
  }

  // Calculate mean
  const mean = validRates.reduce((sum, rate) => sum + rate, 0) / validRates.length

  // Calculate variance
  const variance = validRates.reduce((sum, rate) => {
    return sum + Math.pow(rate - mean, 2)
  }, 0) / validRates.length

  const stdDev = Math.sqrt(variance)

  // Calculate coefficient of variation
  const cv = mean > 0 ? stdDev / mean : 1

  // Consistency score: lower CV = higher consistency
  const score = Math.max(0, Math.min(100, 100 - (cv * 100)))

  // Determine trend (comparing first half to second half)
  const midpoint = Math.floor(validRates.length / 2)
  const firstHalf = validRates.slice(0, midpoint)
  const secondHalf = validRates.slice(midpoint)

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

  let trend: ConsistencyMetrics['trend']
  if (secondAvg > firstAvg + 5) {
    trend = 'improving'
  } else if (secondAvg < firstAvg - 5) {
    trend = 'declining'
  } else {
    trend = 'stable'
  }

  // Generate insights
  const insights = generateConsistencyInsights({
    score,
    weeklyHitRates,
    variance,
    trend,
    insights: [],
  })

  return {
    score: Math.round(score),
    weeklyHitRates,
    variance,
    trend,
    insights,
  }
}

/**
 * Generate insights based on consistency metrics
 */
export function generateConsistencyInsights(metrics: ConsistencyMetrics): string[] {
  const insights: string[] = []

  // Score-based insights
  if (metrics.score >= 85) {
    insights.push('Excellent consistency! Your performance is very predictable.')
  } else if (metrics.score >= 70) {
    insights.push('Good consistency. Some variation in performance is normal.')
  } else if (metrics.score >= 50) {
    insights.push('Moderate consistency. Check sleep and nutrition patterns.')
  } else {
    insights.push('High variation in performance. Focus on recovery consistency.')
  }

  // Trend insights
  if (metrics.trend === 'improving') {
    insights.push('Performance consistency is improving over time.')
  } else if (metrics.trend === 'declining') {
    insights.push('Consistency is declining. Review your training and recovery.')
  }

  // Look for recent dips
  if (metrics.weeklyHitRates.length >= 4) {
    const recent4 = metrics.weeklyHitRates.slice(-4)
    const earlier4 = metrics.weeklyHitRates.slice(-8, -4)

    if (earlier4.length > 0) {
      const recentAvg = recent4.reduce((a, b) => a + b, 0) / recent4.length
      const earlierAvg = earlier4.reduce((a, b) => a + b, 0) / earlier4.length

      if (recentAvg < earlierAvg - 10) {
        insights.push('Recent dip detected. Consider a deload week.')
      } else if (recentAvg > earlierAvg + 10) {
        insights.push('Recent improvement! Keep up the good work.')
      }
    }
  }

  return insights
}
