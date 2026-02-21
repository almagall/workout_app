'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-simple'
import { getWorkoutSessions, getTemplateDay, getTemplates, deleteWorkoutSession } from '@/lib/storage'
import { exportWorkoutHistoryCSV } from '@/lib/export'
import type { WorkoutSession } from '@/types/workout'

export default function WorkoutHistoryPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [templateDays, setTemplateDays] = useState<Map<string, any>>(new Map())
  const [templates, setTemplates] = useState<any[]>([])
  const [exporting, setExporting] = useState(false)

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
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 animate-pulse">
            <div className="h-3 w-24 bg-white/[0.08] rounded mb-3" />
            <div className="h-5 w-40 bg-white/[0.08] rounded mb-2" />
            <div className="h-3 w-28 bg-white/[0.06] rounded" />
          </div>
        ))}
      </div>
    )
  }

  const sessionsByDate = sessions.reduce((acc, session) => {
    const date = session.workout_date
    if (!acc[date]) acc[date] = []
    acc[date].push(session)
    return acc
  }, {} as Record<string, WorkoutSession[]>)

  const ratingColor = (r: number) => {
    if (r >= 8) return 'bg-green-500/20 text-green-400 border-green-500/30'
    if (r >= 5) return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    return 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
            Workout History
          </h1>
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <button
              onClick={async () => {
                setExporting(true)
                try { await exportWorkoutHistoryCSV() } finally { setExporting(false) }
              }}
              disabled={exporting || sessions.length === 0}
              title="Export workout history as CSV"
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] text-muted hover:text-foreground hover:bg-white/[0.06] disabled:opacity-40 transition-colors text-sm font-medium"
            >
              {exporting ? (
                <svg className="w-4 h-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              <span className="whitespace-nowrap">Export Data</span>
            </button>
          </div>
        </div>
        <p className="text-sm text-muted">
          {sessions.length === 0 ? 'No workouts logged yet' : `${sessions.length} workout${sessions.length === 1 ? '' : 's'} logged`}
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm text-muted">Start logging workouts to see your history here.</p>
          <Link href="/workout/log" className="mt-4 inline-flex items-center gap-1.5 btn-primary text-sm font-semibold px-4 py-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Log Your First Workout
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(sessionsByDate)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([date, dateSessions]) => {
              const [year, month, day] = date.split('-').map(Number)
              const dateObj = new Date(year, month - 1, day)
              const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
              const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

              return (
                <div key={date}>
                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-2.5 px-0.5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-accent/70 leading-none mb-0.5">{weekday}</p>
                      <p className="text-sm font-medium text-muted">{shortDate}</p>
                    </div>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                    <span className="text-[10px] font-medium text-muted/50 uppercase tracking-wider">
                      {dateSessions.length} session{dateSessions.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Session cards */}
                  <div className="space-y-2">
                    {dateSessions.map((session) => {
                      const dayData = templateDays.get(session.template_day_id)
                      const template = dayData ? templates.find(t => t.id === dayData.template_id) : null
                      const rating = session.overall_performance_rating

                      return (
                        <div
                          key={session.id}
                          className="group rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.10] transition-all duration-200"
                        >
                          <Link href={`/workout/edit/${session.id}`} className="block p-4">
                            {/* Top row: name + rating */}
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <h3 className="text-base font-semibold text-foreground leading-snug">
                                {dayData?.day_label || 'Unknown Workout'}
                              </h3>
                              {rating != null && (
                                <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${ratingColor(rating)}`}>
                                  {rating}/10
                                </span>
                              )}
                            </div>

                            {/* Template name */}
                            {template && (
                              <p className="text-xs text-muted mb-1.5">{template.name}</p>
                            )}

                            {/* Tags */}
                            {session.note_tags && session.note_tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1.5">
                                {session.note_tags.map(tag => (
                                  <span key={tag} className="px-2 py-0.5 text-[10px] rounded-full bg-accent/10 text-accent-light border border-accent/20">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Session notes */}
                            {session.session_notes && (
                              <p className="text-xs text-muted/70 line-clamp-1 italic">{session.session_notes}</p>
                            )}
                          </Link>

                          {/* Action row */}
                          <div className="flex items-center justify-end gap-1.5 px-3 pb-3">
                            <Link
                              href={`/share/workout/${session.id}`}
                              title="Share"
                              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-amber-400 hover:bg-white/[0.06] transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                            </Link>
                            <Link
                              href={`/workout/edit/${session.id}`}
                              title="Edit"
                              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>
                            <button
                              onClick={(e) => handleDelete(session.id, e)}
                              disabled={deletingId === session.id}
                              title="Delete"
                              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              {deletingId === session.id ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
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
