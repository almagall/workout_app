'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import { getTemplates } from '@/lib/storage'
import { getDeloadSuggestion, isDeloadBannerDismissed, dismissDeloadBanner } from '@/lib/deload-detection'
import type { PlanType } from '@/types/workout'
import ProgressChart from '@/components/dashboard/ProgressChart'
import ProgressSelectors from '@/components/dashboard/ProgressSelectors'
import PerformanceMetrics from '@/components/dashboard/PerformanceMetrics'
import WorkoutCalendar from '@/components/dashboard/WorkoutCalendar'
import RecentPRs from '@/components/dashboard/RecentPRs'
import { FriendActivityFeed } from '@/components/dashboard/FriendActivityFeed'
import ProgressionMomentum from '@/components/dashboard/ProgressionMomentum'
import ConsistencyScore from '@/components/dashboard/ConsistencyScore'
import ExerciseSparklines from '@/components/dashboard/ExerciseSparklines'
import StrengthStandards from '@/components/dashboard/StrengthStandards'
import MuscleBalanceWidget from '@/components/dashboard/MuscleBalanceWidget'
import FatigueMonitor from '@/components/dashboard/FatigueMonitor'
import { setDeloadWeek } from '@/lib/deload-detection'

export default function DashboardPage() {
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTemplateDayId, setSelectedTemplateDayId] = useState<string | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<string>('')
  const [deloadSuggestion, setDeloadSuggestion] = useState<{ reason: string } | null>(null)
  const [deloadDismissed, setDeloadDismissed] = useState(false)
  const [planType, setPlanType] = useState<PlanType>('hypertrophy')

  useEffect(() => {
    async function checkAuthAndTemplates() {
      const currentUser = getCurrentUser()
      if (!currentUser) {
        window.location.href = '/get-started'
        return
      }

      const templates = await getTemplates()
      if (templates.length === 0) {
        window.location.href = '/workout/template/create'
        return
      }

      setUser(currentUser)
      setPlanType((templates[0]?.plan_type as PlanType) ?? 'hypertrophy')

      if (!isDeloadBannerDismissed()) {
        const planType = templates[0]?.plan_type ?? 'hypertrophy'
        const suggestion = await getDeloadSuggestion(planType as PlanType)
        if (suggestion?.shouldDeload) {
          setDeloadSuggestion({ reason: suggestion.reason })
        }
      }
      setLoading(false)
    }
    checkAuthAndTemplates()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-[#888888]">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleDismissDeload = () => {
    dismissDeloadBanner()
    setDeloadDismissed(true)
    setDeloadSuggestion(null)
  }

  const handleStartDeloadWeek = () => {
    if (!user) return
    const today = new Date()
    const day = today.getDay()
    const daysToSunday = day === 0 ? 0 : 7 - day
    const endOfWeek = new Date(today)
    endOfWeek.setDate(endOfWeek.getDate() + daysToSunday)
    const until = endOfWeek.toISOString().split('T')[0]
    setDeloadWeek(user.id, until)
    setDeloadDismissed(true)
    setDeloadSuggestion(null)
    window.dispatchEvent(new CustomEvent('deload-started'))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Workout Dashboard</h1>
      </div>

      {deloadSuggestion && !deloadDismissed && (
        <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-amber-400 mb-1">Deload suggestion</h3>
            <p className="text-sm text-[#cccccc]">{deloadSuggestion.reason}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleStartDeloadWeek}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-amber-600/30 text-amber-300 border border-amber-500/50 hover:bg-amber-600/40 transition-colors"
            >
              Start deload week
            </button>
            <button
              onClick={handleDismissDeload}
              className="p-1.5 rounded text-[#888888] hover:text-white hover:bg-[#2a2a2a] transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Row 1: Progress Chart + Calendar - equal height on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 lg:items-stretch">
        <div className="lg:col-span-2 lg:min-h-0">
          <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] overflow-hidden h-full flex flex-col">
            <div className="p-4 sm:p-6 border-b border-[#2a2a2a] flex-shrink-0">
              <h2 className="text-xl font-semibold mb-4 text-white">Progress Over Time</h2>
              <ProgressSelectors
                selectedTemplateDayId={selectedTemplateDayId}
                onTemplateDayChange={setSelectedTemplateDayId}
                selectedExercise={selectedExercise}
                onExerciseChange={setSelectedExercise}
                embedded
              />
            </div>
            <div className="p-4 sm:p-6 flex-1 min-h-0">
              <ProgressChart
                selectedTemplateDayId={selectedTemplateDayId}
                selectedExercise={selectedExercise}
              />
            </div>
          </div>
        </div>
        <div className="lg:h-full flex flex-col gap-4 sm:gap-6 min-h-0">
          <div className="flex-1 min-h-0 [&>div]:h-full">
            <WorkoutCalendar />
          </div>
          <div className="flex-shrink-0">
            <RecentPRs />
          </div>
        </div>
      </div>

      {/* Row 2: New Advanced Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <ProgressionMomentum />
        <ConsistencyScore />
        <MuscleBalanceWidget />
        <FatigueMonitor planType={planType} />
        <div className="lg:col-span-3">
          <StrengthStandards />
        </div>
      </div>

      {/* Row 3: Exercise Sparklines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="lg:col-span-2">
          <ExerciseSparklines />
        </div>
      </div>

      {/* Row 4: Existing Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <PerformanceMetrics />
        <FriendActivityFeed />
      </div>
    </div>
  )
}
