import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  return createClient(url, key)
}

export interface TemplateDaySummary {
  day_label: string
  exercises: string[]
}

export interface TemplateSummary {
  template_id: string
  name: string
  plan_type: string
  creator_username: string
  days: TemplateDaySummary[]
  total_exercises: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data: template, error: templateErr } = await supabase
      .from('templates')
      .select('id, name, plan_type, user_id')
      .eq('id', templateId)
      .single()

    if (templateErr || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const { data: user } = await supabase
      .from('simple_users')
      .select('username')
      .eq('user_id', template.user_id)
      .single()

    const { data: templateDays } = await supabase
      .from('template_days')
      .select('id, day_label, exercises')
      .eq('template_id', templateId)
      .order('created_at', { ascending: true })

    const days: TemplateDaySummary[] = (templateDays ?? []).map(d => ({
      day_label: d.day_label,
      exercises: d.exercises ?? [],
    }))

    const totalExercises = new Set(days.flatMap(d => d.exercises)).size

    const summary: TemplateSummary = {
      template_id: templateId,
      name: template.name,
      plan_type: template.plan_type,
      creator_username: user?.username ?? 'Unknown',
      days,
      total_exercises: totalExercises,
    }

    return NextResponse.json({ summary })
  } catch (e) {
    console.error('Share template API error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
