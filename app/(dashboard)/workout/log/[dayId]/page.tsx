'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-simple'
import { getTemplateDay, getTemplateExercises, getTemplates, getDraftWorkoutSession, deleteWorkoutSession } from '@/lib/storage'
import WorkoutLogger from '@/components/workout/WorkoutLogger'
import DraftConflictModal from '@/components/workout/DraftConflictModal'
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
    exerciseFocus: (PlanType | null)[]
  } | null>(null)
  const [draftSessionId, setDraftSessionId] = useState<string | null>(null)
  const [showDraftConflict, setShowDraftConflict] = useState(false)
  const [conflictDraftDayLabel, setConflictDraftDayLabel] = useState<string>('')
  const [conflictDraftDayId, setConflictDraftDayId] = useState<string>('')

  useEffect(() => {
    async function loadDayData() {
      console.log('🔵 Log workout page loading', { dayId })
      
      const user = getCurrentUser()
      if (!user) {
        console.log('🔴 No user, redirecting to get-started')
        router.push('/get-started')
        return
      }

      console.log('✅ User authenticated:', user.id)

      // Check for existing draft workout
      console.log('🔍 Checking for existing draft workout...')
      const draft = await getDraftWorkoutSession()
      console.log('🔍 Draft check result:', draft)
      
      if (draft) {
        console.log('📝 Draft found:', { 
          id: draft.id, 
          template_day_id: draft.template_day_id, 
          workout_date: draft.workout_date,
          currentDayId: dayId,
          isMatchingDay: draft.template_day_id === dayId
        })
        
        if (draft.template_day_id === dayId) {
          // Draft is for the same day - can resume
          console.log('✅ Draft matches current day - will resume')
          setDraftSessionId(draft.id)
        } else {
          // Draft is for a different day - show conflict modal
          console.log('⚠️ Draft is for different day - showing conflict modal')
          const draftDay = await getTemplateDay(draft.template_day_id)
          setConflictDraftDayLabel(draftDay?.day_label || 'Unknown Day')
          setConflictDraftDayId(draft.template_day_id)
          setShowDraftConflict(true)
          setLoading(false)
          return
        }
      } else {
        console.log('ℹ️ No draft workout found - starting fresh')
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
      const exerciseFocus = exercisesData.map(ex => ex.focus ?? null)

      setDayData({
        dayLabel: day.day_label,
        planType: template.plan_type,
        presetId: template.preset_id ?? null,
        exercises,
        exerciseFocus,
      })
      
      console.log('✅ Day data loaded successfully', { 
        dayLabel: day.day_label, 
        exerciseCount: exercises.length,
        hasDraft: !!draftSessionId 
      })
      
      setLoading(false)
    }

    loadDayData()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draftSessionId is set inside effect, including it would cause redundant re-runs
  }, [dayId, router])

  const handleDiscardDraft = async () => {
    const draft = await getDraftWorkoutSession()
    if (draft) {
      await deleteWorkoutSession(draft.id)
      setShowDraftConflict(false)
      setDraftSessionId(null)
      // Reload the page data
      window.location.reload()
    }
  }

  const handleCloseDraftConflict = () => {
    router.push('/workout/log')
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-muted">Loading...</div>
      </div>
    )
  }

  // Show conflict modal if there's a draft for a different day
  if (showDraftConflict) {
    return (
      <DraftConflictModal
        draftDayLabel={conflictDraftDayLabel}
        draftDayId={conflictDraftDayId}
        onDiscard={handleDiscardDraft}
        onClose={handleCloseDraftConflict}
      />
    )
  }

  if (!dayData) {
    return null
  }

  const user = getCurrentUser()
  if (!user) {
    return null
  }

  console.log('🎯 Rendering WorkoutLogger with props:', { 
    dayId, 
    dayLabel: dayData.dayLabel, 
    draftSessionId,
    hasDraft: !!draftSessionId 
  })

  return (
    <WorkoutLogger
      dayId={dayId}
      dayLabel={dayData.dayLabel}
      planType={dayData.planType}
      presetId={dayData.presetId}
      exercises={dayData.exercises}
      exerciseFocus={dayData.exerciseFocus}
      userId={user.id}
      draftSessionId={draftSessionId || undefined}
    />
  )
}
