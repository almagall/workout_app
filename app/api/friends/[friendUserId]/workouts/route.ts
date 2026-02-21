import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  return createClient(url, key)
}

export async function GET(
  req: NextRequest,
  { params }: { params: { friendUserId: string } }
) {
  const { searchParams } = new URL(req.url)
  const currentUserId = searchParams.get('currentUserId')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '5', 10), 10)
  const { friendUserId } = params

  if (!currentUserId || !friendUserId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Verify friendship
  const { data: friendship } = await supabase
    .from('friend_requests')
    .select('id')
    .eq('status', 'accepted')
    .or(
      `and(from_user_id.eq.${currentUserId},to_user_id.eq.${friendUserId}),and(from_user_id.eq.${friendUserId},to_user_id.eq.${currentUserId})`
    )
    .limit(1)

  if (!friendship?.length) {
    return NextResponse.json({ error: 'Not friends' }, { status: 403 })
  }

  // Fetch recent completed workouts
  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('id, workout_date, template_day_id, overall_performance_rating, session_notes, note_tags')
    .eq('user_id', friendUserId)
    .eq('is_complete', true)
    .order('workout_date', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!sessions?.length) {
    return NextResponse.json({ workouts: [] })
  }

  // Fetch template day labels
  const dayIds = [...new Set(sessions.map(s => s.template_day_id))]
  const { data: days } = await supabase
    .from('template_days')
    .select('id, day_label, template_id')
    .in('id', dayIds)

  const dayMap = new Map<string, { day_label: string; template_id: string }>()
  days?.forEach(d => dayMap.set(d.id, { day_label: d.day_label, template_id: d.template_id }))

  const templateIds = [...new Set(days?.map(d => d.template_id) ?? [])]
  const { data: templates } = await supabase
    .from('workout_templates')
    .select('id, name')
    .in('id', templateIds)

  const templateMap = new Map<string, string>()
  templates?.forEach(t => templateMap.set(t.id, t.name))

  const workouts = sessions.map(s => {
    const day = dayMap.get(s.template_day_id)
    const templateName = day ? templateMap.get(day.template_id) ?? null : null
    return {
      id: s.id,
      workout_date: s.workout_date,
      day_label: day?.day_label ?? 'Unknown Workout',
      template_name: templateName,
      overall_performance_rating: s.overall_performance_rating,
      session_notes: s.session_notes,
      note_tags: s.note_tags,
    }
  })

  return NextResponse.json({ workouts })
}
