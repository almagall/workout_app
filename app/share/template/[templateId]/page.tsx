import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import TemplateShareClient from './TemplateShareClient'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function generateMetadata({ params }: { params: Promise<{ templateId: string }> }): Promise<Metadata> {
  const { templateId } = await params
  const defaults: Metadata = {
    title: 'Workout Template - Workout Planner',
    description: 'Check out this workout template!',
  }

  try {
    const supabase = getSupabase()
    if (!supabase) return defaults

    const { data: template } = await supabase
      .from('templates')
      .select('name, plan_type, user_id')
      .eq('id', templateId)
      .single()

    if (!template) return defaults

    const [{ data: user }, { data: days }] = await Promise.all([
      supabase.from('simple_users').select('username').eq('user_id', template.user_id).single(),
      supabase.from('template_days').select('exercises').eq('template_id', templateId),
    ])

    const username = user?.username ?? 'Someone'
    const dayCount = days?.length ?? 0
    const exerciseCount = new Set((days ?? []).flatMap(d => d.exercises ?? [])).size
    const planLabel = template.plan_type.replace(/_/g, ' ')

    return {
      title: `${template.name} - Shared by ${username}`,
      description: `${dayCount} days, ${exerciseCount} exercises · ${planLabel} program`,
      openGraph: {
        title: `${template.name} by ${username}`,
        description: `${dayCount}-day ${planLabel} program with ${exerciseCount} exercises`,
        type: 'article',
      },
      twitter: {
        card: 'summary',
        title: `${template.name} by ${username}`,
        description: `${dayCount}-day ${planLabel} program with ${exerciseCount} exercises`,
      },
    }
  } catch {
    return defaults
  }
}

export default async function ShareTemplatePage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params
  return <TemplateShareClient templateId={templateId} />
}
