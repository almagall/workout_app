// LocalStorage-based data storage for templates and workouts
// This works with the simple auth system

import type { PlanType, WorkoutTemplate, TemplateDay, TemplateExercise, WorkoutSession, ExerciseLog } from '@/types/workout'
import { getCurrentUser } from './auth-simple'

// Template storage
export function saveTemplate(template: {
  name: string
  planType: PlanType
  days: Array<{
    dayLabel: string
    dayOrder: number
    exercises: string[]
  }>
}): string {
  const user = getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const templateData: WorkoutTemplate = {
    id: templateId,
    user_id: user.id,
    plan_type: template.planType,
    name: template.name,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const days: TemplateDay[] = template.days.map((day, index) => ({
    id: `day_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
    template_id: templateId,
    day_label: day.dayLabel,
    day_order: day.dayOrder,
    created_at: new Date().toISOString(),
  }))

  const exercises: TemplateExercise[] = template.days.flatMap((day, dayIndex) =>
    day.exercises.map((exerciseName, exerciseIndex) => ({
      id: `exercise_${Date.now()}_${dayIndex}_${exerciseIndex}_${Math.random().toString(36).substr(2, 9)}`,
      template_day_id: days[dayIndex].id,
      exercise_name: exerciseName,
      exercise_order: exerciseIndex + 1,
      created_at: new Date().toISOString(),
    }))
  )

  // Store in localStorage
  const templates = getTemplates()
  templates.push(templateData)
  localStorage.setItem(`workout_templates_${user.id}`, JSON.stringify(templates))

  localStorage.setItem(`template_days_${user.id}`, JSON.stringify([
    ...(JSON.parse(localStorage.getItem(`template_days_${user.id}`) || '[]')),
    ...days
  ]))

  localStorage.setItem(`template_exercises_${user.id}`, JSON.stringify([
    ...(JSON.parse(localStorage.getItem(`template_exercises_${user.id}`) || '[]')),
    ...exercises
  ]))

  return templateId
}

export function getTemplates(): WorkoutTemplate[] {
  const user = getCurrentUser()
  if (!user) return []

  const templatesStr = localStorage.getItem(`workout_templates_${user.id}`)
  if (!templatesStr) return []

  try {
    return JSON.parse(templatesStr) as WorkoutTemplate[]
  } catch {
    return []
  }
}

export function getTemplateDays(templateId: string): TemplateDay[] {
  const user = getCurrentUser()
  if (!user) return []

  const daysStr = localStorage.getItem(`template_days_${user.id}`)
  if (!daysStr) return []

  try {
    const allDays = JSON.parse(daysStr) as TemplateDay[]
    return allDays.filter(day => day.template_id === templateId)
  } catch {
    return []
  }
}

export function getTemplateExercises(dayId: string): TemplateExercise[] {
  const user = getCurrentUser()
  if (!user) return []

  const exercisesStr = localStorage.getItem(`template_exercises_${user.id}`)
  if (!exercisesStr) return []

  try {
    const allExercises = JSON.parse(exercisesStr) as TemplateExercise[]
    return allExercises
      .filter(ex => ex.template_day_id === dayId)
      .sort((a, b) => a.exercise_order - b.exercise_order)
  } catch {
    return []
  }
}

export function getTemplateDay(dayId: string): TemplateDay | null {
  const user = getCurrentUser()
  if (!user) return null

  const daysStr = localStorage.getItem(`template_days_${user.id}`)
  if (!daysStr) return null

  try {
    const allDays = JSON.parse(daysStr) as TemplateDay[]
    return allDays.find(day => day.id === dayId) || null
  } catch {
    return null
  }
}

// Workout session storage
export function saveWorkoutSession(session: {
  templateDayId: string
  workoutDate: string
  overallRating?: number
  overallFeedback?: string
  exercises: Array<{
    exerciseName: string
    sets: Array<{
      setNumber: number
      weight: number
      reps: number
      rpe: number
      targetWeight?: number | null
      targetReps?: number | null
      targetRpe?: number | null
      performanceStatus?: string | null
      exerciseFeedback?: string | null
    }>
  }>
}): string {
  const user = getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const sessionData: WorkoutSession = {
    id: sessionId,
    user_id: user.id,
    template_day_id: session.templateDayId,
    workout_date: session.workoutDate,
    overall_performance_rating: session.overallRating || null,
    overall_feedback: session.overallFeedback || null,
    created_at: new Date().toISOString(),
  }

  const logs: ExerciseLog[] = session.exercises.flatMap((exercise) =>
    exercise.sets.map((set) => ({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      session_id: sessionId,
      exercise_name: exercise.exerciseName,
      set_number: set.setNumber,
      weight: set.weight,
      reps: set.reps,
      rpe: set.rpe,
      target_weight: set.targetWeight ?? null,
      target_reps: set.targetReps ?? null,
      target_rpe: set.targetRpe ?? null,
      performance_status: (set.performanceStatus as any) || null,
      exercise_feedback: set.exerciseFeedback || null,
      created_at: new Date().toISOString(),
    }))
  )

  // Store in localStorage
  const sessions = getWorkoutSessions()
  sessions.push(sessionData)
  localStorage.setItem(`workout_sessions_${user.id}`, JSON.stringify(sessions))

  const allLogs = getExerciseLogs()
  localStorage.setItem(`exercise_logs_${user.id}`, JSON.stringify([...allLogs, ...logs]))

  return sessionId
}

export function getWorkoutSessions(): WorkoutSession[] {
  const user = getCurrentUser()
  if (!user) return []

  const sessionsStr = localStorage.getItem(`workout_sessions_${user.id}`)
  if (!sessionsStr) return []

  try {
    return JSON.parse(sessionsStr) as WorkoutSession[]
  } catch {
    return []
  }
}

export function getExerciseLogs(): ExerciseLog[] {
  const user = getCurrentUser()
  if (!user) return []

  const logsStr = localStorage.getItem(`exercise_logs_${user.id}`)
  if (!logsStr) return []

  try {
    return JSON.parse(logsStr) as ExerciseLog[]
  } catch {
    return []
  }
}

export function getPreviousWorkoutSession(templateDayId: string, beforeDate: string): WorkoutSession | null {
  const user = getCurrentUser()
  if (!user) return null

  const sessions = getWorkoutSessions()
    .filter(s => s.template_day_id === templateDayId && s.workout_date < beforeDate)
    .sort((a, b) => new Date(b.workout_date).getTime() - new Date(a.workout_date).getTime())

  return sessions.length > 0 ? sessions[0] : null
}

export function getWorkoutSessionByDate(templateDayId: string, date: string): WorkoutSession | null {
  const sessions = getWorkoutSessions()
    .filter(s => s.template_day_id === templateDayId && s.workout_date === date)

  return sessions.length > 0 ? sessions[0] : null
}

export function getExerciseLogsForSession(sessionId: string): ExerciseLog[] {
  return getExerciseLogs().filter(log => log.session_id === sessionId)
}

export function updateWorkoutSession(
  sessionId: string,
  session: {
    templateDayId: string
    workoutDate: string
    overallRating?: number
    overallFeedback?: string
    exercises: Array<{
      exerciseName: string
      sets: Array<{
        setNumber: number
        weight: number
        reps: number
        rpe: number
        targetWeight?: number | null
        targetReps?: number | null
        targetRpe?: number | null
        performanceStatus?: string | null
        exerciseFeedback?: string | null
      }>
    }>
  }
): void {
  const user = getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  // Update session
  const sessions = getWorkoutSessions()
  const sessionIndex = sessions.findIndex(s => s.id === sessionId)
  if (sessionIndex === -1) throw new Error('Session not found')

  sessions[sessionIndex] = {
    ...sessions[sessionIndex],
    template_day_id: session.templateDayId,
    workout_date: session.workoutDate,
    overall_performance_rating: session.overallRating || null,
    overall_feedback: session.overallFeedback || null,
  }
  localStorage.setItem(`workout_sessions_${user.id}`, JSON.stringify(sessions))

  // Remove old logs and add new ones
  const allLogs = getExerciseLogs()
  const filteredLogs = allLogs.filter(log => log.session_id !== sessionId)

  const newLogs: ExerciseLog[] = session.exercises.flatMap((exercise) =>
    exercise.sets.map((set) => ({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      session_id: sessionId,
      exercise_name: exercise.exerciseName,
      set_number: set.setNumber,
      weight: set.weight,
      reps: set.reps,
      rpe: set.rpe,
      target_weight: set.targetWeight ?? null,
      target_reps: set.targetReps ?? null,
      target_rpe: set.targetRpe ?? null,
      performance_status: (set.performanceStatus as any) || null,
      exercise_feedback: set.exerciseFeedback || null,
      created_at: new Date().toISOString(),
    }))
  )

  localStorage.setItem(`exercise_logs_${user.id}`, JSON.stringify([...filteredLogs, ...newLogs]))
}

export function deleteWorkoutSession(sessionId: string): void {
  const user = getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  // Remove session
  const sessions = getWorkoutSessions()
  const filteredSessions = sessions.filter(s => s.id !== sessionId)
  localStorage.setItem(`workout_sessions_${user.id}`, JSON.stringify(filteredSessions))

  // Remove logs
  const allLogs = getExerciseLogs()
  const filteredLogs = allLogs.filter(log => log.session_id !== sessionId)
  localStorage.setItem(`exercise_logs_${user.id}`, JSON.stringify(filteredLogs))
}
