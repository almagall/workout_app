'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import { getExerciseLogs } from '@/lib/storage'

export default function ExerciseSelector() {
  const [exercises, setExercises] = useState<string[]>([])
  const [selectedExercise, setSelectedExercise] = useState<string>('')
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
        setSelectedExercise(uniqueExercises[0])
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
      <label htmlFor="exercise-select" className="block text-sm font-medium text-slate-200 mb-2">
        Select Exercise
      </label>
      <select
        id="exercise-select"
        value={selectedExercise}
        onChange={(e) => setSelectedExercise(e.target.value)}
        className="block w-full rounded-md border-slate-600 bg-slate-700 text-slate-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      >
        {exercises.map((exercise) => (
          <option key={exercise} value={exercise} className="bg-slate-700">
            {exercise}
          </option>
        ))}
      </select>
    </div>
  )
}
