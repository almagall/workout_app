'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  const supabase = createClient()

  useEffect(() => {
    async function fetchPlanType() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        window.location.href = '/login'
        return
      }

      const { data: settings, error: settingsError } = await supabase
        .from('progressive_overload_settings')
        .select('plan_type')
        .eq('user_id', user.id)
        .single()

      if (settingsError) {
        // If table doesn't exist, show error
        if (settingsError.message.includes('relation') || settingsError.message.includes('does not exist')) {
          setError('Database tables not found. Please run the database migration first. See DATABASE_SETUP.md for instructions.')
        } else {
          // Other error, redirect to onboarding
          window.location.href = '/onboarding'
        }
        return
      }

      if (settings) {
        setPlanType(settings.plan_type)
      } else {
        window.location.href = '/onboarding'
      }
    }

    fetchPlanType()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create template
      const { data: template, error: templateError } = await supabase
        .from('workout_templates')
        .insert({
          user_id: user.id,
          plan_type: planType!,
          name: templateName,
        })
        .select()
        .single()

      if (templateError) throw templateError

      // Create days and exercises
      for (const day of days) {
        const { data: templateDay, error: dayError } = await supabase
          .from('template_days')
          .insert({
            template_id: template.id,
            day_label: day.dayLabel,
            day_order: day.dayOrder,
          })
          .select()
          .single()

        if (dayError) throw dayError

        // Insert exercises
        const exercisesToInsert = day.exercises.map((exerciseName, index) => ({
          template_day_id: templateDay.id,
          exercise_name: exerciseName.trim(),
          exercise_order: index + 1,
        }))

        const { error: exercisesError } = await supabase
          .from('template_exercises')
          .insert(exercisesToInsert)

        if (exercisesError) throw exercisesError
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to create template')
    } finally {
      setLoading(false)
    }
  }

  if (!planType) {
    return <div className="p-8 text-slate-300">Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate-100 mb-8">Create Workout Template</h1>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
        <div className="mb-6">
          <label htmlFor="templateName" className="block text-sm font-medium text-slate-200 mb-2">
            Template Name
          </label>
          <input
            type="text"
            id="templateName"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., 6-Day Push/Pull/Legs"
            required
          />
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-100">Workout Days</h2>
            <button
              type="button"
              onClick={addDay}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500"
            >
              Add Day
            </button>
          </div>

          {days.map((day, dayIndex) => (
            <div key={dayIndex} className="mb-6 p-4 border border-slate-600 bg-slate-700/50 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <input
                  type="text"
                  value={day.dayLabel}
                  onChange={(e) => updateDay(dayIndex, 'dayLabel', e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Push A, Pull B, Legs A"
                  required
                />
                <button
                  type="button"
                  onClick={() => removeDay(dayIndex)}
                  className="ml-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-500"
                >
                  Remove
                </button>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-slate-200">Exercises</label>
                  <button
                    type="button"
                    onClick={() => addExercise(dayIndex)}
                    className="text-sm px-3 py-1 bg-slate-600 text-slate-200 rounded hover:bg-slate-500"
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
                      className="flex-1 px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Exercise name"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeExercise(dayIndex, exerciseIndex)}
                      className="px-3 py-2 bg-red-900/50 text-red-200 rounded-md hover:bg-red-800/50"
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
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Template'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-slate-600 text-slate-200 rounded-md hover:bg-slate-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
