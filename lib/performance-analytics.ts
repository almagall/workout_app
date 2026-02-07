import { createClient } from './supabase/client'
import { getCurrentUser } from './auth-simple'
import { getISOWeekOfYear, getISOWeekYear, getWeekMondayKey } from './date-utils'
import type { ConsistencyMetrics, WeeklyHitRateData } from '@/types/profile'

/**
 * Get weekly target hit rates for rolling past N weeks with actual ISO week numbers
 */
export async function getWeeklyHitRates(weeks: number = 13): Promise<WeeklyHitRateData[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()

  // Rolling N weeks: from (N-1) weeks ago through this week
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (weeks - 1) * 7)
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = today.toISOString().split('T')[0]

  // Get all sessions in date range
  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('id, workout_date')
    .eq('user_id', user.id)
    .eq('is_complete', true)
    .gte('workout_date', startDateStr)
    .lte('workout_date', endDateStr)
    .order('workout_date', { ascending: true })

  if (error || !sessions) {
    return []
  }

  // Get all exercise logs for these sessions
  const sessionIds = sessions.map(s => s.id)
  if (sessionIds.length === 0) {
    return buildWeeklyDataWithWeekNumbers(weeks, today, {})
  }

  const { data: logs, error: logsError } = await supabase
    .from('exercise_logs')
    .select('session_id, performance_status, set_type')
    .in('session_id', sessionIds)
    .eq('set_type', 'working')

  if (logsError || !logs) {
    return buildWeeklyDataWithWeekNumbers(weeks, today, {})
  }

  // Group sessions by week (Monday date as key)
  const weekBuckets: { [weekKey: string]: { met: number; total: number } } = {}

  sessions.forEach(session => {
    const sessionDate = new Date(session.workout_date + 'T12:00:00')
    const weekKey = getWeekMondayKey(sessionDate)

    if (!weekBuckets[weekKey]) {
      weekBuckets[weekKey] = { met: 0, total: 0 }
    }

    const sessionLogs = logs.filter(log => log.session_id === session.id)
    sessionLogs.forEach(log => {
      if (log.performance_status) {
        weekBuckets[weekKey].total++
        if (log.performance_status === 'met_target' || log.performance_status === 'overperformed') {
          weekBuckets[weekKey].met++
        }
      }
    })
  })

  return buildWeeklyDataWithWeekNumbers(weeks, today, weekBuckets)
}

function buildWeeklyDataWithWeekNumbers(
  weeks: number,
  endDate: Date,
  weekBuckets: { [weekKey: string]: { met: number; total: number } }
): WeeklyHitRateData[] {
  const result: WeeklyHitRateData[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(endDate)
    d.setDate(d.getDate() - i * 7)
    const weekNum = getISOWeekOfYear(d)
    const weekYear = getISOWeekYear(d)
    const weekKey = getWeekMondayKey(d)

    let hitRate: number | null = null
    if (weekBuckets[weekKey] && weekBuckets[weekKey].total > 0) {
      hitRate = (weekBuckets[weekKey].met / weekBuckets[weekKey].total) * 100
    }

    result.push({ weekNumber: weekNum, weekYear, hitRate })
  }
  return result
}

/**
 * Calculate consistency score from hit rate variance
 */
export async function calculateConsistency(weeks: number = 13): Promise<ConsistencyMetrics> {
  const weeklyData = await getWeeklyHitRates(weeks)

  if (weeklyData.length === 0) {
    return {
      score: 0,
      weeklyData: [],
      variance: 0,
      trend: 'stable',
      insights: ['Not enough data yet. Keep logging workouts!'],
    }
  }

  // Filter to weeks with data for score/variance
  const validRates = weeklyData
    .map(d => d.hitRate)
    .filter((r): r is number => r !== null && r > 0)

  if (validRates.length < 2) {
    return {
      score: 0,
      weeklyData,
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
    weeklyData,
    variance,
    trend,
    insights: [],
  })

  return {
    score: Math.round(score),
    weeklyData,
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
  const hitRates = metrics.weeklyData.map(d => d.hitRate).filter((r): r is number => r !== null)
  if (hitRates.length >= 4) {
    const recent4 = hitRates.slice(-4)
    const earlier4 = hitRates.slice(-8, -4)

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
