import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import WorkoutShareClient from './WorkoutShareClient'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function generateMetadata({ params }: { params: Promise<{ sessionId: string }> }): Promise<Metadata> {
  const { sessionId } = await params
  const defaults: Metadata = {
    title: 'Workout Summary - Workout Planner',
    description: 'Check out this workout!',
  }

  try {
    const supabase = getSupabase()
    if (!supabase) return defaults

    const { data: session } = await supabase
      .from('workout_sessions')
      .select('user_id, template_day_id, workout_date')
      .eq('id', sessionId)
      .single()

    if (!session) return defaults

    const [{ data: user }, { data: templateDay }] = await Promise.all([
      supabase.from('simple_users').select('username').eq('user_id', session.user_id).single(),
      supabase.from('template_days').select('day_label, template_id').eq('id', session.template_day_id).single(),
    ])

    let templateName = 'Workout'
    if (templateDay?.template_id) {
      const { data: template } = await supabase.from('templates').select('name').eq('id', templateDay.template_id).single()
      templateName = template?.name ?? 'Workout'
    }

    const { count } = await supabase
      .from('exercise_logs')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('set_type', 'working')

    const username = user?.username ?? 'Someone'
    const dayLabel = templateDay?.day_label ?? 'Workout'
    const sets = count ?? 0

    return {
      title: `${username} completed ${dayLabel} - Workout Planner`,
      description: `${username} just finished ${dayLabel} (${templateName}) — ${sets} working sets on ${session.workout_date}`,
      openGraph: {
        title: `${username} completed ${dayLabel}`,
        description: `${sets} working sets · ${templateName} · ${session.workout_date}`,
        type: 'article',
      },
      twitter: {
        card: 'summary',
        title: `${username} completed ${dayLabel}`,
        description: `${sets} working sets · ${templateName} · ${session.workout_date}`,
      },
    }
  } catch {
    return defaults
  }
}

export default async function ShareWorkoutPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  return <WorkoutShareClient sessionId={sessionId} />
}
