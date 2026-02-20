'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { WorkoutSummary } from '@/app/api/share/workout/[sessionId]/route'
import WorkoutShareCard from '@/components/share/WorkoutShareCard'
import { estimated1RM } from '@/lib/estimated-1rm'

function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
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
  const summaryRef = useRef<HTMLDivElement>(null)

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
    { value: String(summary.exercises.length), label: 'Ex' },
    { value: String(summary.total_sets), label: 'Sets' },
    { value: formatVolume(summary.total_volume), label: 'Vol' },
    ...(summary.duration_seconds != null ? [{ value: formatDuration(summary.duration_seconds), label: 'Dur' }] : []),
  ]

  const exercisesToShow = summary.exercises

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center py-6 px-4">
      {exitToHistory}

      {/* Story card — only this is captured (ref) */}
      <div
        ref={summaryRef}
        className="relative w-full max-w-[360px] overflow-hidden flex flex-col bg-[#0a0a0b] rounded-2xl border border-white/[0.06]"
        style={{
          aspectRatio: '9/16',
          boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
        }}
      >
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(59,130,246,0.14), transparent 70%)' }} />

        <div className="relative flex flex-col flex-1 min-h-0 p-4">
          {/* Hero — compact */}
          <div className="text-center flex-shrink-0 mb-3">
            <h1 className="font-display text-xl font-bold text-foreground tracking-tight leading-tight">
              Workout Summary
            </h1>
            <p className="text-sm text-foreground/90 mt-1">
              {summary.day_label}
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              {formatDateShort(summary.workout_date)} · @{summary.username}
            </p>
          </div>

          {/* Stats — single row compact */}
          <div className="flex justify-center gap-2 flex-shrink-0 mb-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className={`flex flex-col items-center justify-center min-w-[52px] py-1.5 px-2 rounded-lg border ${
                  s.accent ? 'border-accent/30 bg-accent/[0.08]' : 'border-white/[0.08] bg-white/[0.03]'
                }`}
              >
                <span className={`text-sm font-bold tabular-nums leading-none ${s.accent ? 'text-accent-light' : 'text-foreground'}`}>
                  {s.value}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-muted mt-1">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Accent stripe */}
          <div className="h-[2px] flex-shrink-0 rounded-full mb-3" style={{ background: 'linear-gradient(90deg, #2563eb, #06b6d4, #2563eb)' }} />

          {/* Exercises — scrollable to fit as many as possible */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-1">
              {exercisesToShow.map((exercise, i) => {
                const heaviestSet = exercise.sets.length
                  ? exercise.sets.reduce((best, set) => (set.weight > best.weight ? set : best), exercise.sets[0])
                  : null
                const maxE1RM = exercise.sets.length
                  ? Math.max(...exercise.sets.map((s) => estimated1RM(s.weight, s.reps)))
                  : 0
                const setTags = exercise.sets
                  .filter((s) => s.weight > 0 || s.reps > 0)
                  .map((s) => `${s.weight}×${s.reps}`)
                  .join(', ')
                return (
                  <div
                    key={`${exercise.exercise_name}-${i}`}
                    className="rounded-lg px-2.5 py-1 flex flex-col gap-0.5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-foreground text-xs truncate min-w-0">{exercise.exercise_name}</h4>
                      <div className="flex items-center gap-2 flex-shrink-0 text-right">
                        <span>
                          <span className="text-[10px] text-foreground font-medium">Heaviest </span>
                          <span className="text-[10px] text-accent-light font-medium tabular-nums">
                            {heaviestSet ? String(heaviestSet.weight) : '—'}
                          </span>
                        </span>
                        <span>
                          <span className="text-[10px] text-foreground font-medium">e1RM </span>
                          <span className="text-[10px] text-accent-light font-medium tabular-nums">
                            {maxE1RM > 0 ? String(Math.round(maxE1RM)) : '—'}
                          </span>
                        </span>
                      </div>
                    </div>
                    {setTags && (
                      <p className="text-[10px] text-muted tabular-nums truncate">{setTags}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer — inside card for capture */}
          <div className="flex-shrink-0 pt-3 mt-auto text-center border-t border-white/[0.04]">
            <p className="text-[9px] uppercase tracking-widest text-muted/60">Powered by</p>
            <div className="inline-flex items-center gap-1.5 mt-0.5">
              <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563eb, #06b6d4)' }}>
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <span className="text-foreground/70 font-semibold text-[10px]">Workout Planner</span>
            </div>
          </div>
        </div>
      </div>

      {/* Share actions — outside capture */}
      <div className="w-full max-w-[360px] mt-4 px-2">
        <WorkoutShareCard summary={summary} contentRef={summaryRef} />
      </div>
    </div>
  )
}
