import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WorkoutLogger from '@/components/workout/WorkoutLogger'

export default async function LogWorkoutDayPage({
  params,
}: {
  params: { dayId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get template day and exercises
  const { data: templateDay } = await supabase
    .from('template_days')
    .select(`
      id,
      day_label,
      template_id,
      workout_templates!inner (
        id,
        plan_type,
        user_id
      ),
      template_exercises (
        id,
        exercise_name,
        exercise_order
      )
    `)
    .eq('id', params.dayId)
    .single()

  if (!templateDay || (templateDay.workout_templates as any).user_id !== user.id) {
    redirect('/workout/log')
  }

  const exercises = (templateDay.template_exercises as any[]).sort(
    (a, b) => a.exercise_order - b.exercise_order
  )

  return (
    <WorkoutLogger
      dayId={params.dayId}
      dayLabel={templateDay.day_label}
      planType={(templateDay.workout_templates as any).plan_type}
      exercises={exercises.map((e) => e.exercise_name)}
      userId={user.id}
    />
  )
}
