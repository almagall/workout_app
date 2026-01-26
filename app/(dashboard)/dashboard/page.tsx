'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-simple'
import ProgressChart from '@/components/dashboard/ProgressChart'
import ExerciseSelector from '@/components/dashboard/ExerciseSelector'
import PerformanceMetrics from '@/components/dashboard/PerformanceMetrics'

export default function DashboardPage() {
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      window.location.href = '/get-started'
      return
    }

    const settings = localStorage.getItem(`workout_settings_${currentUser.id}`)
    if (!settings) {
      window.location.href = '/onboarding'
      return
    }

    setUser(currentUser)
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-100">Workout Dashboard</h1>
        <Link
          href="/workout/history"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500"
        >
          View History
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <ExerciseSelector />
          <div className="mt-6 bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
            <h2 className="text-xl font-semibold mb-4 text-slate-100">Progress Over Time</h2>
            <ProgressChart />
          </div>
        </div>
        <div>
          <PerformanceMetrics />
        </div>
      </div>
    </div>
  )
}
