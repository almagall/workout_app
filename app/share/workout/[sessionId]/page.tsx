'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import type { WorkoutSummary } from '@/app/api/share/workout/[sessionId]/route'

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
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k`
  }
  return volume.toLocaleString()
}

export default function ShareWorkoutPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const [summary, setSummary] = useState<WorkoutSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetch(`/api/share/workout/${encodeURIComponent(sessionId)}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError('Workout not found')
          } else {
            setError('Failed to load workout')
          }
          setLoading(false)
          return
        }
        const data = await res.json()
        setSummary(data.summary)
      } catch (e) {
        setError('Failed to load workout')
        console.error(e)
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
    } catch (e) {
      console.error('Failed to copy', e)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-[#888888]">Loading workout...</p>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4">
        <p className="text-red-400 text-lg mb-4">{error || 'Workout not found'}</p>
        <Link href="/" className="text-amber-400 hover:text-amber-300">
          Go to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Workout Summary</h1>
          <p className="text-[#888888]">
            <Link
              href={`/profile/${encodeURIComponent(summary.username)}`}
              className="text-amber-400 hover:text-amber-300 font-medium"
            >
              {summary.username}
            </Link>
            {' '}completed this workout
          </p>
        </div>

        {/* Summary Card */}
        <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden">
          {/* Workout Info */}
          <div className="p-6 border-b border-[#2a2a2a] bg-gradient-to-r from-amber-500/10 to-transparent">
            <h2 className="text-xl font-bold text-white">{summary.day_label}</h2>
            <p className="text-[#888888] text-sm mt-1">{summary.template_name}</p>
            <p className="text-amber-400 mt-2">{formatDate(summary.workout_date)}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 border-b border-[#2a2a2a]">
            <div className="p-4 text-center border-r border-[#2a2a2a]">
              <p className="text-2xl font-bold text-white">{summary.exercises.length}</p>
              <p className="text-[#888888] text-xs">Exercises</p>
            </div>
            <div className="p-4 text-center border-r border-[#2a2a2a]">
              <p className="text-2xl font-bold text-white">{summary.total_sets}</p>
              <p className="text-[#888888] text-xs">Total Sets</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{formatVolume(summary.total_volume)}</p>
              <p className="text-[#888888] text-xs">Total Volume (lbs)</p>
            </div>
          </div>

          {/* Exercises */}
          <div className="p-4">
            <h3 className="text-sm font-semibold text-[#888888] uppercase tracking-wider mb-3">
              Exercises
            </h3>
            <div className="space-y-4">
              {summary.exercises.map((exercise, i) => (
                <div
                  key={`${exercise.exercise_name}-${i}`}
                  className="bg-[#111111] rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white">{exercise.exercise_name}</h4>
                    <span className="text-amber-400 font-semibold">{exercise.top_set_weight} lbs</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {exercise.sets.map((set, j) => (
                      <span
                        key={j}
                        className={`text-sm px-2 py-1 rounded ${
                          set.set_type === 'warmup'
                            ? 'bg-[#2a2a2a] text-[#888888]'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {set.weight} x {set.reps}
                        {set.set_type === 'warmup' && ' (W)'}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[#666666] mt-2">
                    Volume: {exercise.total_volume.toLocaleString()} lbs
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Share Button */}
          <div className="p-4 border-t border-[#2a2a2a]">
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full py-3 px-4 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Link Copied!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share This Workout
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-[#888888] text-sm mb-2">Track your workouts with</p>
          <Link href="/" className="text-amber-400 hover:text-amber-300 font-semibold text-lg">
            Workout Planner
          </Link>
        </div>
      </div>
    </div>
  )
}
