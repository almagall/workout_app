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
    async function loadExercises() {
      const user = getCurrentUser()
      if (!user) return

      const logs = await getExerciseLogs()

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
    }

    loadExercises()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return <div className="text-[#888888]">Loading exercises...</div>
  }

  if (exercises.length === 0) {
    return (
      <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
        <p className="text-[#a1a1a1]">
          No exercises logged yet. Start logging workouts to see your progress!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
      <div className="flex items-center gap-4">
        <label htmlFor="exercise-select" className="text-sm font-medium text-white whitespace-nowrap">
          Select Exercise:
        </label>
        <select
          id="exercise-select"
          value={selectedExercise}
          onChange={(e) => onExerciseChange(e.target.value)}
          className="flex-1 max-w-md px-4 py-2 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] text-white shadow-sm focus:border-white focus:ring-2 focus:ring-white focus:outline-none transition-colors sm:text-sm"
        >
          {exercises.map((exercise) => (
            <option key={exercise} value={exercise} className="bg-[#1a1a1a]">
              {exercise}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
