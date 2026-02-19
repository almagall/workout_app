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
        <div className="text-muted">Loading...</div>
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
        <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">Workout History</h1>
        <Link
          href="/workout/log"
          className="btn-primary"
        >
          Log New Workout
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="card-glass card-accent-top relative p-6">
          <div className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }} />
          <p className="text-secondary text-center">
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
                <div key={date} className="card-glass card-accent-top relative p-6">
                  <div className="absolute -top-10 -left-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }} />
                  <h2 className="text-xl font-semibold text-foreground mb-4">{formattedDate}</h2>
                  <div className="space-y-3">
                    {dateSessions.map((session) => {
                      const day = templateDays.get(session.template_day_id)
                      const template = day ? templates.find(t => t.id === day.template_id) : null

                      return (
                        <div
                          key={session.id}
                          className="bg-white/[0.025] rounded-xl p-4 hover:bg-white/[0.04] transition-all duration-200 border border-white/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                        >
                          <div className="flex justify-between items-center">
                            <Link
                              href={`/workout/edit/${session.id}`}
                              className="flex-1"
                            >
                              <div>
                                <h3 className="text-lg font-semibold text-foreground">
                                  {day?.day_label || 'Unknown Workout'}
                                </h3>
                                {template && (
                                  <p className="text-sm text-muted">{template.name}</p>
                                )}
                              </div>
                            </Link>
                            <div className="flex items-center gap-2">
                              {session.overall_performance_rating != null && (
                                <p className="text-foreground font-semibold mr-2">
                                  Rating: {session.overall_performance_rating}/10
                                </p>
                              )}
                              <Link
                                href={`/share/workout/${session.id}`}
                                className="p-2 text-muted hover:text-amber-400 hover:bg-white/[0.04] rounded-md transition-colors"
                                title="Share"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                              </Link>
                              <Link
                                href={`/workout/edit/${session.id}`}
                                className="btn-primary text-sm"
                              >
                                Edit
                              </Link>
                              <button
                                onClick={(e) => handleDelete(session.id, e)}
                                disabled={deletingId === session.id}
                                className="px-3 py-1.5 bg-red-600 text-foreground rounded-md hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
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
