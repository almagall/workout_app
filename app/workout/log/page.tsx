import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { TemplateDay } from '@/types/workout'

export default async function LogWorkoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's templates and their days
  const { data: templates } = await supabase
    .from('workout_templates')
    .select(`
      id,
      name,
      template_days (
        id,
        day_label,
        day_order
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!templates || templates.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-8">Log Workout</h1>
        <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
          <p className="text-slate-300 mb-4">
            You need to create a workout template first before logging workouts.
          </p>
          <Link
            href="/workout/template/create"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500"
          >
            Create Template
          </Link>
        </div>
      </div>
    )
  }

  // Flatten template days with template info
  const allDays: Array<{
    templateId: string
    templateName: string
    dayId: string
    dayLabel: string
    dayOrder: number
  }> = []

  templates.forEach((template) => {
    const days = template.template_days as TemplateDay[]
    days.forEach((day) => {
      allDays.push({
        templateId: template.id,
        templateName: template.name,
        dayId: day.id,
        dayLabel: day.day_label,
        dayOrder: day.day_order,
      })
    })
  })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate-100 mb-8">Log Workout</h1>
      <p className="text-slate-300 mb-6">Select a workout day to log:</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allDays.map((day) => (
          <Link
            key={day.dayId}
            href={`/workout/log/${day.dayId}`}
            className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6 hover:border-indigo-500/50 transition-all"
          >
            <h3 className="text-xl font-semibold text-slate-100 mb-2">{day.dayLabel}</h3>
            <p className="text-sm text-slate-400">{day.templateName}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
