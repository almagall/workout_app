'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-simple'
import { getWorkoutSessions, getTemplateDay, getTemplates, deleteWorkoutSession } from '@/lib/storage'
import type { WorkoutSession } from '@/types/workout'

export default function WorkoutHistoryPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [templateDays, setTemplateDays] = useState<Map<string, any>>(new Map())
  const [templates, setTemplates] = useState<any[]>([])

  useEffect(() => {
    async function loadSessions() {
      const user = getCurrentUser()
      if (!user) {
        window.location.href = '/get-started'
        return
      }

      const [allSessions, allTemplates] = await Promise.all([
        getWorkoutSessions(),
        getTemplates()
      ])
      
      allSessions.sort((a, b) => new Date(b.workout_date).getTime() - new Date(a.workout_date).getTime())

      // Load template days for all sessions
      const dayIds = [...new Set(allSessions.map(s => s.template_day_id))]
      const daysMap = new Map()
      await Promise.all(
        dayIds.map(async (dayId) => {
          const day = await getTemplateDay(dayId)
          if (day) daysMap.set(dayId, day)
        })
      )

      setSessions(allSessions)
      setTemplateDays(daysMap)
      setTemplates(allTemplates)
      setLoading(false)
    }

    loadSessions()
  }, [])

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (window.confirm('Are you sure you want to delete this workout? This action cannot be undone.')) {
      setDeletingId(sessionId)
      try {
        await deleteWorkoutSession(sessionId)
        // Refresh the sessions list
        const user = getCurrentUser()
        if (user) {
          const allSessions = await getWorkoutSessions()
          allSessions.sort((a, b) => new Date(b.workout_date).getTime() - new Date(a.workout_date).getTime())
          setSessions(allSessions)
        }
      } catch (error) {
        console.error('Error deleting workout:', error)
        alert('Failed to delete workout. Please try again.')
      } finally {
        setDeletingId(null)
      }
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-[#888888]">Loading...</div>
      </div>
    )
  }

  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc, session) => {
    const date = session.workout_date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(session)
    return acc
  }, {} as Record<string, WorkoutSession[]>)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Workout History</h1>
        <Link
          href="/workout/log"
          className="px-4 py-2 bg-white text-black rounded-md hover:bg-[#e5e5e5] transition-colors font-medium"
        >
          Log New Workout
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
          <p className="text-[#a1a1a1] text-center">
            No workouts logged yet. Start logging workouts to see your history!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(sessionsByDate)
            .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
            .map(([date, dateSessions]) => {
              const [year, month, day] = date.split('-').map(Number)
              const dateObj = new Date(year, month - 1, day)
              const formattedDate = dateObj.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })

              return (
                <div key={date} className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">{formattedDate}</h2>
                  <div className="space-y-3">
                    {dateSessions.map((session) => {
                      const day = templateDays.get(session.template_day_id)
                      const template = day ? templates.find(t => t.id === day.template_id) : null

                      return (
                        <div
                          key={session.id}
                          className="bg-[#1a1a1a] rounded-lg p-4 hover:bg-[#222222] transition-colors border border-[#2a2a2a]"
                        >
                          <div className="flex justify-between items-center">
                            <Link
                              href={`/workout/edit/${session.id}`}
                              className="flex-1"
                            >
                              <div>
                                <h3 className="text-lg font-semibold text-white">
                                  {day?.day_label || 'Unknown Workout'}
                                </h3>
                                {template && (
                                  <p className="text-sm text-[#888888]">{template.name}</p>
                                )}
                              </div>
                            </Link>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                {session.overall_performance_rating && (
                                  <p className="text-white font-semibold">
                                    {session.overall_performance_rating}/10
                                  </p>
                                )}
                                <Link
                                  href={`/workout/edit/${session.id}`}
                                  className="text-sm text-[#888888] hover:text-white transition-colors"
                                >
                                  Edit →
                                </Link>
                              </div>
                              <button
                                onClick={(e) => handleDelete(session.id, e)}
                                disabled={deletingId === session.id}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                              >
                                {deletingId === session.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
