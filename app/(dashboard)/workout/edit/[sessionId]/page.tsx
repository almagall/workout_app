'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-simple'
import { getWorkoutSessions, getExerciseLogsForSession, getTemplateDay, getTemplateExercises, getTemplates } from '@/lib/storage'
import WorkoutLogger from '@/components/workout/WorkoutLogger'
import type { PlanType } from '@/types/workout'

export default function EditWorkoutPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const [loading, setLoading] = useState(true)
  const [workoutData, setWorkoutData] = useState<{
    dayId: string
    dayLabel: string
    planType: PlanType
    presetId: string | null
    exercises: string[]
    exerciseFocus: (PlanType | null)[]
    userId: string
    workoutDate: string
  } | null>(null)

  useEffect(() => {
    async function loadWorkoutData() {
      const user = getCurrentUser()
      if (!user) {
        router.push('/get-started')
        return
      }

      const sessions = await getWorkoutSessions()
      const session = sessions.find(s => s.id === sessionId)

      if (!session) {
        router.push('/workout/history')
        return
      }

      // Get template day
      const day = await getTemplateDay(session.template_day_id)
      if (!day) {
        router.push('/workout/history')
        return
      }

      // Get template to find plan type
      const templates = await getTemplates()
      const template = templates.find(t => t.id === day.template_id)
      if (!template) {
        router.push('/workout/history')
        return
      }

      // Get exercises for this day
      const exercisesData = await getTemplateExercises(day.id)
      const exercises = exercisesData.map(ex => ex.exercise_name)
      const exerciseFocus = exercisesData.map(ex => ex.focus ?? null)

      setWorkoutData({
        dayId: day.id,
        dayLabel: day.day_label,
        planType: template.plan_type,
        presetId: template.preset_id ?? null,
        exercises,
        exerciseFocus,
        userId: user.id,
        workoutDate: session.workout_date,
      })
      setLoading(false)
    }

    loadWorkoutData()
  }, [sessionId, router])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-[#888888]">Loading...</div>
      </div>
    )
  }

  if (!workoutData) {
    return null
  }

  return (
    <WorkoutLogger
      dayId={workoutData.dayId}
      dayLabel={workoutData.dayLabel}
      planType={workoutData.planType}
      presetId={workoutData.presetId}
      exercises={workoutData.exercises}
      exerciseFocus={workoutData.exerciseFocus}
      userId={workoutData.userId}
      sessionId={sessionId}
      workoutDate={workoutData.workoutDate}
    />
  )
}
