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
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-white mb-3">Muscle Balance</h2>
        <div className="flex gap-2">
          {TIME_RANGES.map(({ days, label }) => (
            <button
              key={days}
              onClick={() => setSelectedDays(days)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedDays === days
                  ? 'bg-white text-black'
                  : 'bg-border text-muted hover:text-foreground hover:bg-elevated'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
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
              <div className="pt-2 border-t border-border">
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
