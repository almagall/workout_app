'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import { getTemplates } from '@/lib/storage'
import ProgressChart from '@/components/dashboard/ProgressChart'
import ProgressSelectors from '@/components/dashboard/ProgressSelectors'
import PerformanceMetrics from '@/components/dashboard/PerformanceMetrics'
import WorkoutCalendar from '@/components/dashboard/WorkoutCalendar'
import RecentPRs from '@/components/dashboard/RecentPRs'
import { FriendActivityFeed } from '@/components/dashboard/FriendActivityFeed'

export default function DashboardPage() {
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTemplateDayId, setSelectedTemplateDayId] = useState<string | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<string>('')

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Workout Dashboard</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="lg:col-span-2">
          <ProgressSelectors
            selectedTemplateDayId={selectedTemplateDayId}
            onTemplateDayChange={setSelectedTemplateDayId}
            selectedExercise={selectedExercise}
            onExerciseChange={setSelectedExercise}
          />
          <div className="mt-4 sm:mt-6 bg-[#111111] rounded-lg border border-[#2a2a2a] p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Progress Over Time</h2>
            <ProgressChart
              selectedTemplateDayId={selectedTemplateDayId}
              selectedExercise={selectedExercise}
            />
          </div>
        </div>
        <div className="space-y-6">
          <WorkoutCalendar />
          <RecentPRs />
          <FriendActivityFeed />
          <PerformanceMetrics />
        </div>
      </div>
    </div>
  )
}
