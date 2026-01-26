'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import { getExerciseLogs } from '@/lib/storage'

interface ExerciseSelectorProps {
  selectedExercise: string
  onExerciseChange: (exercise: string) => void
}

export default function ExerciseSelector({ selectedExercise, onExerciseChange }: ExerciseSelectorProps) {
  const [exercises, setExercises] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) return

    const logs = getExerciseLogs()

    if (logs.length > 0) {
      const uniqueExercises = Array.from(
        new Set(logs.map((log) => log.exercise_name))
      ).sort()
      setExercises(uniqueExercises)
      if (uniqueExercises.length > 0 && !selectedExercise) {
        onExerciseChange(uniqueExercises[0])
      }
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return <div className="text-slate-400">Loading exercises...</div>
  }

  if (exercises.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
        <p className="text-slate-300">
          No exercises logged yet. Start logging workouts to see your progress!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
      <div className="flex items-center gap-4">
        <label htmlFor="exercise-select" className="text-sm font-medium text-slate-200 whitespace-nowrap">
          Select Exercise:
        </label>
        <select
          id="exercise-select"
          value={selectedExercise}
          onChange={(e) => onExerciseChange(e.target.value)}
          className="flex-1 max-w-md px-4 py-2 rounded-md border border-slate-600 bg-slate-700 text-slate-100 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors sm:text-sm"
        >
          {exercises.map((exercise) => (
            <option key={exercise} value={exercise} className="bg-slate-700">
              {exercise}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
