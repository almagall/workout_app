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

function StatRing({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center border ${accent ? 'border-accent/40 bg-accent/[0.08]' : 'border-white/[0.08] bg-white/[0.03]'}`}>
        <span className={`text-lg font-bold ${accent ? 'text-accent-light' : 'text-foreground'}`}>{value}</span>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted mt-2">{label}</p>
    </div>
  )
}

export default function WorkoutShareClient({ sessionId }: { sessionId: string }) {
  const [summary, setSummary] = useState<WorkoutSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const exitToHistory = (
    <Link
      href="/workout/history"
      className="fixed top-4 right-4 z-10 p-2 rounded-full text-muted hover:text-foreground hover:bg-white/[0.06] transition-colors backdrop-blur-sm"
      aria-label="Back to workout history"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </Link>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {exitToHistory}
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-muted text-sm">Loading workout...</p>
        </div>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        {exitToHistory}
        <p className="text-red-400 text-lg mb-4">{error || 'Workout not found'}</p>
        <Link href="/" className="text-accent-light hover:text-accent">Go to Home</Link>
      </div>
    )
  }

  const stats = [
    { value: String(summary.exercises.length), label: 'Exercises' },
    { value: String(summary.total_sets), label: 'Sets' },
    { value: `${formatVolume(summary.total_volume)}`, label: 'Volume (lbs)', accent: true },
    ...(summary.duration_seconds != null ? [{ value: formatDuration(summary.duration_seconds), label: 'Duration' }] : []),
  ]

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {exitToHistory}

      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 60% at 50% 0%, rgba(59,130,246,0.08), transparent 70%)' }} />

      <div className="relative max-w-xl mx-auto px-4 py-10">

        {/* Hero section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent/20 bg-accent/[0.06] mb-5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-[11px] font-medium text-accent-light uppercase tracking-wider">Workout Complete</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-3">
            {summary.day_label}
          </h1>
          <p className="text-muted text-sm">
            {summary.template_name}
          </p>
          <p className="text-accent-light/80 text-sm mt-1.5">
            {formatDate(summary.workout_date)}
          </p>
          <p className="mt-4">
            <Link href={`/profile/${encodeURIComponent(summary.username)}`} className="text-accent-light hover:text-accent font-semibold text-sm transition-colors">
              @{summary.username}
            </Link>
          </p>
        </div>

        {/* Stats rings */}
        <div className="flex justify-center gap-5 sm:gap-8 mb-10">
          {stats.map((s) => (
            <StatRing key={s.label} value={s.value} label={s.label} accent={s.accent} />
          ))}
        </div>

        {/* Main card */}
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(19,19,22,0.95), rgba(10,10,11,0.98))', boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.04)' }}>

          {/* Accent stripe */}
          <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #2563eb, #06b6d4, #2563eb)' }} />

          {/* Exercise list */}
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-0.5 h-4 rounded-full bg-accent/50" />
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Exercises</h3>
            </div>

            <div className="space-y-3">
              {summary.exercises.map((exercise, i) => (
                <div
                  key={`${exercise.exercise_name}-${i}`}
                  className="group rounded-xl p-4 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-bold text-accent/50 tabular-nums w-5 text-right flex-shrink-0">{i + 1}</span>
                      <h4 className="font-semibold text-foreground text-[15px] truncate">{exercise.exercise_name}</h4>
                    </div>
                    <div className="flex items-baseline gap-1 flex-shrink-0">
                      <span className="text-accent-light font-bold text-lg tabular-nums">{exercise.top_set_weight}</span>
                      <span className="text-[10px] text-muted">lbs</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 ml-[30px]">
                    {exercise.sets.map((set, j) => (
                      <span
                        key={j}
                        className="text-xs px-2.5 py-1 rounded-md font-medium tabular-nums bg-amber-500/15 text-amber-300 border border-amber-500/10"
                      >
                        {set.weight} &times; {set.reps}
                      </span>
                    ))}
                  </div>

                  <div className="ml-[30px] mt-2">
                    <span className="text-[10px] text-muted tabular-nums">{exercise.total_volume.toLocaleString()} lbs volume</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Share actions */}
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2">
            <WorkoutShareCard summary={summary} />
          </div>
        </div>

        {/* Footer branding */}
        <div className="text-center mt-10">
          <p className="text-[11px] uppercase tracking-widest text-muted/50 mb-2">Powered by</p>
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563eb, #06b6d4)' }}>
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="text-foreground/80 group-hover:text-foreground font-semibold text-sm transition-colors">Workout Planner</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
