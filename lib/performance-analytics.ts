import { createClient } from './supabase/client'
import { getCurrentUser } from './auth-simple'
import { getISOWeekOfYear, getISOWeekYear, getWeekMondayKey } from './date-utils'
import { estimated1RM } from './estimated-1rm'
import type { ConsistencyMetrics, WeeklyHitRateData } from '@/types/profile'

export interface E1RMTrendData {
  trend: 'up' | 'down' | 'stable'
  changeLbs: number | null
  recentE1rm: number | null
  message: string
}

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
    .is('duration_seconds', null)

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

export interface WeeklyRpeData {
  weekNumber: number
  weekYear: number
  avgRpe: number
}

/**
 * Get average RPE of working sets per week for the last N weeks.
 * Used for RPE trend in deload logic.
 */
export async function getWeeklyRpeAverages(weeks: number = 6): Promise<WeeklyRpeData[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (weeks - 1) * 7)
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = today.toISOString().split('T')[0]

  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('id, workout_date')
    .eq('user_id', user.id)
    .eq('is_complete', true)
    .gte('workout_date', startDateStr)
    .lte('workout_date', endDateStr)
    .order('workout_date', { ascending: true })

  if (error || !sessions || sessions.length === 0) return []

  const sessionIds = sessions.map((s) => s.id)
  const { data: logs, error: logsError } = await supabase
    .from('exercise_logs')
    .select('session_id, rpe, set_type')
    .in('session_id', sessionIds)
    .eq('set_type', 'working')
    .is('duration_seconds', null)

  if (logsError || !logs || logs.length === 0) return []

  const weekBuckets: { [weekKey: string]: { sum: number; count: number } } = {}
  sessions.forEach((session) => {
    const sessionDate = new Date(session.workout_date + 'T12:00:00')
    const weekKey = getWeekMondayKey(sessionDate)
    const sessionLogs = logs.filter((l) => l.session_id === session.id)
    sessionLogs.forEach((log) => {
      if (!weekBuckets[weekKey]) weekBuckets[weekKey] = { sum: 0, count: 0 }
      const rpe = parseFloat(String(log.rpe ?? 0))
      if (rpe >= 1 && rpe <= 10) {
        weekBuckets[weekKey].sum += rpe
        weekBuckets[weekKey].count += 1
      }
    })
  })

  const result: WeeklyRpeData[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i * 7)
    const weekNum = getISOWeekOfYear(d)
    const weekYear = getISOWeekYear(d)
    const weekKey = getWeekMondayKey(d)
    const bucket = weekBuckets[weekKey]
    if (bucket && bucket.count > 0) {
      result.push({
        weekNumber: weekNum,
        weekYear,
        avgRpe: Math.round((bucket.sum / bucket.count) * 10) / 10,
      })
    }
  }
  return result
}

export interface WeeklyVolumeData {
  weekNumber: number
  weekYear: number
  volume: number // sum of weight * reps for working sets
}

/**
 * Get total volume (weight × reps) per week for working sets. Used for volume-aware deload.
 */
export async function getWeeklyVolume(weeks: number = 6): Promise<WeeklyVolumeData[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Anchor to Monday of the current week so each weekly bucket is fully captured
  const currentWeekMonday = new Date(today)
  const dow = (today.getDay() + 6) % 7 // 0 = Monday
  currentWeekMonday.setDate(today.getDate() - dow)
  const startDate = new Date(currentWeekMonday)
  startDate.setDate(currentWeekMonday.getDate() - (weeks - 1) * 7)
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = today.toISOString().split('T')[0]

  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('id, workout_date')
    .eq('user_id', user.id)
    .eq('is_complete', true)
    .gte('workout_date', startDateStr)
    .lte('workout_date', endDateStr)
    .order('workout_date', { ascending: true })

  if (error || !sessions || sessions.length === 0) return []

  const sessionIds = sessions.map((s) => s.id)
  const { data: logs, error: logsError } = await supabase
    .from('exercise_logs')
    .select('session_id, weight, reps, set_type')
    .in('session_id', sessionIds)
    .eq('set_type', 'working')
    .is('duration_seconds', null)

  if (logsError || !logs || logs.length === 0) return []

  const weekBuckets: { [weekKey: string]: number } = {}
  sessions.forEach((session) => {
    const sessionDate = new Date(session.workout_date + 'T12:00:00')
    const weekKey = getWeekMondayKey(sessionDate)
    const sessionLogs = logs.filter((l) => l.session_id === session.id)
    let vol = 0
    sessionLogs.forEach((log) => {
      const w = parseFloat(String(log.weight ?? 0))
      const r = Number(log.reps ?? 0)
      vol += w * r
    })
    if (!weekBuckets[weekKey]) weekBuckets[weekKey] = 0
    weekBuckets[weekKey] += vol
  })

  const result: WeeklyVolumeData[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i * 7)
    const weekNum = getISOWeekOfYear(d)
    const weekYear = getISOWeekYear(d)
    const weekKey = getWeekMondayKey(d)
    const volume = weekBuckets[weekKey] ?? 0
    if (volume > 0) {
      result.push({ weekNumber: weekNum, weekYear, volume })
    }
  }
  return result
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

/**
 * Get e1RM trend for one exercise over recent sessions. Used for feedback ("Bench e1RM up ~5 lb").
 */
export async function getE1RMTrendForExercise(
  exerciseName: string,
  sessionsBack: number = 10
): Promise<E1RMTrendData> {
  const user = getCurrentUser()
  if (!user) {
    return { trend: 'stable', changeLbs: null, recentE1rm: null, message: '' }
  }

  const supabase = createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - sessionsBack * 14) // ~2 weeks per "session" window
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = today.toISOString().split('T')[0]

  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('id, workout_date')
    .eq('user_id', user.id)
    .eq('is_complete', true)
    .gte('workout_date', startDateStr)
    .lte('workout_date', endDateStr)
    .order('workout_date', { ascending: true })

  if (error || !sessions || sessions.length === 0) {
    return { trend: 'stable', changeLbs: null, recentE1rm: null, message: '' }
  }

  const sessionIds = sessions.map((s) => s.id)
  const { data: logs, error: logsError } = await supabase
    .from('exercise_logs')
    .select('session_id, weight, reps')
    .in('session_id', sessionIds)
    .eq('exercise_name', exerciseName)
    .eq('set_type', 'working')
    .is('duration_seconds', null)

  if (logsError || !logs || logs.length === 0) {
    return { trend: 'stable', changeLbs: null, recentE1rm: null, message: '' }
  }

  // Max e1RM per session
  const bySession = new Map<string, number>()
  logs.forEach((log) => {
    const w = parseFloat(String(log.weight ?? 0))
    const r = Number(log.reps ?? 1)
    if (w <= 0) return
    const e1rm = estimated1RM(w, r)
    const sid = log.session_id
    const prev = bySession.get(sid) ?? 0
    if (e1rm > prev) bySession.set(sid, e1rm)
  })

  const e1rmByDate = sessions
    .map((s) => ({ date: s.workout_date, e1rm: bySession.get(s.id) ?? 0 }))
    .filter((x) => x.e1rm > 0)
  if (e1rmByDate.length < 2) {
    const last = e1rmByDate[e1rmByDate.length - 1]
    return {
      trend: 'stable',
      changeLbs: null,
      recentE1rm: last?.e1rm ?? null,
      message: '',
    }
  }

  const recentCount = Math.min(3, Math.floor(e1rmByDate.length / 2))
  const recent = e1rmByDate.slice(-recentCount)
  const earlier = e1rmByDate.slice(-recentCount * 2, -recentCount)
  if (earlier.length === 0) {
    return {
      trend: 'stable',
      changeLbs: null,
      recentE1rm: recent[recent.length - 1]?.e1rm ?? null,
      message: '',
    }
  }
  const recentAvg = recent.reduce((s, x) => s + x.e1rm, 0) / recent.length
  const earlierAvg = earlier.reduce((s, x) => s + x.e1rm, 0) / earlier.length
  const changeLbs = Math.round((recentAvg - earlierAvg) * 10) / 10
  let trend: E1RMTrendData['trend'] = 'stable'
  if (changeLbs >= 5) trend = 'up'
  else if (changeLbs <= -5) trend = 'down'

  let message = ''
  const shortName = exerciseName.length > 20 ? exerciseName.slice(0, 17) + '…' : exerciseName
  if (trend === 'up' && changeLbs != null) {
    message = `${shortName} e1RM is up ~${Math.round(changeLbs)} lb recently.`
  } else if (trend === 'down' && changeLbs != null) {
    message = `${shortName} e1RM has dropped over recent sessions—recovery may help.`
  }

  return {
    trend,
    changeLbs: trend !== 'stable' ? changeLbs : null,
    recentE1rm: recentAvg,
    message,
  }
}

/**
 * Get e1RM trend for multiple exercises (e.g. current workout). Returns a Map for feedback context.
 */
export async function getE1RMTrendForExercises(
  exerciseNames: string[]
): Promise<Map<string, E1RMTrendData>> {
  const unique = [...new Set(exerciseNames)]
  const entries = await Promise.all(
    unique.map(async (name) => {
      const data = await getE1RMTrendForExercise(name, 10)
      return [name, data] as const
    })
  )
  return new Map(entries)
}

/**
 * Consecutive sessions (before today) where this exercise was met_target or overperformed. Used for "You've hit this exercise N sessions in a row."
 */
export async function getHitStreakForExercise(exerciseName: string): Promise<number> {
  const user = getCurrentUser()
  if (!user) return 0

  const supabase = createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() - 1) // exclude today
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 365)
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('id, workout_date')
    .eq('user_id', user.id)
    .eq('is_complete', true)
    .gte('workout_date', startDateStr)
    .lte('workout_date', endDateStr)
    .order('workout_date', { ascending: false })

  if (error || !sessions || sessions.length === 0) return 0

  const sessionIds = sessions.map((s) => s.id)
  const { data: logs, error: logsError } = await supabase
    .from('exercise_logs')
    .select('session_id, performance_status')
    .in('session_id', sessionIds)
    .eq('exercise_name', exerciseName)
    .eq('set_type', 'working')
    .is('duration_seconds', null)

  if (logsError || !logs || logs.length === 0) return 0

  const bySession = new Map<string, string[]>()
  logs.forEach((log) => {
    const sid = log.session_id
    const status = log.performance_status as string | null
    if (!status) return
    if (!bySession.has(sid)) bySession.set(sid, [])
    bySession.get(sid)!.push(status)
  })

  let streak = 0
  for (const session of sessions) {
    const statuses = bySession.get(session.id) ?? []
    if (statuses.length === 0) continue
    const allHit = statuses.every(
      (s) => s === 'met_target' || s === 'overperformed'
    )
    if (allHit) streak++
    else break
  }
  return streak
}

/**
 * Hit streak (consecutive sessions meeting target) per exercise. Used in feedback.
 */
export async function getHitStreakForExercises(
  exerciseNames: string[]
): Promise<Map<string, number>> {
  const unique = [...new Set(exerciseNames)]
  const entries = await Promise.all(
    unique.map(async (name) => {
      const streak = await getHitStreakForExercise(name)
      return [name, streak] as const
    })
  )
  return new Map(entries)
}
