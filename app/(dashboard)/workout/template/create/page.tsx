'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-simple'
import { saveTemplate } from '@/lib/storage'
import type { PlanType } from '@/types/workout'

interface TemplateDay {
  id?: string
  dayLabel: string
  dayOrder: number
  exercises: string[]
}

export default function CreateTemplatePage() {
  const [templateName, setTemplateName] = useState('')
  const [planType, setPlanType] = useState<PlanType | null>(null)
  const [days, setDays] = useState<TemplateDay[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      window.location.href = '/get-started'
      return
    }

    const settings = localStorage.getItem(`workout_settings_${user.id}`)
    if (!settings) {
      window.location.href = '/onboarding'
      return
    }

    try {
      const settingsData = JSON.parse(settings)
      setPlanType(settingsData.plan_type)
    } catch {
      window.location.href = '/onboarding'
    }
  }, [])

  const addDay = () => {
    setDays([
      ...days,
      {
        dayLabel: '',
        dayOrder: days.length + 1,
        exercises: [],
      },
    ])
  }

  const updateDay = (index: number, field: keyof TemplateDay, value: any) => {
    const newDays = [...days]
    if (field === 'dayLabel') {
      newDays[index].dayLabel = value
    } else if (field === 'exercises') {
      newDays[index].exercises = value
    }
    setDays(newDays)
  }

  const addExercise = (dayIndex: number) => {
    const newDays = [...days]
    newDays[dayIndex].exercises.push('')
    setDays(newDays)
  }

  const updateExercise = (dayIndex: number, exerciseIndex: number, value: string) => {
    const newDays = [...days]
    newDays[dayIndex].exercises[exerciseIndex] = value
    setDays(newDays)
  }

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    const newDays = [...days]
    newDays[dayIndex].exercises.splice(exerciseIndex, 1)
    setDays(newDays)
  }

  const removeDay = (index: number) => {
    const newDays = days.filter((_, i) => i !== index)
    // Reorder days
    newDays.forEach((day, i) => {
      day.dayOrder = i + 1
    })
    setDays(newDays)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!templateName.trim()) {
      setError('Template name is required')
      return
    }

    if (days.length === 0) {
      setError('At least one day is required')
      return
    }

    for (const day of days) {
      if (!day.dayLabel.trim()) {
        setError('All days must have a label')
        return
      }
      if (day.exercises.length === 0) {
        setError('Each day must have at least one exercise')
        return
      }
      for (const exercise of day.exercises) {
        if (!exercise.trim()) {
          setError('All exercises must have a name')
          return
        }
      }
    }

    setLoading(true)

    try {
      const user = getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      if (!planType) {
        throw new Error('Plan type not set')
      }

      // Save template using Supabase
      await saveTemplate({
        name: templateName,
        planType,
        days: days.map(day => ({
          dayLabel: day.dayLabel,
          dayOrder: day.dayOrder,
          exercises: day.exercises.map(ex => ex.trim()),
        })),
      })

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to create template')
      setLoading(false)
    }
  }

  if (!planType) {
    return <div className="p-8 text-[#888888]">Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Create Workout Template</h1>

      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
        <div className="mb-6">
          <label htmlFor="templateName" className="block text-sm font-medium text-white mb-2">
            Template Name
          </label>
          <input
            type="text"
            id="templateName"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="w-full px-3 py-2 border border-[#2a2a2a] bg-[#1a1a1a] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
            placeholder="e.g., 6-Day Push/Pull/Legs"
            required
          />
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Workout Days</h2>
            <button
              type="button"
              onClick={addDay}
              className="px-4 py-2 bg-white text-black rounded-md hover:bg-[#e5e5e5] transition-colors font-medium"
            >
              Add Day
            </button>
          </div>

          {days.map((day, dayIndex) => (
            <div key={dayIndex} className="mb-6 p-4 border border-[#2a2a2a] bg-[#1a1a1a] rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <input
                  type="text"
                  value={day.dayLabel}
                  onChange={(e) => updateDay(dayIndex, 'dayLabel', e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#2a2a2a] bg-[#111111] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                  placeholder="e.g., Push A, Pull B, Legs A"
                  required
                />
                <button
                  type="button"
                  onClick={() => removeDay(dayIndex)}
                  className="ml-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-500 transition-colors"
                >
                  Remove
                </button>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-white">Exercises</label>
                  <button
                    type="button"
                    onClick={() => addExercise(dayIndex)}
                    className="text-sm px-3 py-1 bg-[#1a1a1a] text-white rounded hover:bg-[#2a2a2a] border border-[#2a2a2a] transition-colors"
                  >
                    + Add Exercise
                  </button>
                </div>
                {day.exercises.map((exercise, exerciseIndex) => (
                  <div key={exerciseIndex} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={exercise}
                      onChange={(e) => updateExercise(dayIndex, exerciseIndex, e.target.value)}
                      className="flex-1 px-3 py-2 border border-[#2a2a2a] bg-[#111111] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                      placeholder="Exercise name"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeExercise(dayIndex, exerciseIndex)}
                      className="px-3 py-2 bg-red-900/30 text-red-300 rounded-md hover:bg-red-900/50 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-white text-black rounded-md hover:bg-[#e5e5e5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Creating...' : 'Create Template'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-[#1a1a1a] text-white rounded-md hover:bg-[#2a2a2a] border border-[#2a2a2a] transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
