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
  const [insightsExpanded, setInsightsExpanded] = useState(false)

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted">Loading...</p>
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
      <div className="mb-3 sm:mb-8">
        <h1 className="font-display text-xl sm:text-3xl font-semibold text-foreground tracking-tight">Workout Dashboard</h1>
      </div>

      {deloadSuggestion && !deloadDismissed && (
        <div className="mb-4 sm:mb-6 rounded-xl border border-accent/30 bg-accent/5 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 shadow-card">
          <div className="flex-1 min-w-0">
            <h3 className="text-xs sm:text-sm font-medium text-accent mb-0.5 sm:mb-1">Deload suggestion</h3>
            <p className="text-xs sm:text-sm text-secondary line-clamp-2 sm:line-clamp-none">{deloadSuggestion.reason}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleStartDeloadWeek}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-accent/20 text-accent border border-accent/40 hover:bg-accent/30 hover:shadow-glow transition-all duration-200"
            >
              Start deload week
            </button>
            <button
              onClick={handleDismissDeload}
              className="p-1.5 rounded text-muted hover:text-foreground hover:bg-elevated transition-colors"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-8 lg:items-stretch">
        <div className="lg:col-span-2 lg:min-h-0">
          <div className="bg-card rounded-xl border border-border overflow-hidden h-full flex flex-col shadow-card transition-shadow duration-200 hover:shadow-card-hover">
            <div className="p-3 sm:p-6 border-b border-border flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-foreground">Progress Over Time</h2>
              <ProgressSelectors
                selectedTemplateDayId={selectedTemplateDayId}
                onTemplateDayChange={setSelectedTemplateDayId}
                selectedExercise={selectedExercise}
                onExerciseChange={setSelectedExercise}
                embedded
              />
            </div>
            <div className="p-3 sm:p-6 flex-1 min-h-[280px] sm:min-h-0 flex flex-col">
              <ProgressChart
                selectedTemplateDayId={selectedTemplateDayId}
                selectedExercise={selectedExercise}
              />
            </div>
          </div>
        </div>
        <div className="lg:h-full flex flex-col gap-3 sm:gap-6 min-h-0">
          <div className="flex-1 min-h-0 [&>div]:h-full">
            <WorkoutCalendar />
          </div>
          <div className="flex-shrink-0">
            <RecentPRs />
          </div>
        </div>
      </div>

      {/* Insights: collapsible on mobile, always visible on desktop */}
      <section className="mb-4 sm:mb-8">
        <button
          type="button"
          onClick={() => setInsightsExpanded((e) => !e)}
          className="lg:hidden w-full flex items-center justify-between gap-2 py-3 px-0 text-left border-b border-border"
          aria-expanded={insightsExpanded}
        >
          <h2 className="font-display text-lg font-semibold text-foreground tracking-tight">Insights</h2>
          <span className="text-sm text-muted">{insightsExpanded ? 'Hide' : 'Show insights'}</span>
          <svg className={`w-5 h-5 text-muted shrink-0 transition-transform ${insightsExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <h2 className="hidden lg:block font-display text-lg font-semibold text-foreground mb-4 tracking-tight">Insights</h2>
        {/* One grid: on mobile visible when expanded; on desktop always visible */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 mt-4 ${!insightsExpanded ? 'hidden lg:grid' : ''}`}>
          <ProgressionMomentum />
          <ConsistencyScore />
          <MuscleBalanceWidget />
          <FatigueMonitor planType={planType} />
          <div className="lg:col-span-3">
            <StrengthStandards />
          </div>
        </div>
      </section>

      {/* Row 3: Exercise Sparklines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-8">
        <div className="lg:col-span-2">
          <ExerciseSparklines />
        </div>
      </div>

      {/* Row 4: Existing Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-8">
        <PerformanceMetrics />
        <FriendActivityFeed />
      </div>
    </div>
  )
}
