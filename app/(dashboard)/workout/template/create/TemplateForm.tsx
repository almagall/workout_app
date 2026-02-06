'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-simple'
import { saveTemplate, updateTemplate, getTemplates, getTemplateDays, getTemplateExercises } from '@/lib/storage'
import type { PlanType } from '@/types/workout'
import { searchExercises } from '@/lib/exercise-database'
import { checkAndUnlockAchievements } from '@/lib/achievements'

interface TemplateDay {
  id?: string
  dayLabel: string
  dayOrder: number
  exercises: string[]
}

interface TemplateFormProps {
  templateId?: string
}

function ExerciseAutocompleteInline({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  className: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const suggestions = searchExercises(query, 12)

  return (
    <div ref={containerRef} className={'relative flex-1 min-w-0 ' + className}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          const v = e.target.value
          setQuery(v)
          onChange(v)
          setOpen(v.trim().length > 0)
        }}
        onFocus={() => { if (query.trim().length > 0) setOpen(true) }}
        placeholder={placeholder}
        required
        className="w-full px-3 py-2 border border-[#2a2a2a] bg-[#111111] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
        autoComplete="off"
      />
      {open && query.trim().length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-auto rounded-md border border-[#2a2a2a] bg-[#1a1a1a] shadow-lg">
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-[#888888] text-sm">No matches. Use as custom exercise.</li>
          ) : (
            suggestions.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm hover:bg-[#2a2a2a] text-[#e5e5e5]"
                onClick={() => {
                  onChange(entry.name)
                  setQuery(entry.name)
                  setOpen(false)
                }}
              >
                <span className="flex-1">{entry.name}</span>
                <span className="text-[#888888] text-xs">{entry.muscleGroup} · {entry.equipment}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

export default function TemplateForm({ templateId }: TemplateFormProps) {
  const isEditMode = !!templateId
  const router = useRouter()
  
  const [templateName, setTemplateName] = useState('')
  const [planType, setPlanType] = useState<PlanType | null>(null)
  const [days, setDays] = useState<TemplateDay[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function initializeTemplate() {
      const user = getCurrentUser()
      if (!user) {
        window.location.href = '/get-started'
        return
      }

      try {
        // If editing, load existing template data (including plan type)
        if (isEditMode && templateId) {
          const templates = await getTemplates()
          const template = templates.find(t => t.id === templateId)
          
          if (!template) {
            setError('Template not found')
            setInitialLoading(false)
            return
          }

          setTemplateName(template.name)
          setPlanType(template.plan_type)

          // Load days
          const templateDays = await getTemplateDays(templateId)
          const daysWithExercises = await Promise.all(
            templateDays.map(async (day) => {
              const exercises = await getTemplateExercises(day.id)
              return {
                id: day.id,
                dayLabel: day.day_label,
                dayOrder: day.day_order,
                exercises: exercises.map(ex => ex.exercise_name),
              }
            })
          )

          setDays(daysWithExercises)
        } else {
          // Creating: plan type is selected in the form (no default from onboarding)
          setPlanType(null)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load template')
      } finally {
        setInitialLoading(false)
      }
    }

    initializeTemplate()
  }, [isEditMode, templateId])

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

    if (!planType) {
      setError('Please select a workout focus (Hypertrophy or Strength)')
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

      // Save or update template using Supabase
      if (isEditMode && templateId) {
        await updateTemplate(templateId, {
          name: templateName,
          planType,
          days: days.map(day => ({
            dayLabel: day.dayLabel,
            dayOrder: day.dayOrder,
            exercises: day.exercises.map(ex => ex.trim()),
          })),
        })
      } else {
        await saveTemplate({
          name: templateName,
          planType,
          days: days.map(day => ({
            dayLabel: day.dayLabel,
            dayOrder: day.dayOrder,
            exercises: day.exercises.map(ex => ex.trim()),
          })),
        })
      }

      if (!isEditMode) checkAndUnlockAchievements().catch(() => {})
      router.push('/workout/template')
    } catch (err: any) {
      setError(err.message || `Failed to ${isEditMode ? 'update' : 'create'} template`)
      setLoading(false)
    }
  }

  if (initialLoading) {
    return <div className="p-8 text-[#888888]">Loading...</div>
  }

  // When editing we must have planType from template; when creating we allow null until user selects
  if (isEditMode && !planType) {
    return <div className="p-8 text-[#888888]">Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Template</h1>

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
          <label className="block text-sm font-medium text-white mb-2">Workout focus</label>
          <p className="text-sm text-[#888888] mb-3">
            Choose whether this template is for building muscle size (hypertrophy) or strength. Targets and rep ranges will adjust accordingly.
          </p>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="planType"
                value="hypertrophy"
                checked={planType === 'hypertrophy'}
                onChange={() => setPlanType('hypertrophy')}
                className="w-4 h-4 accent-white"
              />
              <span className="text-white">Hypertrophy</span>
              <span className="text-[#888888] text-sm">(8–15 reps, volume focus)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="planType"
                value="strength"
                checked={planType === 'strength'}
                onChange={() => setPlanType('strength')}
                className="w-4 h-4 accent-white"
              />
              <span className="text-white">Strength</span>
              <span className="text-[#888888] text-sm">(3–6 reps, weight focus)</span>
            </label>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Workout Days</h2>

          {days.length === 0 && (
            <button
              type="button"
              onClick={addDay}
              className="mb-6 px-4 py-2 bg-white text-black rounded-md hover:bg-[#e5e5e5] transition-colors font-medium"
            >
              Add Day
            </button>
          )}

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
                <label className="block text-sm font-medium text-white mb-2">Exercises</label>
                {day.exercises.map((exercise, exerciseIndex) => (
                  <div key={exerciseIndex} className="flex gap-2 mb-2 items-start">
                    <ExerciseAutocompleteInline
                      value={exercise}
                      onChange={(val) => updateExercise(dayIndex, exerciseIndex, val)}
                      placeholder="Search or type exercise name"
                      className="flex-1 min-w-0"
                    />
                    <button
                      type="button"
                      onClick={() => removeExercise(dayIndex, exerciseIndex)}
                      className="px-3 py-2 bg-red-900/30 text-red-300 rounded-md hover:bg-red-900/50 transition-colors flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addExercise(dayIndex)}
                  className="mt-2 text-sm px-3 py-1 bg-[#1a1a1a] text-white rounded hover:bg-[#2a2a2a] border border-[#2a2a2a] transition-colors"
                >
                  + Add Exercise
                </button>
              </div>
            </div>
          ))}

          {days.length > 0 && (
            <button
              type="button"
              onClick={addDay}
              className="px-4 py-2 bg-white text-black rounded-md hover:bg-[#e5e5e5] transition-colors font-medium"
            >
              Add Day
            </button>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-white text-black rounded-md hover:bg-[#e5e5e5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading 
              ? (isEditMode ? 'Updating...' : 'Creating...') 
              : (isEditMode ? 'Update Template' : 'Create Template')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/workout/template')}
            className="px-4 py-2 bg-[#1a1a1a] text-white rounded-md hover:bg-[#2a2a2a] border border-[#2a2a2a] transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
