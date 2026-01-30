'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-simple'
import { getTemplateDay, getTemplateExercises, getTemplates } from '@/lib/storage'
import WorkoutLogger from '@/components/workout/WorkoutLogger'
import type { PlanType } from '@/types/workout'

export default function LogWorkoutDayPage() {
  const params = useParams()
  const router = useRouter()
  const dayId = params.dayId as string
  const [loading, setLoading] = useState(true)
  const [dayData, setDayData] = useState<{
    dayLabel: string
    planType: PlanType
    presetId: string | null
    exercises: string[]
  } | null>(null)

  useEffect(() => {
    async function loadDayData() {
      const user = getCurrentUser()
      if (!user) {
        router.push('/get-started')
        return
      }

      // Get template day
      const day = await getTemplateDay(dayId)
      if (!day) {
        router.push('/workout/log')
        return
      }

      // Get template to find plan type
      const templates = await getTemplates()
      const template = templates.find(t => t.id === day.template_id)
      if (!template) {
        router.push('/workout/log')
        return
      }

      // Get exercises for this day
      const exercisesData = await getTemplateExercises(dayId)
      const exercises = exercisesData.map(ex => ex.exercise_name)

      setDayData({
        dayLabel: day.day_label,
        planType: template.plan_type,
        presetId: template.preset_id ?? null,
        exercises,
      })
      setLoading(false)
    }

    loadDayData()
  }, [dayId, router])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-[#888888]">Loading...</div>
      </div>
    )
  }

  if (!dayData) {
    return null
  }

  const user = getCurrentUser()
  if (!user) {
    return null
  }

  return (
    <WorkoutLogger
      dayId={dayId}
      dayLabel={dayData.dayLabel}
      planType={dayData.planType}
      presetId={dayData.presetId}
      exercises={dayData.exercises}
      userId={user.id}
    />
  )
}
