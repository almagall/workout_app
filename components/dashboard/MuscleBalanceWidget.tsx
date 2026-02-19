'use client'

import { useState, useEffect } from 'react'
import { getMuscleVolumeByPeriod } from '@/lib/muscle-volume-analytics'
import { MuscleBalanceDiagram } from './MuscleBalanceDiagram'

const TIME_RANGES = [
  { days: 7, label: 'Last 7 days' },
  { days: 14, label: 'Last 14 days' },
  { days: 30, label: 'Last 30 days' },
] as const

const ALL_MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Calves', 'Core'] as const

export default function MuscleBalanceWidget() {
  const [selectedDays, setSelectedDays] = useState(7)
  const [muscleVolume, setMuscleVolume] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const volume = await getMuscleVolumeByPeriod(selectedDays)
      setMuscleVolume(volume)
      setLoading(false)
    }
    load()
  }, [selectedDays])

  const hasData = Object.values(muscleVolume).some((v) => v > 0)
  const neglectedMuscles = ALL_MUSCLE_GROUPS.filter((g) => (muscleVolume[g] ?? 0) === 0)

  return (
    <div className="card-glass card-accent-top">
      <div
        className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }}
      />
      <div className="relative p-4 sm:p-6 border-b border-white/[0.06] bg-white/[0.015]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Muscle Balance</h2>
        <div className="flex gap-2">
          {TIME_RANGES.map(({ days, label }) => (
            <button
              key={days}
              onClick={() => setSelectedDays(days)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                selectedDays === days
                  ? 'btn-primary'
                  : 'bg-white/[0.04] text-muted hover:text-foreground hover:bg-white/[0.08]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted">Loading...</div>
        ) : !hasData ? (
          <div className="text-center py-8">
            <p className="text-muted mb-2">No data for this period</p>
            <p className="text-sm text-secondary">Log workouts to see your training distribution</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <MuscleBalanceDiagram muscleVolume={muscleVolume} />
            {neglectedMuscles.length > 0 && (
              <div className="pt-2 border-t border-white/[0.06]">
                <p className="text-xs text-muted mb-1.5">Not worked this period</p>
                <p className="text-sm text-secondary">{neglectedMuscles.join(', ')}</p>
              </div>
            )}
            <p className="text-xs text-secondary">Weighted sets: primary muscle groups get 1.0 per set, secondary muscle groups get 0.5 per set.</p>
          </div>
        )}
      </div>
    </div>
  )
}
