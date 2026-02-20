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
import { FadeIn, StaggerChildren, StaggerItem } from '@/components/ui/motion'
import { setDeloadWeek } from '@/lib/deload-detection'
import { getNextWorkout, type NextWorkoutInfo } from '@/lib/next-workout'
import Link from 'next/link'

export default function DashboardPage() {
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTemplateDayId, setSelectedTemplateDayId] = useState<string | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<string>('')
  const [deloadSuggestion, setDeloadSuggestion] = useState<{ reason: string } | null>(null)
  const [deloadDismissed, setDeloadDismissed] = useState(false)
  const [planType, setPlanType] = useState<PlanType>('hypertrophy')
  const [nextWorkout, setNextWorkout] = useState<NextWorkoutInfo | null>(null)
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

      getNextWorkout().then(setNextWorkout)
    }
    checkAuthAndTemplates()
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8 flex items-center justify-between">
          <div className="h-8 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="h-9 w-28 bg-white/[0.04] rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-3 sm:gap-4 mb-6 sm:mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-1 min-w-[6.5rem] card-glass p-4 sm:p-5 animate-pulse">
              <div className="h-3 w-14 bg-white/[0.04] rounded mb-2" />
              <div className="h-6 w-10 bg-white/[0.04] rounded" />
            </div>
          ))}
        </div>
        <div className="card-glass h-[72px] animate-pulse mb-6 sm:mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="lg:col-span-2 card-glass h-[340px] animate-pulse" />
          <div className="card-glass h-[340px] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="card-glass h-[240px] animate-pulse" />
          <div className="card-glass h-[240px] animate-pulse" />
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {greeting}, {user.username}
          </h1>
          <Link
            href={nextWorkout ? `/workout/log/${nextWorkout.templateDayId}` : '/workout/log'}
            className="btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2"
          >
            {nextWorkout ? `Start ${nextWorkout.dayLabel}` : 'Log Workout'}
          </Link>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="mb-6 sm:mb-8">
          <PerformanceMetrics />
        </div>
      </FadeIn>

      {deloadSuggestion && !deloadDismissed && (
        <FadeIn delay={0.1}>
          <div className="mb-6 sm:mb-8 card-glass card-accent-top p-4 sm:p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div
              className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.06), transparent 70%)' }}
            />
            <div className="relative flex-1 min-w-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-1 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-amber-400/40 flex-shrink-0" />Deload Suggestion</h3>
              <p className="text-sm text-secondary line-clamp-2 sm:line-clamp-none">{deloadSuggestion.reason}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleStartDeloadWeek}
                className="btn-primary px-3 py-1.5 text-xs sm:text-sm font-medium"
              >
                Start deload week
              </button>
              <button
                onClick={handleDismissDeload}
                className="p-1.5 rounded text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </FadeIn>
      )}

      <StaggerChildren staggerDelay={0.07} className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 lg:items-start">
        <StaggerItem className="flex flex-col gap-4">
          <WeeklySummaryCard />
          <PRCelebration />
        </StaggerItem>
        <StaggerItem className="lg:col-span-2">
          <StrengthStandards />
        </StaggerItem>
      </StaggerChildren>

      <StaggerChildren staggerDelay={0.07} className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <StaggerItem className="lg:col-span-2">
          <div className="card-glass card-accent-top relative">
            <div
              className="absolute top-0 left-0 w-48 h-48 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 0% 0%, rgba(59,130,246,0.04), transparent 70%)' }}
            />
            <div className="relative p-4 sm:p-6 border-b border-white/[0.06] bg-white/[0.015]">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 sm:mb-4 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Progress Over Time</h2>
              <ProgressSelectors
                selectedTemplateDayId={selectedTemplateDayId}
                onTemplateDayChange={setSelectedTemplateDayId}
                selectedExercise={selectedExercise}
                onExerciseChange={setSelectedExercise}
                embedded
              />
            </div>
            <div className="p-4 sm:p-6 min-h-[220px] sm:min-h-0">
              <ProgressChart
                selectedTemplateDayId={selectedTemplateDayId}
                selectedExercise={selectedExercise}
              />
            </div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <WorkoutCalendar />
        </StaggerItem>
      </StaggerChildren>

      <section>
        <StaggerChildren staggerDelay={0.07} className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <StaggerItem className="flex flex-col gap-4 sm:gap-6">
            <ConsistencyScore />
            <WeeklyVolumeChart />
          </StaggerItem>
          <StaggerItem>
            <MuscleBalanceWidget />
          </StaggerItem>
        </StaggerChildren>

        <div className={`${showAllAnalytics ? 'block' : 'hidden'} lg:block`}>
          <StaggerChildren staggerDelay={0.07} className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <StaggerItem className="lg:col-span-2">
              <ExerciseSparklines />
            </StaggerItem>
            <StaggerItem className="flex flex-col gap-4 sm:gap-6">
              <RecentPRs />
              <FatigueMonitor planType={planType} />
              <ProgressionMomentum />
            </StaggerItem>
          </StaggerChildren>
        </div>

        {!showAllAnalytics && (
          <button
            type="button"
            onClick={() => setShowAllAnalytics(true)}
            className="lg:hidden w-full mt-4 btn-secondary px-4 py-2.5 text-sm rounded-xl"
          >
            Show more analytics
          </button>
        )}
      </section>
    </div>
  )
}
