// Supabase-based data storage for templates and workouts
// This works with the simple auth system but stores data in Supabase for cross-device sync

import type { PlanType, WorkoutTemplate, TemplateDay, TemplateExercise, WorkoutSession, ExerciseLog } from '@/types/workout'
import { getCurrentUser } from './auth-simple'
import { createClient } from './supabase/client'
import { isInDeloadPeriod } from './deload-detection'

/** Exercise in a template day: name only (presets) or name + optional focus override. */
export type TemplateDayExercise = string | { name: string; focus?: PlanType | null }

// Template storage
export async function saveTemplate(template: {
  name: string
  planType: PlanType
  presetId?: string | null
  days: Array<{
    dayLabel: string
    dayOrder: number
    exercises: TemplateDayExercise[]
  }>
}): Promise<string> {
  const user = getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const supabase = createClient()

  const insertPayload: Record<string, unknown> = {
    user_id: user.id,
    plan_type: template.planType,
    name: template.name,
  }
  if (template.presetId != null) {
    insertPayload.preset_id = template.presetId
  }

  // Insert template
  const { data: templateData, error: templateError } = await supabase
    .from('workout_templates')
    .insert(insertPayload)
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
  const exercisesToInsert = template.days.flatMap((day) => {
    const dayData = insertedDays?.find(d => d.day_order === day.dayOrder)
    if (!dayData) return []
    return day.exercises.map((ex, exerciseIndex) => {
      const name = typeof ex === 'string' ? ex : ex.name
      const focus = typeof ex === 'string' ? null : (ex.focus ?? null)
      return {
        template_day_id: dayData.id,
        exercise_name: name,
        exercise_order: exerciseIndex + 1,
        ...(focus != null && { focus }),
      }
    })
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
      exercises: TemplateDayExercise[]
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

  // Get existing days BEFORE deleting to preserve workout sessions
  const { data: existingDays, error: fetchExistingError } = await supabase
    .from('template_days')
    .select('id, day_label, day_order')
    .eq('template_id', templateId)

  if (fetchExistingError) throw new Error(`Failed to fetch existing template days: ${fetchExistingError.message}`)

  // Get all workout sessions for existing days to preserve them
  const existingDayIds = (existingDays || []).map(d => d.id)
  const dayIdToSessionsMap = new Map<string, string[]>() // day_id -> session_ids[]

  if (existingDayIds.length > 0) {
    const { data: sessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('id, template_day_id')
      .in('template_day_id', existingDayIds)
      .eq('user_id', user.id)

    if (sessionsError) throw new Error(`Failed to fetch workout sessions: ${sessionsError.message}`)

    // Group sessions by template_day_id
    for (const session of sessions || []) {
      const dayId = session.template_day_id
      if (!dayIdToSessionsMap.has(dayId)) {
        dayIdToSessionsMap.set(dayId, [])
      }
      dayIdToSessionsMap.get(dayId)!.push(session.id)
    }
  }

  // Fetch old template exercises (ordered by exercise_order) for each existing day
  const oldExercisesMap = new Map<string, string[]>()
  if (existingDayIds.length > 0) {
    const { data: oldExercises, error: oldExError } = await supabase
      .from('template_exercises')
      .select('template_day_id, exercise_name, exercise_order')
      .in('template_day_id', existingDayIds)
      .order('exercise_order', { ascending: true })
    if (!oldExError && oldExercises?.length) {
      for (const row of oldExercises) {
        const dayId = row.template_day_id
        if (!oldExercisesMap.has(dayId)) oldExercisesMap.set(dayId, [])
        oldExercisesMap.get(dayId)!.push(row.exercise_name)
      }
    }
  }

  // Insert new template days BEFORE deleting old ones to preserve foreign key references
  const daysToInsert = template.days.map((day) => ({
    template_id: templateId,
    day_label: day.dayLabel,
    day_order: day.dayOrder,
  }))

  const { data: insertedDaysData, error: daysError } = await supabase
    .from('template_days')
    .insert(daysToInsert)
    .select('id, day_label, day_order')

  if (daysError) throw new Error(`Failed to save template days: ${daysError.message}`)
  if (!insertedDaysData) throw new Error('Failed to save template days: No data returned')

  const insertedDays = insertedDaysData

  // Build mapping: match old days to new days by day_order and day_label
  const oldDayToNewDayMap = new Map<string, string>() // old_day_id -> new_day_id
  const daysToDelete: string[] = [] // Track which old days can be safely deleted

  for (const oldDay of existingDays || []) {
    // Try to find matching new day by day_order first
    let newDay = insertedDays?.find(d => d.day_order === oldDay.day_order)
    
    // If no match by order, try by label
    if (!newDay) {
      newDay = insertedDays?.find(d => d.day_label === oldDay.day_label)
    }

    if (newDay) {
      oldDayToNewDayMap.set(oldDay.id, newDay.id)
      daysToDelete.push(oldDay.id) // Safe to delete after migrating sessions
    }
    // If no match found, keep the old day to preserve its workout sessions
  }

  // Rename exercise_logs when an exercise name changed at the same position (preserve history)
  const getExerciseName = (ex: TemplateDayExercise) => (typeof ex === 'string' ? ex : ex.name)
  for (const [oldDayId, newDayId] of oldDayToNewDayMap.entries()) {
    const sessionIds = dayIdToSessionsMap.get(oldDayId) ?? []
    if (sessionIds.length === 0) continue
    const oldDay = existingDays?.find((d) => d.id === oldDayId)
    if (!oldDay) continue
    const dayExercises = template.days.find((d) => d.dayOrder === oldDay.day_order)?.exercises ?? []
    const newNames = dayExercises.map(getExerciseName)
    const oldNames = oldExercisesMap.get(oldDayId) ?? []
    const len = Math.min(oldNames.length, newNames.length)
    for (let i = 0; i < len; i++) {
      if (oldNames[i] === newNames[i]) continue
      const { error: renameError } = await supabase
        .from('exercise_logs')
        .update({ exercise_name: newNames[i] })
        .in('session_id', sessionIds)
        .eq('exercise_name', oldNames[i])
      if (renameError) {
        throw new Error(`Failed to rename exercise logs for ${oldNames[i]} -> ${newNames[i]}: ${renameError.message}`)
      }
    }
  }

  // Update workout sessions to point to new template_day_ids BEFORE deleting old days
  // This preserves all workout logs for days that still exist in the template
  for (const [oldDayId, sessionIds] of dayIdToSessionsMap.entries()) {
    const newDayId = oldDayToNewDayMap.get(oldDayId)
    if (newDayId && sessionIds.length > 0) {
      // Update all sessions that were pointing to the old day_id
      const { error: updateSessionsError } = await supabase
        .from('workout_sessions')
        .update({ template_day_id: newDayId })
        .in('id', sessionIds)

      if (updateSessionsError) {
        throw new Error(`Failed to update workout sessions for day ${oldDayId}: ${updateSessionsError.message}`)
      }
    }
  }

  // Delete old days that have been successfully migrated to new days
  // Days without matches are kept to preserve their workout sessions
  if (daysToDelete.length > 0) {
    const { error: deleteDaysError } = await supabase
      .from('template_days')
      .delete()
      .in('id', daysToDelete)

    if (deleteDaysError) throw new Error(`Failed to delete template days: ${deleteDaysError.message}`)
  }

  // Insert template exercises
  const exercisesToInsert = template.days.flatMap((day) => {
    const dayData = insertedDays?.find(d => d.day_order === day.dayOrder)
    if (!dayData) return []
    return day.exercises.map((ex, exerciseIndex) => {
      const name = typeof ex === 'string' ? ex : ex.name
      const focus = typeof ex === 'string' ? null : (ex.focus ?? null)
      return {
        template_day_id: dayData.id,
        exercise_name: name,
        exercise_order: exerciseIndex + 1,
        ...(focus != null && { focus }),
      }
    })
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
    preset_id: t.preset_id ?? null,
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
    focus: e.focus ?? null,
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
  isComplete?: boolean
  durationSeconds?: number
  exercises: Array<{
    exerciseName: string
    sets: Array<{
      setNumber: number
      setType?: 'warmup' | 'working' | 'cooldown'
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
      is_complete: session.isComplete ?? true,
      ...(session.durationSeconds != null && { duration_seconds: session.durationSeconds }),
    })
    .select()
    .single()

  if (sessionError) throw new Error(`Failed to save workout session: ${sessionError.message}`)
  if (!sessionData) throw new Error('Failed to save workout session: No data returned')

  const sessionId = sessionData.id

  // Insert exercise logs (include set_type; warmup/cooldown have no targets or performance_status)
  const logsToInsert = session.exercises.flatMap((exercise) =>
    exercise.sets.map((set) => ({
      session_id: sessionId,
      exercise_name: exercise.exerciseName,
      set_number: set.setNumber,
      set_type: set.setType ?? 'working',
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
    is_complete: s.is_complete ?? true,
    created_at: s.created_at,
    duration_seconds: s.duration_seconds ?? null,
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
    set_type: (log.set_type === 'warmup' || log.set_type === 'cooldown' ? log.set_type : 'working') as 'warmup' | 'working' | 'cooldown',
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
    is_complete: data.is_complete ?? true,
    created_at: data.created_at,
  }
}

/**
 * Get the most recent previous workout session for a template day, excluding sessions
 * that fall within a deload period. Used for target calculation so we use pre-deload
 * performance as the baseline.
 */
export async function getPreviousWorkoutSessionExcludingDeload(
  templateDayId: string,
  beforeDate: string,
  userId: string
): Promise<WorkoutSession | null> {
  const supabase = createClient()
  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('template_day_id', templateDayId)
    .lt('workout_date', beforeDate)
    .order('workout_date', { ascending: false })
    .limit(20)

  if (error || !sessions || sessions.length === 0) return null

  for (const s of sessions) {
    if (!isInDeloadPeriod(userId, s.workout_date)) {
      return {
        id: s.id,
        user_id: s.user_id,
        template_day_id: s.template_day_id,
        workout_date: s.workout_date,
        overall_performance_rating: s.overall_performance_rating,
        overall_feedback: s.overall_feedback,
        is_complete: s.is_complete ?? true,
        created_at: s.created_at,
      }
    }
  }
  return null
}

/**
 * Find the most recent session for a template day that contains a specific exercise.
 * Used when swapping to an alternative: we need history for the new exercise.
 */
export async function getMostRecentSessionWithExercise(
  templateDayId: string,
  exerciseName: string,
  beforeDate: string,
  userId: string
): Promise<{ session: WorkoutSession; logs: ExerciseLog[] } | null> {
  const supabase = createClient()
  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('template_day_id', templateDayId)
    .lt('workout_date', beforeDate)
    .eq('is_complete', true)
    .order('workout_date', { ascending: false })
    .limit(20)

  if (error || !sessions || sessions.length === 0) return null

  for (const s of sessions) {
    if (isInDeloadPeriod(userId, s.workout_date)) continue
    const logs = await getExerciseLogsForSession(s.id)
    const exerciseLogs = logs.filter(
      (l) => l.exercise_name === exerciseName && (l.set_type ?? 'working') === 'working'
    )
    if (exerciseLogs.length > 0) {
      return {
        session: {
          id: s.id,
          user_id: s.user_id,
          template_day_id: s.template_day_id,
          workout_date: s.workout_date,
          overall_performance_rating: s.overall_performance_rating,
          overall_feedback: s.overall_feedback,
          is_complete: s.is_complete ?? true,
          created_at: s.created_at,
        },
        logs: exerciseLogs,
      }
    }
  }
  return null
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
    is_complete: data.is_complete ?? true,
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
    set_type: (log.set_type === 'warmup' || log.set_type === 'cooldown' ? log.set_type : 'working') as 'warmup' | 'working' | 'cooldown',
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
    isComplete?: boolean
    durationSeconds?: number
    exercises: Array<{
      exerciseName: string
      sets: Array<{
        setNumber: number
        setType?: 'warmup' | 'working' | 'cooldown'
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
  const updateData: any = {
    template_day_id: session.templateDayId,
    workout_date: session.workoutDate,
    overall_performance_rating: session.overallRating || null,
    overall_feedback: session.overallFeedback || null,
  }
  
  if (session.isComplete !== undefined) {
    updateData.is_complete = session.isComplete
  }
  if (session.durationSeconds != null) {
    updateData.duration_seconds = session.durationSeconds
  }

  const { error: sessionError } = await supabase
    .from('workout_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .eq('user_id', user.id)

  if (sessionError) throw new Error(`Failed to update workout session: ${sessionError.message}`)

  // Delete old logs
  const { error: deleteError } = await supabase
    .from('exercise_logs')
    .delete()
    .eq('session_id', sessionId)

  if (deleteError) throw new Error(`Failed to delete old exercise logs: ${deleteError.message}`)

  // Insert new logs (include set_type)
  const logsToInsert = session.exercises.flatMap((exercise) =>
    exercise.sets.map((set) => ({
      session_id: sessionId,
      exercise_name: exercise.exerciseName,
      set_number: set.setNumber,
      set_type: set.setType ?? 'working',
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

// Draft workout management functions

/**
 * Get the user's current draft workout session (incomplete workout)
 * Returns null if no draft exists
 */
export async function getDraftWorkoutSession(): Promise<WorkoutSession | null> {
  const user = getCurrentUser()
  if (!user) {
    console.log('🔴 No user in getDraftWorkoutSession')
    return null
  }

  console.log('🔍 Fetching draft workout session for user:', user.id)

  const supabase = createClient()
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_complete', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  console.log('🔍 getDraftWorkoutSession query result:', { 
    data: data ? {
      id: data.id,
      template_day_id: data.template_day_id,
      workout_date: data.workout_date,
      is_complete: data.is_complete
    } : null,
    error 
  })

  if (error) {
    console.error('❌ Error fetching draft workout session:', error)
    return null
  }

  if (!data) {
    console.log('ℹ️ No draft workout session found')
    return null
  }

  console.log('✅ Draft workout session found', { id: data.id, template_day_id: data.template_day_id })

  return {
    id: data.id,
    user_id: data.user_id,
    template_day_id: data.template_day_id,
    workout_date: data.workout_date,
    overall_performance_rating: data.overall_performance_rating,
    overall_feedback: data.overall_feedback,
    is_complete: data.is_complete,
    created_at: data.created_at,
  }
}

/**
 * Save or update a draft workout session
 * If draftSessionId is provided, updates existing draft
 * Otherwise creates a new draft
 */
export async function saveDraftWorkoutSession(
  session: {
    templateDayId: string
    workoutDate: string
    exercises: Array<{
      exerciseName: string
      sets: Array<{
        setNumber: number
        setType?: 'warmup' | 'working' | 'cooldown'
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
  },
  draftSessionId?: string
): Promise<string> {
  const user = getCurrentUser()
  if (!user) {
    console.error('🔴 saveDraftWorkoutSession: User not authenticated')
    throw new Error('User not authenticated')
  }

  console.log('🟢 saveDraftWorkoutSession called', { 
    draftSessionId, 
    templateDayId: session.templateDayId,
    workoutDate: session.workoutDate,
    exerciseCount: session.exercises.length,
    isUpdate: !!draftSessionId 
  })

  const supabase = createClient()

  if (draftSessionId) {
    // Update existing draft
    console.log('🔄 Updating existing draft session:', draftSessionId)
    await updateWorkoutSession(draftSessionId, {
      ...session,
      isComplete: false,
    })
    console.log('✅ Draft session updated:', draftSessionId)
    return draftSessionId
  } else {
    // Create new draft
    console.log('🆕 Creating new draft session')
    const newSessionId = await saveWorkoutSession({
      ...session,
      isComplete: false,
    })
    console.log('✅ New draft session created:', newSessionId)
    return newSessionId
  }
}

/**
 * Mark a draft workout session as complete
 */
export async function completeWorkoutSession(
  sessionId: string,
  completionData: {
    overallRating: number
    overallFeedback: string
    durationSeconds?: number
  }
): Promise<void> {
  const user = getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const supabase = createClient()

  const updatePayload: Record<string, unknown> = {
    is_complete: true,
    overall_performance_rating: completionData.overallRating,
    overall_feedback: completionData.overallFeedback,
  }
  if (completionData.durationSeconds != null) {
    updatePayload.duration_seconds = completionData.durationSeconds
  }

  const { error: sessionError } = await supabase
    .from('workout_sessions')
    .update(updatePayload)
    .eq('id', sessionId)
    .eq('user_id', user.id)

  if (sessionError) throw new Error(`Failed to complete workout session: ${sessionError.message}`)
}
