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
import ProgressionMomentum from '@/components/dashboard/ProgressionMomentum'
import ConsistencyScore from '@/components/dashboard/ConsistencyScore'
import ExerciseSparklines from '@/components/dashboard/ExerciseSparklines'
import StrengthStandards from '@/components/dashboard/StrengthStandards'
import MuscleBalanceWidget from '@/components/dashboard/MuscleBalanceWidget'
import FatigueMonitor from '@/components/dashboard/FatigueMonitor'
import WeeklyVolumeChart from '@/components/dashboard/WeeklyVolumeChart'
import WeeklySummaryCard from '@/components/dashboard/WeeklySummaryCard'
import PRCelebration from '@/components/dashboard/PRCelebration'
import { setDeloadWeek } from '@/lib/deload-detection'
import { getNextWorkout } from '@/lib/next-workout'
import Link from 'next/link'

export default function DashboardPage() {
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTemplateDayId, setSelectedTemplateDayId] = useState<string | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<string>('')
  const [deloadSuggestion, setDeloadSuggestion] = useState<{ reason: string } | null>(null)
  const [deloadDismissed, setDeloadDismissed] = useState(false)
  const [planType, setPlanType] = useState<PlanType>('hypertrophy')
  const [nextDayLabel, setNextDayLabel] = useState<string | null>(null)
  const [showAllAnalytics, setShowAllAnalytics] = useState(false)

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

      getNextWorkout().then(nw => {
        if (nw) setNextDayLabel(nw.dayLabel)
      })
    }
    checkAuthAndTemplates()
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Skeleton: greeting */}
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <div className="h-8 w-48 bg-elevated rounded-lg animate-pulse" />
          <div className="h-9 w-28 bg-elevated rounded-lg animate-pulse" />
        </div>
        {/* Skeleton: weekly summary */}
        <div className="bg-card rounded-xl border border-border h-[80px] animate-pulse mb-4 sm:mb-6" />
        {/* Skeleton: stats strip */}
        <div className="flex gap-2 sm:gap-3 mb-4 sm:mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-1 min-w-[6.5rem] bg-card rounded-xl border border-border p-3 sm:p-4 animate-pulse">
              <div className="h-3 w-14 bg-elevated rounded mb-2" />
              <div className="h-6 w-10 bg-elevated rounded" />
            </div>
          ))}
        </div>
        {/* Skeleton: next workout */}
        <div className="bg-card rounded-xl border border-border h-[72px] animate-pulse mb-4 sm:mb-6" />
        {/* Skeleton: strength standards */}
        <div className="bg-card rounded-xl border border-border h-[160px] animate-pulse mb-4 sm:mb-6" />
        {/* Skeleton: chart + calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6">
          <div className="lg:col-span-2 bg-card rounded-xl border border-border h-[340px] animate-pulse" />
          <div className="bg-card rounded-xl border border-border h-[340px] animate-pulse" />
        </div>
        {/* Skeleton: analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
          <div className="bg-card rounded-xl border border-border h-[240px] animate-pulse" />
          <div className="bg-card rounded-xl border border-border h-[240px] animate-pulse" />
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

  const greetingHour = new Date().getHours()
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header: personalized greeting + CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="font-display text-xl sm:text-3xl font-semibold text-foreground tracking-tight">
          {greeting}, {user.username}
        </h1>
        <Link
          href="/workout/log"
          className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-[#e5e5e5] transition-colors"
        >
          {nextDayLabel ? `Start ${nextDayLabel}` : 'Log Workout'}
        </Link>
      </div>

      {/* Stats strip */}
      <div className="mb-4 sm:mb-6">
        <PerformanceMetrics />
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

      {/* Weekly Summary + Strength Standards side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6 lg:items-start">
        <div className="flex flex-col gap-3">
          <WeeklySummaryCard />
          <PRCelebration />
        </div>
        <div className="lg:col-span-2">
          <StrengthStandards />
        </div>
      </div>

      {/* Progress Chart + Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6">
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card transition-shadow duration-200 hover:shadow-card-hover">
            <div className="p-3 sm:p-6 border-b border-border">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-foreground">Progress Over Time</h2>
              <ProgressSelectors
                selectedTemplateDayId={selectedTemplateDayId}
                onTemplateDayChange={setSelectedTemplateDayId}
                selectedExercise={selectedExercise}
                onExerciseChange={setSelectedExercise}
                embedded
              />
            </div>
            <div className="p-3 sm:p-6 min-h-[220px] sm:min-h-0">
              <ProgressChart
                selectedTemplateDayId={selectedTemplateDayId}
                selectedExercise={selectedExercise}
              />
            </div>
          </div>
        </div>
        <div>
          <WorkoutCalendar />
        </div>
      </div>

      {/* Analytics Section -- collapsible on mobile */}
      <section className="mb-4 sm:mb-6">
        {/* Always visible: Consistency + Volume | Muscle Balance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 mb-3 sm:mb-6">
          <div className="flex flex-col gap-3 sm:gap-6">
            <ConsistencyScore />
            <WeeklyVolumeChart />
          </div>
          <MuscleBalanceWidget />
        </div>

        {/* Collapsible on mobile, always visible on desktop */}
        <div className={`${showAllAnalytics ? 'block' : 'hidden'} lg:block`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
            <div className="lg:col-span-2">
              <ExerciseSparklines />
            </div>
            <div className="flex flex-col gap-3 sm:gap-6">
              <RecentPRs />
              <FatigueMonitor planType={planType} />
              <ProgressionMomentum />
            </div>
          </div>
        </div>

        {/* Mobile-only toggle */}
        {!showAllAnalytics && (
          <button
            type="button"
            onClick={() => setShowAllAnalytics(true)}
            className="lg:hidden w-full mt-3 px-4 py-2.5 text-sm font-medium text-muted bg-elevated border border-border rounded-xl hover:text-foreground hover:bg-card transition-colors"
          >
            Show more analytics
          </button>
        )}
      </section>
    </div>
  )
}
