'use client'

import { useState, useEffect } from 'react'
import { getNextWorkout, type NextWorkoutInfo } from '@/lib/next-workout'

export default function NextWorkoutCard() {
  const [data, setData] = useState<NextWorkoutInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getNextWorkout().then(d => {
      setData(d)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-card animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-3 w-20 bg-elevated rounded mb-2" />
            <div className="h-6 w-32 bg-elevated rounded" />
          </div>
          <div className="h-10 w-28 bg-elevated rounded-lg" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const statusText = data.daysSinceLastTrained === null
    ? 'Not yet trained'
    : data.daysSinceLastTrained === 0
      ? 'Trained today'
      : data.daysSinceLastTrained === 1
        ? 'Last trained yesterday'
        : `Last trained ${data.daysSinceLastTrained} days ago`

  const isOverdue = data.daysSinceLastTrained !== null && data.daysSinceLastTrained >= 8

  return (
    <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-card max-w-md">
      <div>
        <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Up Next</p>
        <h3 className="text-lg sm:text-xl font-bold text-foreground truncate">{data.dayLabel}</h3>
        <p className={`text-xs mt-0.5 ${isOverdue ? 'text-amber-400' : 'text-muted'}`}>
          {statusText}
        </p>
      </div>

      {data.keyLifts.length > 0 && data.keyLifts[0].weight > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[11px] text-muted uppercase tracking-wide mb-1.5">Last session top sets</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {data.keyLifts.map(lift => (
              <span key={lift.name} className="text-xs text-secondary">
                <span className="text-foreground font-medium">{lift.name}</span>
                {' '}{lift.weight} lbs x {lift.reps}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
