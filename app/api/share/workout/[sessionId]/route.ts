import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  return createClient(url, key)
}

export interface ExerciseSummary {
  exercise_name: string
  sets: { weight: number; reps: number; set_type: string }[]
  top_set_weight: number
  total_volume: number
}

export interface WorkoutSummary {
  session_id: string
  username: string
  workout_date: string
  day_label: string
  template_name: string
  exercises: ExerciseSummary[]
  total_sets: number
  total_volume: number
}

/** GET /api/share/workout/[sessionId] */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Get the session
    const { data: session, error: sessionErr } = await supabase
      .from('workout_sessions')
      .select('id, user_id, template_day_id, workout_date')
      .eq('id', sessionId)
      .single()

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Get user info
    const { data: user } = await supabase
      .from('simple_users')
      .select('username')
      .eq('user_id', session.user_id)
      .single()

    // Get template day and template info
    const { data: templateDay } = await supabase
      .from('template_days')
      .select('day_label, template_id')
      .eq('id', session.template_day_id)
      .single()

    let templateName = 'Workout'
    if (templateDay?.template_id) {
      const { data: template } = await supabase
        .from('templates')
        .select('name')
        .eq('id', templateDay.template_id)
        .single()
      templateName = template?.name ?? 'Workout'
    }

    // Get exercise logs
    const { data: logs } = await supabase
      .from('exercise_logs')
      .select('exercise_name, weight, reps, set_type, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    // Group by exercise
    const exerciseMap = new Map<string, ExerciseSummary>()
    
    logs?.forEach((log) => {
      const existing = exerciseMap.get(log.exercise_name)
      const setData = { weight: log.weight, reps: log.reps, set_type: log.set_type }
      const volume = log.weight * log.reps

      if (existing) {
        existing.sets.push(setData)
        existing.top_set_weight = Math.max(existing.top_set_weight, log.weight)
        existing.total_volume += volume
      } else {
        exerciseMap.set(log.exercise_name, {
          exercise_name: log.exercise_name,
          sets: [setData],
          top_set_weight: log.weight,
          total_volume: volume,
        })
      }
    })

    const exercises = Array.from(exerciseMap.values())
    const totalSets = logs?.length ?? 0
    const totalVolume = exercises.reduce((sum, e) => sum + e.total_volume, 0)

    const summary: WorkoutSummary = {
      session_id: sessionId,
      username: user?.username ?? 'Unknown',
      workout_date: session.workout_date,
      day_label: templateDay?.day_label ?? 'Workout',
      template_name: templateName,
      exercises,
      total_sets: totalSets,
      total_volume: totalVolume,
    }

    return NextResponse.json({ summary })
  } catch (e) {
    console.error('Share workout API error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
