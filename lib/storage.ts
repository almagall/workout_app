// Supabase-based data storage for templates and workouts
// This works with the simple auth system but stores data in Supabase for cross-device sync

import type { PlanType, WorkoutTemplate, TemplateDay, TemplateExercise, WorkoutSession, ExerciseLog } from '@/types/workout'
import { getCurrentUser } from './auth-simple'
import { createClient } from './supabase/client'

// Template storage
export async function saveTemplate(template: {
  name: string
  planType: PlanType
  days: Array<{
    dayLabel: string
    dayOrder: number
    exercises: string[]
  }>
}): Promise<string> {
  const user = getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const supabase = createClient()

  // Insert template
  const { data: templateData, error: templateError } = await supabase
    .from('workout_templates')
    .insert({
      user_id: user.id,
      plan_type: template.planType,
      name: template.name,
    })
    .select()
    .single()

  if (templateError) throw new Error(`Failed to save template: ${templateError.message}`)
  if (!templateData) throw new Error('Failed to save template: No data returned')

  const templateId = templateData.id

  // Insert template days
  const daysToInsert = template.days.map((day) => ({
    template_id: templateId,
    day_label: day.dayLabel,
    day_order: day.dayOrder,
  }))

  const { error: daysError } = await supabase
    .from('template_days')
    .insert(daysToInsert)

  if (daysError) throw new Error(`Failed to save template days: ${daysError.message}`)

  // Get the inserted days to get their IDs
  const { data: insertedDays, error: fetchDaysError } = await supabase
    .from('template_days')
    .select('id, day_order')
    .eq('template_id', templateId)

  if (fetchDaysError) throw new Error(`Failed to fetch template days: ${fetchDaysError.message}`)

  // Insert template exercises
  const exercisesToInsert = template.days.flatMap((day, dayIndex) => {
    const dayData = insertedDays?.find(d => d.day_order === day.dayOrder)
    if (!dayData) return []
    
    return day.exercises.map((exerciseName, exerciseIndex) => ({
      template_day_id: dayData.id,
      exercise_name: exerciseName,
      exercise_order: exerciseIndex + 1,
    }))
  })

  if (exercisesToInsert.length > 0) {
    const { error: exercisesError } = await supabase
      .from('template_exercises')
      .insert(exercisesToInsert)

    if (exercisesError) throw new Error(`Failed to save template exercises: ${exercisesError.message}`)
  }

  return templateId
}

export async function updateTemplate(
  templateId: string,
  template: {
    name: string
    planType: PlanType
    days: Array<{
      dayLabel: string
      dayOrder: number
      exercises: string[]
    }>
  }
): Promise<void> {
  const user = getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const supabase = createClient()

  // Update template
  const { error: templateError } = await supabase
    .from('workout_templates')
    .update({
      plan_type: template.planType,
      name: template.name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId)
    .eq('user_id', user.id)

  if (templateError) throw new Error(`Failed to update template: ${templateError.message}`)

  // Delete existing days and exercises (cascade will handle exercises)
  const { error: deleteDaysError } = await supabase
    .from('template_days')
    .delete()
    .eq('template_id', templateId)

  if (deleteDaysError) throw new Error(`Failed to delete template days: ${deleteDaysError.message}`)

  // Insert new template days
  const daysToInsert = template.days.map((day) => ({
    template_id: templateId,
    day_label: day.dayLabel,
    day_order: day.dayOrder,
  }))

  const { error: daysError } = await supabase
    .from('template_days')
    .insert(daysToInsert)

  if (daysError) throw new Error(`Failed to save template days: ${daysError.message}`)

  // Get the inserted days to get their IDs
  const { data: insertedDays, error: fetchDaysError } = await supabase
    .from('template_days')
    .select('id, day_order')
    .eq('template_id', templateId)

  if (fetchDaysError) throw new Error(`Failed to fetch template days: ${fetchDaysError.message}`)

  // Insert template exercises
  const exercisesToInsert = template.days.flatMap((day, dayIndex) => {
    const dayData = insertedDays?.find(d => d.day_order === day.dayOrder)
    if (!dayData) return []
    
    return day.exercises.map((exerciseName, exerciseIndex) => ({
      template_day_id: dayData.id,
      exercise_name: exerciseName,
      exercise_order: exerciseIndex + 1,
    }))
  })

  if (exercisesToInsert.length > 0) {
    const { error: exercisesError } = await supabase
      .from('template_exercises')
      .insert(exercisesToInsert)

    if (exercisesError) throw new Error(`Failed to save template exercises: ${exercisesError.message}`)
  }
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const user = getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const supabase = createClient()

  // Delete template (cascade will handle days and exercises)
  const { error: templateError } = await supabase
    .from('workout_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', user.id)

  if (templateError) throw new Error(`Failed to delete template: ${templateError.message}`)
}

export async function getTemplates(): Promise<WorkoutTemplate[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching templates:', error)
    return []
  }

  return (data || []).map(t => ({
    id: t.id,
    user_id: t.user_id,
    plan_type: t.plan_type,
    name: t.name,
    created_at: t.created_at,
    updated_at: t.updated_at,
  }))
}

export async function getTemplateDays(templateId: string): Promise<TemplateDay[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('template_days')
    .select('*')
    .eq('template_id', templateId)
    .order('day_order', { ascending: true })

  if (error) {
    console.error('Error fetching template days:', error)
    return []
  }

  return (data || []).map(d => ({
    id: d.id,
    template_id: d.template_id,
    day_label: d.day_label,
    day_order: d.day_order,
    created_at: d.created_at,
  }))
}

export async function getTemplateExercises(dayId: string): Promise<TemplateExercise[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('template_exercises')
    .select('*')
    .eq('template_day_id', dayId)
    .order('exercise_order', { ascending: true })

  if (error) {
    console.error('Error fetching template exercises:', error)
    return []
  }

  return (data || []).map(e => ({
    id: e.id,
    template_day_id: e.template_day_id,
    exercise_name: e.exercise_name,
    exercise_order: e.exercise_order,
    created_at: e.created_at,
  }))
}

export async function getTemplateDay(dayId: string): Promise<TemplateDay | null> {
  const user = getCurrentUser()
  if (!user) return null

  const supabase = createClient()
  const { data, error } = await supabase
    .from('template_days')
    .select('*')
    .eq('id', dayId)
    .single()

  if (error || !data) {
    console.error('Error fetching template day:', error)
    return null
  }

  return {
    id: data.id,
    template_id: data.template_id,
    day_label: data.day_label,
    day_order: data.day_order,
    created_at: data.created_at,
  }
}

// Workout session storage
export async function saveWorkoutSession(session: {
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
}): Promise<string> {
  const user = getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const supabase = createClient()

  // Insert workout session
  const { data: sessionData, error: sessionError } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: user.id,
      template_day_id: session.templateDayId,
      workout_date: session.workoutDate,
      overall_performance_rating: session.overallRating || null,
      overall_feedback: session.overallFeedback || null,
    })
    .select()
    .single()

  if (sessionError) throw new Error(`Failed to save workout session: ${sessionError.message}`)
  if (!sessionData) throw new Error('Failed to save workout session: No data returned')

  const sessionId = sessionData.id

  // Insert exercise logs
  const logsToInsert = session.exercises.flatMap((exercise) =>
    exercise.sets.map((set) => ({
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
    }))
  )

  if (logsToInsert.length > 0) {
    const { error: logsError } = await supabase
      .from('exercise_logs')
      .insert(logsToInsert)

    if (logsError) throw new Error(`Failed to save exercise logs: ${logsError.message}`)
  }

  return sessionId
}

export async function getWorkoutSessions(): Promise<WorkoutSession[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('workout_date', { ascending: false })

  if (error) {
    console.error('Error fetching workout sessions:', error)
    return []
  }

  return (data || []).map(s => ({
    id: s.id,
    user_id: s.user_id,
    template_day_id: s.template_day_id,
    workout_date: s.workout_date,
    overall_performance_rating: s.overall_performance_rating,
    overall_feedback: s.overall_feedback,
    created_at: s.created_at,
  }))
}

export async function getExerciseLogs(): Promise<ExerciseLog[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()
  
  // Get all sessions for this user first
  const sessions = await getWorkoutSessions()
  if (sessions.length === 0) return []

  const sessionIds = sessions.map(s => s.id)

  const { data, error } = await supabase
    .from('exercise_logs')
    .select('*')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching exercise logs:', error)
    return []
  }

  return (data || []).map(log => ({
    id: log.id,
    session_id: log.session_id,
    exercise_name: log.exercise_name,
    set_number: log.set_number,
    weight: log.weight,
    reps: log.reps,
    rpe: log.rpe,
    target_weight: log.target_weight,
    target_reps: log.target_reps,
    target_rpe: log.target_rpe,
    performance_status: log.performance_status,
    exercise_feedback: log.exercise_feedback,
    created_at: log.created_at,
  }))
}

export async function getPreviousWorkoutSession(templateDayId: string, beforeDate: string): Promise<WorkoutSession | null> {
  const user = getCurrentUser()
  if (!user) return null

  const supabase = createClient()
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('template_day_id', templateDayId)
    .lt('workout_date', beforeDate)
    .order('workout_date', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    user_id: data.user_id,
    template_day_id: data.template_day_id,
    workout_date: data.workout_date,
    overall_performance_rating: data.overall_performance_rating,
    overall_feedback: data.overall_feedback,
    created_at: data.created_at,
  }
}

export async function getWorkoutSessionByDate(templateDayId: string, date: string): Promise<WorkoutSession | null> {
  const user = getCurrentUser()
  if (!user) return null

  const supabase = createClient()
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('template_day_id', templateDayId)
    .eq('workout_date', date)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    user_id: data.user_id,
    template_day_id: data.template_day_id,
    workout_date: data.workout_date,
    overall_performance_rating: data.overall_performance_rating,
    overall_feedback: data.overall_feedback,
    created_at: data.created_at,
  }
}

export async function getExerciseLogsForSession(sessionId: string): Promise<ExerciseLog[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('session_id', sessionId)
    .order('set_number', { ascending: true })

  if (error) {
    console.error('Error fetching exercise logs for session:', error)
    return []
  }

  return (data || []).map(log => ({
    id: log.id,
    session_id: log.session_id,
    exercise_name: log.exercise_name,
    set_number: log.set_number,
    weight: log.weight,
    reps: log.reps,
    rpe: log.rpe,
    target_weight: log.target_weight,
    target_reps: log.target_reps,
    target_rpe: log.target_rpe,
    performance_status: log.performance_status,
    exercise_feedback: log.exercise_feedback,
    created_at: log.created_at,
  }))
}

export async function updateWorkoutSession(
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
): Promise<void> {
  const user = getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const supabase = createClient()

  // Update session
  const { error: sessionError } = await supabase
    .from('workout_sessions')
    .update({
      template_day_id: session.templateDayId,
      workout_date: session.workoutDate,
      overall_performance_rating: session.overallRating || null,
      overall_feedback: session.overallFeedback || null,
    })
    .eq('id', sessionId)
    .eq('user_id', user.id)

  if (sessionError) throw new Error(`Failed to update workout session: ${sessionError.message}`)

  // Delete old logs
  const { error: deleteError } = await supabase
    .from('exercise_logs')
    .delete()
    .eq('session_id', sessionId)

  if (deleteError) throw new Error(`Failed to delete old exercise logs: ${deleteError.message}`)

  // Insert new logs
  const logsToInsert = session.exercises.flatMap((exercise) =>
    exercise.sets.map((set) => ({
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
    }))
  )

  if (logsToInsert.length > 0) {
    const { error: logsError } = await supabase
      .from('exercise_logs')
      .insert(logsToInsert)

    if (logsError) throw new Error(`Failed to save exercise logs: ${logsError.message}`)
  }
}

export async function deleteWorkoutSession(sessionId: string): Promise<void> {
  const user = getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const supabase = createClient()

  // Delete logs first (cascade should handle this, but being explicit)
  const { error: logsError } = await supabase
    .from('exercise_logs')
    .delete()
    .eq('session_id', sessionId)

  if (logsError) throw new Error(`Failed to delete exercise logs: ${logsError.message}`)

  // Delete session
  const { error: sessionError } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id)

  if (sessionError) throw new Error(`Failed to delete workout session: ${sessionError.message}`)
}
