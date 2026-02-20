import { createClient } from './supabase/client'
import { getCurrentUser } from './auth-simple'
import { estimated1RM } from './estimated-1rm'
import type { ProgressionTrend } from '@/types/profile'

/**
 * Calculate 3-week moving average
 */
function getMovingAverage(data: number[], windowSize: number): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1)
    const window = data.slice(start, i + 1)
    const avg = window.reduce((sum, val) => sum + val, 0) / window.length
    result.push(avg)
  }
  return result
}

/**
 * Calculate progression velocity for a specific exercise
 */
export async function calculateProgressionVelocity(
  exerciseName: string,
  templateDayId: string
): Promise<ProgressionTrend | null> {
  const user = getCurrentUser()
  if (!user) return null

  const supabase = createClient()

  // Get last 6 weeks of workout data for this exercise
  const sixWeeksAgo = new Date()
  sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42)
  const startDate = sixWeeksAgo.toISOString().split('T')[0]

  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('id, workout_date')
    .eq('user_id', user.id)
    .eq('template_day_id', templateDayId)
    .eq('is_complete', true)
    .gte('workout_date', startDate)
    .order('workout_date', { ascending: true })

  if (error || !sessions || sessions.length < 3) {
    return null // Need at least 3 workouts
  }

  // Get exercise logs for these sessions
  const sessionIds = sessions.map(s => s.id)
  const { data: logs, error: logsError } = await supabase
    .from('exercise_logs')
    .select('session_id, weight, reps, set_type')
    .eq('exercise_name', exerciseName)
    .in('session_id', sessionIds)
    .eq('set_type', 'working')
    .is('duration_seconds', null)

  if (logsError || !logs || logs.length === 0) {
    return null
  }

  // Calculate max estimated 1RM per session
  const sessionMaxes: number[] = []
  sessions.forEach(session => {
    const sessionLogs = logs.filter(log => log.session_id === session.id)
    if (sessionLogs.length > 0) {
      const maxE1RM = Math.max(
        ...sessionLogs.map(log => estimated1RM(log.weight, log.reps))
      )
      sessionMaxes.push(maxE1RM)
    }
  })

  if (sessionMaxes.length < 3) {
    return null
  }

  // Calculate 3-week moving averages
  const movingAvg = getMovingAverage(sessionMaxes, 3)

  // Compare recent 3-week avg to previous 3-week avg (need at least 4 for valid comparison)
  if (movingAvg.length < 4) return null

  const recentAvg = movingAvg[movingAvg.length - 1]
  const previousAvg = movingAvg[movingAvg.length - 4]

  const percentChange = ((recentAvg - previousAvg) / previousAvg) * 100

  // Classify trend
  let trend: ProgressionTrend['trend']
  let icon: string
  let color: string
  let message: string

  if (percentChange > 8) {
    trend = 'accelerating'
    icon = '▲▲'
    color = '#22c55e'
    message = 'Accelerating progress! Keep it up.'
  } else if (percentChange >= 2) {
    trend = 'progressing'
    icon = '▲'
    color = '#10b981'
    message = 'Steady progress.'
  } else if (percentChange >= -2) {
    trend = 'maintaining'
    icon = '—'
    color = '#888888'
    message = 'Maintaining strength.'
  } else if (percentChange >= -5) {
    trend = 'plateaued'
    icon = '▼'
    color = '#eab308'
    message = 'Plateaued. Consider adding volume or changing rep scheme.'
  } else {
    trend = 'regressing'
    icon = '▼▼'
    color = '#ef4444'
    message = 'Regressing. Check recovery and nutrition.'
  }

  return {
    exerciseName,
    trend,
    percentChange,
    icon,
    color,
    message,
  }
}

/**
 * Get all exercises with progression trends
 */
export async function getAllProgressionTrends(): Promise<ProgressionTrend[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()

  // Get all template days and exercises
  const { data: templates } = await supabase
    .from('workout_templates')
    .select('id')
    .eq('user_id', user.id)

  if (!templates || templates.length === 0) return []

  const templateIds = templates.map(t => t.id)

  const { data: days } = await supabase
    .from('template_days')
    .select('id')
    .in('template_id', templateIds)

  if (!days || days.length === 0) return []

  const dayIds = days.map(d => d.id)

  const { data: exercises } = await supabase
    .from('template_exercises')
    .select('exercise_name, template_day_id')
    .in('template_day_id', dayIds)

  if (!exercises || exercises.length === 0) return []

  // Calculate trends for each exercise
  const trends: ProgressionTrend[] = []
  for (const exercise of exercises) {
    const trend = await calculateProgressionVelocity(
      exercise.exercise_name,
      exercise.template_day_id
    )
    if (trend) {
      trends.push(trend)
    }
  }

  // Sort by trend quality (accelerating first, regressing last)
  const trendOrder = { accelerating: 1, progressing: 2, maintaining: 3, plateaued: 4, regressing: 5 }
  trends.sort((a, b) => trendOrder[a.trend] - trendOrder[b.trend])

  return trends
}
