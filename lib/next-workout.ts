import { getCurrentUser } from './auth-simple'
import { createClient } from './supabase/client'
import { getTemplates, getTemplateDays } from './storage'
import { estimated1RM } from './estimated-1rm'

export interface NextWorkoutInfo {
  templateDayId: string
  dayLabel: string
  daysSinceLastTrained: number | null
  lastDate: string | null
  keyLifts: { name: string; weight: number; reps: number; e1rm: number }[]
}

export async function getNextWorkout(): Promise<NextWorkoutInfo | null> {
  const user = getCurrentUser()
  if (!user) return null

  const templates = await getTemplates()
  if (templates.length === 0) return null

  const template = templates[0]
  const days = await getTemplateDays(template.id)
  if (days.length === 0) return null

  const supabase = createClient()

  // Get most recent completed session per template day
  const dayIds = days.map(d => d.id)
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('id, template_day_id, workout_date')
    .eq('user_id', user.id)
    .in('template_day_id', dayIds)
    .eq('is_complete', true)
    .order('workout_date', { ascending: false })

  const lastSessionByDay = new Map<string, { id: string; date: string }>()
  for (const s of sessions ?? []) {
    if (!lastSessionByDay.has(s.template_day_id)) {
      lastSessionByDay.set(s.template_day_id, { id: s.id, date: s.workout_date })
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find the most recently logged session to determine where in the rotation we are
  const mostRecentSession = (sessions ?? [])[0] // already sorted desc by workout_date
  let bestDay = days[0]
  let bestDaysSince: number | null = null
  let bestDate: string | null = null

  if (mostRecentSession) {
    const lastDayIndex = days.findIndex(d => d.id === mostRecentSession.template_day_id)
    // Next day in the rotation (wraps around)
    const nextIndex = lastDayIndex >= 0 ? (lastDayIndex + 1) % days.length : 0
    bestDay = days[nextIndex]

    const lastInfo = lastSessionByDay.get(bestDay.id)
    if (lastInfo) {
      const [y, m, d] = lastInfo.date.split('-').map(Number)
      const lastDate = new Date(y, m - 1, d)
      bestDaysSince = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      bestDate = lastInfo.date
    }
  }

  // Get key lifts for this day from the most recent session
  const lastSession = lastSessionByDay.get(bestDay.id)
  const keyLifts: NextWorkoutInfo['keyLifts'] = []

  if (lastSession) {
    const { data: logs } = await supabase
      .from('exercise_logs')
      .select('exercise_name, weight, reps, set_type')
      .eq('session_id', lastSession.id)
      .eq('set_type', 'working')

    // Get best set per exercise (highest e1RM)
    const bestByExercise = new Map<string, { weight: number; reps: number; e1rm: number }>()
    for (const log of logs ?? []) {
      const w = typeof log.weight === 'number' ? log.weight : parseFloat(String(log.weight))
      const e1rm = estimated1RM(w, log.reps)
      const existing = bestByExercise.get(log.exercise_name)
      if (!existing || e1rm > existing.e1rm) {
        bestByExercise.set(log.exercise_name, { weight: w, reps: log.reps, e1rm })
      }
    }

    // Take top 3 by e1RM
    const sorted = Array.from(bestByExercise.entries())
      .sort((a, b) => b[1].e1rm - a[1].e1rm)
      .slice(0, 3)

    for (const [name, data] of sorted) {
      keyLifts.push({ name, ...data })
    }
  } else {
    // No previous session -- get template exercises
    const { data: templateExercises } = await supabase
      .from('template_exercises')
      .select('exercise_name')
      .eq('template_day_id', bestDay.id)
      .order('exercise_order', { ascending: true })
      .limit(3)

    for (const ex of templateExercises ?? []) {
      keyLifts.push({ name: ex.exercise_name, weight: 0, reps: 0, e1rm: 0 })
    }
  }

  return {
    templateDayId: bestDay.id,
    dayLabel: bestDay.day_label,
    daysSinceLastTrained: bestDaysSince,
    lastDate: bestDate,
    keyLifts,
  }
}
