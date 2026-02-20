/**
 * Personal record (PR) detection for workout sets.
 * Compares a set against previous sessions and current workout to determine if it's a PR.
 */

import { getWorkoutSessions, getExerciseLogs } from './storage'
import { estimated1RM } from './estimated-1rm'
import type { WorkoutSession, ExerciseLog } from '@/types/workout'

export interface PRStatus {
  isHeaviestSetPR: boolean
  isE1RMPR: boolean
}

interface CurrentSet {
  weight: number
  reps: number
}

/**
 * Check if a set is a personal record (heaviest set and/or estimated 1RM) for this exercise in this template day.
 * Compares against all previous sessions for this day and current workout sets.
 * @param excludeSessionId - When editing, exclude this session from "previous" data
 * @param cachedSessions - Optional pre-fetched sessions to avoid redundant queries
 * @param cachedLogs - Optional pre-fetched logs to avoid redundant queries
 */
export async function checkSetPR(
  dayId: string,
  exerciseName: string,
  weight: number,
  reps: number,
  currentSets: CurrentSet[] = [],
  excludeSessionId?: string,
  cachedSessions?: WorkoutSession[],
  cachedLogs?: ExerciseLog[]
): Promise<PRStatus> {
  if (weight <= 0 || reps <= 0) {
    return { isHeaviestSetPR: false, isE1RMPR: false }
  }

  const [sessions, allLogs] = cachedSessions && cachedLogs
    ? [cachedSessions, cachedLogs]
    : await Promise.all([
        getWorkoutSessions(),
        getExerciseLogs(),
      ])

  const daySessions = sessions.filter(
    (s) => s.template_day_id === dayId && s.id !== excludeSessionId
  )
  const daySessionIds = new Set(daySessions.map((s) => s.id))

  const dayLogs = allLogs.filter(
    (log) =>
      daySessionIds.has(log.session_id) &&
      log.exercise_name === exerciseName &&
      (log.set_type === 'working' || log.set_type == null) &&
      (log.duration_seconds == null) // resistance only; cardio has duration_seconds set
  )

  let maxWeight = 0
  let maxE1RM = 0

  for (const log of dayLogs) {
    const w = parseFloat(log.weight.toString())
    const r = log.reps
    if (w > 0 && r > 0) {
      maxWeight = Math.max(maxWeight, w)
      maxE1RM = Math.max(maxE1RM, estimated1RM(w, r))
    }
  }

  for (const set of currentSets) {
    if (set.weight > 0 && set.reps > 0) {
      maxWeight = Math.max(maxWeight, set.weight)
      maxE1RM = Math.max(maxE1RM, estimated1RM(set.weight, set.reps))
    }
  }

  const e1RM = estimated1RM(weight, reps)
  return {
    isHeaviestSetPR: weight > maxWeight,
    isE1RMPR: e1RM > maxE1RM,
  }
}

export interface SessionPR {
  exerciseName: string
  prType: 'heaviestSet' | 'e1RM'
  value: number
  weight: number
  reps: number
}

/**
 * Get all PRs from a session's exercise data (before saving).
 * Used for workout complete summary.
 * @param excludeSessionId - When editing, exclude this session from "previous" data
 * @param cachedSessions - Optional pre-fetched sessions to avoid redundant queries
 * @param cachedLogs - Optional pre-fetched logs to avoid redundant queries
 */
export async function getPRsForSession(
  dayId: string,
  exercises: Array<{
    exerciseName: string
    sets: Array<{ setType: string; weight: number; reps: number }>
  }>,
  excludeSessionId?: string,
  cachedSessions?: WorkoutSession[],
  cachedLogs?: ExerciseLog[]
): Promise<SessionPR[]> {
  const prs: SessionPR[] = []
  const seenExercisePR = new Map<string, Set<'heaviestSet' | 'e1RM'>>()

  for (const exercise of exercises) {
    const workingSets = exercise.sets.filter((s) => s.setType === 'working')
    if (workingSets.length === 0) continue

    for (const set of workingSets) {
      if (set.weight <= 0 || set.reps <= 0) continue

      const otherSets = workingSets
        .filter((s) => s !== set)
        .map((s) => ({ weight: s.weight, reps: s.reps }))
      const status = await checkSetPR(
        dayId,
        exercise.exerciseName,
        set.weight,
        set.reps,
        otherSets,
        excludeSessionId,
        cachedSessions,
        cachedLogs
      )

      const key = exercise.exerciseName
      if (!seenExercisePR.has(key)) seenExercisePR.set(key, new Set())
      const seen = seenExercisePR.get(key)!

      if (status.isHeaviestSetPR && !seen.has('heaviestSet')) {
        seen.add('heaviestSet')
        prs.push({
          exerciseName: exercise.exerciseName,
          prType: 'heaviestSet',
          value: set.weight,
          weight: set.weight,
          reps: set.reps,
        })
      }
      if (status.isE1RMPR && !seen.has('e1RM')) {
        seen.add('e1RM')
        const e1rm = estimated1RM(set.weight, set.reps)
        prs.push({
          exerciseName: exercise.exerciseName,
          prType: 'e1RM',
          value: Math.round(e1rm * 10) / 10,
          weight: set.weight,
          reps: set.reps,
        })
      }
    }
  }

  return prs
}

export interface RecentPR {
  exerciseName: string
  templateDayId: string
  dayLabel?: string
  prType: 'heaviestSet' | 'e1RM'
  value: number
  workoutDate: string
}

export interface WorkoutDayPRs {
  workoutDate: string
  templateDayId: string
  dayLabel: string
  prs: RecentPR[]
}

/**
 * Get recent PRs across all exercises and template days for dashboard display.
 */
export async function getRecentPRs(limit: number = 5): Promise<RecentPR[]> {
  const [sessions, allLogs] = await Promise.all([
    getWorkoutSessions(),
    getExerciseLogs(),
  ])

  const sessionsByDay = new Map<string, typeof sessions>()
  for (const s of sessions) {
    if (!sessionsByDay.has(s.template_day_id)) {
      sessionsByDay.set(s.template_day_id, [])
    }
    sessionsByDay.get(s.template_day_id)!.push(s)
  }

  const prs: RecentPR[] = []
  const maxByExerciseDay = new Map<string, { heaviestSet: number; e1RM: number }>()

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime()
  )

  for (const session of sortedSessions) {
    const logs = allLogs.filter(
      (l) =>
        l.session_id === session.id &&
        (l.set_type === 'working' || l.set_type == null) &&
        l.duration_seconds == null
    )

    for (const log of logs) {
      const w = parseFloat(log.weight.toString())
      const r = log.reps
      if (w <= 0 || r <= 0) continue

      const key = `${session.template_day_id}:${log.exercise_name}`
      const prev = maxByExerciseDay.get(key) ?? { heaviestSet: 0, e1RM: 0 }
      const e1rm = estimated1RM(w, r)

      if (w > prev.heaviestSet) {
        prev.heaviestSet = w
        maxByExerciseDay.set(key, prev)
        prs.push({
          exerciseName: log.exercise_name,
          templateDayId: session.template_day_id,
          prType: 'heaviestSet',
          value: w,
          workoutDate: session.workout_date,
        })
      }
      if (e1rm > prev.e1RM) {
        prev.e1RM = e1rm
        maxByExerciseDay.set(key, prev)
        prs.push({
          exerciseName: log.exercise_name,
          templateDayId: session.template_day_id,
          prType: 'e1RM',
          value: Math.round(e1rm * 10) / 10,
          workoutDate: session.workout_date,
        })
      }
    }
  }

  return prs.slice(-limit).reverse()
}

/**
 * Get recent PRs grouped by workout day for dashboard display.
 * Returns the last N workout days that have PRs, with all PRs from each day.
 */
export async function getRecentPRsByDay(numDays: number = 5): Promise<WorkoutDayPRs[]> {
  const [sessions, allLogs] = await Promise.all([
    getWorkoutSessions(),
    getExerciseLogs(),
  ])

  const prs: RecentPR[] = []
  const maxByExerciseDay = new Map<string, { heaviestSet: number; e1RM: number }>()

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime()
  )

  // Process sessions chronologically to detect PRs (resistance only; exclude cardio)
  for (const session of sortedSessions) {
    const logs = allLogs.filter(
      (l) =>
        l.session_id === session.id &&
        (l.set_type === 'working' || l.set_type == null) &&
        l.duration_seconds == null
    )

    for (const log of logs) {
      const w = parseFloat(log.weight.toString())
      const r = log.reps
      if (w <= 0 || r <= 0) continue

      const key = `${session.template_day_id}:${log.exercise_name}`
      const prev = maxByExerciseDay.get(key) ?? { heaviestSet: 0, e1RM: 0 }
      const e1rm = estimated1RM(w, r)

      if (w > prev.heaviestSet) {
        prev.heaviestSet = w
        maxByExerciseDay.set(key, prev)
        prs.push({
          exerciseName: log.exercise_name,
          templateDayId: session.template_day_id,
          prType: 'heaviestSet',
          value: w,
          workoutDate: session.workout_date,
        })
      }
      if (e1rm > prev.e1RM) {
        prev.e1RM = e1rm
        maxByExerciseDay.set(key, prev)
        prs.push({
          exerciseName: log.exercise_name,
          templateDayId: session.template_day_id,
          prType: 'e1RM',
          value: Math.round(e1rm * 10) / 10,
          workoutDate: session.workout_date,
        })
      }
    }
  }

  // Group PRs by workoutDate + templateDayId
  const grouped = new Map<string, RecentPR[]>()
  for (const pr of prs) {
    const key = `${pr.workoutDate}|${pr.templateDayId}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(pr)
  }

  // Sort groups by date (descending) and take last N days
  const sortedGroups = [...grouped.entries()]
    .sort((a, b) => {
      const dateA = a[1][0].workoutDate
      const dateB = b[1][0].workoutDate
      return dateB.localeCompare(dateA) // descending
    })
    .slice(0, numDays)

  // Fetch day labels
  const { getTemplateDay } = await import('./storage')
  const uniqueDayIds = [...new Set(sortedGroups.map(([_, prs]) => prs[0].templateDayId))]
  const dayLabelMap = new Map<string, string>()
  
  await Promise.all(
    uniqueDayIds.map(async (dayId) => {
      const day = await getTemplateDay(dayId)
      if (day) dayLabelMap.set(dayId, day.day_label)
    })
  )

  // Build final result
  const result: WorkoutDayPRs[] = sortedGroups.map(([_, prs]) => ({
    workoutDate: prs[0].workoutDate,
    templateDayId: prs[0].templateDayId,
    dayLabel: dayLabelMap.get(prs[0].templateDayId) ?? 'Workout',
    prs,
  }))

  return result
}

/** Minimal session/log shape for computing PRs from raw data (e.g. for a friend). */
export interface SessionForPR {
  id: string
  template_day_id: string
  workout_date: string
}

export interface LogForPR {
  session_id: string
  exercise_name: string
  weight: number
  reps: number
  set_type?: string | null
}

/**
 * Compute recent PRs from session and log arrays (used server-side for friend PRs).
 */
export function computeRecentPRsFromData(
  sessions: SessionForPR[],
  logs: LogForPR[],
  limit: number = 5
): RecentPR[] {
  const prs: RecentPR[] = []
  const maxByExerciseDay = new Map<string, { heaviestSet: number; e1RM: number }>()

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime()
  )

  for (const session of sortedSessions) {
    const sessionLogs = logs.filter(
      (l) => l.session_id === session.id && (l.set_type === 'working' || l.set_type == null)
    )

    for (const log of sessionLogs) {
      const w = parseFloat(log.weight.toString())
      const r = log.reps
      if (w <= 0 || r <= 0) continue

      const key = `${session.template_day_id}:${log.exercise_name}`
      const prev = maxByExerciseDay.get(key) ?? { heaviestSet: 0, e1RM: 0 }
      const e1rm = estimated1RM(w, r)

      if (w > prev.heaviestSet) {
        prev.heaviestSet = w
        maxByExerciseDay.set(key, prev)
        prs.push({
          exerciseName: log.exercise_name,
          templateDayId: session.template_day_id,
          prType: 'heaviestSet',
          value: w,
          workoutDate: session.workout_date,
        })
      }
      if (e1rm > prev.e1RM) {
        prev.e1RM = e1rm
        maxByExerciseDay.set(key, prev)
        prs.push({
          exerciseName: log.exercise_name,
          templateDayId: session.template_day_id,
          prType: 'e1RM',
          value: Math.round(e1rm * 10) / 10,
          workoutDate: session.workout_date,
        })
      }
    }
  }

  return prs.slice(-limit).reverse()
}
