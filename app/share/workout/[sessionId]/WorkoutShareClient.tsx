'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { WorkoutSummary } from '@/app/api/share/workout/[sessionId]/route'
import WorkoutShareCard from '@/components/share/WorkoutShareCard'

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatVolume(volume: number): string {
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}k`
  return volume.toLocaleString()
}

function formatDuration(seconds: number): string {
  const totalMins = Math.floor(seconds / 60)
  if (totalMins < 60) return `${totalMins}m`
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return m > 0 ? `${h}hr ${m}m` : `${h}hr`
}

export default function WorkoutShareClient({ sessionId }: { sessionId: string }) {
  const [summary, setSummary] = useState<WorkoutSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetch(`/api/share/workout/${encodeURIComponent(sessionId)}`)
        if (!res.ok) {
          setError(res.status === 404 ? 'Workout not found' : 'Failed to load workout')
          setLoading(false)
          return
        }
        const data = await res.json()
        setSummary(data.summary)
      } catch {
        setError('Failed to load workout')
      } finally {
        setLoading(false)
      }
    }
    loadSummary()
  }, [sessionId])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const exitToHistory = (
    <Link
      href="/workout/history"
      className="fixed top-4 right-4 z-10 p-2 rounded-full text-red-500 hover:text-red-400 hover:bg-elevated transition-colors"
      aria-label="Back to workout history"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </Link>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {exitToHistory}
        <p className="text-muted">Loading workout...</p>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        {exitToHistory}
        <p className="text-red-400 text-lg mb-4">{error || 'Workout not found'}</p>
        <Link href="/" className="text-amber-400 hover:text-amber-300">Go to Home</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {exitToHistory}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2 tracking-tight">Workout Summary</h1>
          <p className="text-muted">
            <Link href={`/profile/${encodeURIComponent(summary.username)}`} className="text-amber-400 hover:text-amber-300 font-medium">
              {summary.username}
            </Link>
            {' '}completed this workout
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="p-6 border-b border-border bg-gradient-to-r from-amber-500/10 to-transparent">
            <h2 className="text-xl font-bold text-foreground">{summary.day_label}</h2>
            <p className="text-muted text-sm mt-1">{summary.template_name}</p>
            <p className="text-amber-400 mt-2">{formatDate(summary.workout_date)}</p>
          </div>

          <div className={`grid border-b border-border ${summary.duration_seconds != null ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <div className="p-4 text-center border-r border-border">
              <p className="text-2xl font-bold text-foreground">{summary.exercises.length}</p>
              <p className="text-muted text-xs">Exercises</p>
            </div>
            <div className="p-4 text-center border-r border-border">
              <p className="text-2xl font-bold text-foreground">{summary.total_sets}</p>
              <p className="text-muted text-xs">Total Sets</p>
            </div>
            <div className="p-4 text-center border-r border-border">
              <p className="text-2xl font-bold text-amber-400">{formatVolume(summary.total_volume)}</p>
              <p className="text-muted text-xs">Total Volume (lbs)</p>
            </div>
            {summary.duration_seconds != null && (
              <div className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{formatDuration(summary.duration_seconds)}</p>
                <p className="text-muted text-xs">Duration</p>
              </div>
            )}
          </div>

          <div className="p-4">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Exercises</h3>
            <div className="space-y-4">
              {summary.exercises.map((exercise, i) => (
                <div key={`${exercise.exercise_name}-${i}`} className="bg-elevated rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground">{exercise.exercise_name}</h4>
                    <div className="text-right">
                      <p className="text-xs text-muted">Heaviest Weight</p>
                      <span className="text-amber-400 font-semibold">{exercise.top_set_weight} lbs</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {exercise.sets.map((set, j) => (
                      <span key={j} className="text-sm px-2 py-1 rounded bg-amber-500/20 text-amber-300">
                        {set.weight} x {set.reps}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[#666666] mt-2">Volume: {exercise.total_volume.toLocaleString()} lbs</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-border space-y-3">
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full py-3 px-4 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Link Copied!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  Share This Workout
                </>
              )}
            </button>
            <WorkoutShareCard summary={summary} />
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-muted text-sm mb-2">Track your workouts with</p>
          <Link href="/" className="text-amber-400 hover:text-amber-300 font-semibold text-lg">Workout Planner</Link>
        </div>
      </div>
    </div>
  )
}
