'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import { getTemplates, getTemplateDays, getTemplateExercises } from '@/lib/storage'
import type { WorkoutTemplate, TemplateDay } from '@/types/workout'

interface DayOption {
  dayId: string
  label: string
  dayOrder: number
}

interface ProgressSelectorsProps {
  selectedTemplateDayId: string | null
  onTemplateDayChange: (dayId: string | null) => void
  selectedExercise: string
  onExerciseChange: (exercise: string) => void
  /** When true, renders without card wrapper for embedding inside another card */
  embedded?: boolean
}

export default function ProgressSelectors({
  selectedTemplateDayId,
  onTemplateDayChange,
  selectedExercise,
  onExerciseChange,
  embedded = false,
}: ProgressSelectorsProps) {
  const [dayOptions, setDayOptions] = useState<DayOption[]>([])
  const [exercises, setExercises] = useState<string[]>([])
  const [loadingDays, setLoadingDays] = useState(true)
  const [loadingExercises, setLoadingExercises] = useState(false)

  // Load templates and their days
  useEffect(() => {
    async function loadDays() {
      const user = getCurrentUser()
      if (!user) {
        setLoadingDays(false)
        return
      }

      const allTemplates = await getTemplates()
      const templatesWithDays = await Promise.all(
        allTemplates.map(async (template: WorkoutTemplate) => ({
          template,
          days: await getTemplateDays(template.id),
        }))
      )

      const options: DayOption[] = []
      templatesWithDays.forEach(({ template, days }) => {
        days.forEach((day: TemplateDay) => {
          const label =
            allTemplates.length > 1
              ? `${template.name}: ${day.day_label}`
              : day.day_label
          options.push({
            dayId: day.id,
            label,
            dayOrder: day.day_order,
          })
        })
      })

      options.sort((a, b) => a.dayOrder - b.dayOrder)
      setDayOptions(options)
      setLoadingDays(false)
    }

    loadDays()
  }, [])

  // Default to first workout day when options load and none is selected
  useEffect(() => {
    if (!loadingDays && dayOptions.length > 0 && !selectedTemplateDayId) {
      onTemplateDayChange(dayOptions[0].dayId)
    }
  }, [loadingDays, dayOptions, selectedTemplateDayId, onTemplateDayChange])

  // When workout day changes, load exercises for that day and reset exercise selection
  useEffect(() => {
    if (!selectedTemplateDayId) {
      setExercises([])
      onExerciseChange('')
      setLoadingExercises(false)
      return
    }

    let cancelled = false
    setLoadingExercises(true)

    getTemplateExercises(selectedTemplateDayId).then((templateExercises) => {
      if (cancelled) return
      const names = templateExercises.map((e) => e.exercise_name)
      setExercises(names)
      if (names.length > 0 && (!selectedExercise || !names.includes(selectedExercise))) {
        onExerciseChange(names[0])
      } else if (names.length === 0) {
        onExerciseChange('')
      }
      setLoadingExercises(false)
    })

    return () => {
      cancelled = true
    }
    // Only run when selectedTemplateDayId changes; onExerciseChange/selectedExercise intentionally omitted to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateDayId])

  const cardClass = embedded ? '' : 'bg-card rounded-lg border border-border p-4 sm:p-6'

  if (loadingDays) {
    return (
      <div className={embedded ? '' : 'bg-card rounded-lg border border-border p-6'}>
        <div className="text-muted">Loading...</div>
      </div>
    )
  }

  if (dayOptions.length === 0) {
    return (
      <div className={embedded ? '' : 'bg-card rounded-lg border border-border p-6'}>
        <p className="text-secondary">
          Create a template and log workouts to see progress.
        </p>
      </div>
    )
  }

  const compact = embedded
  const rowClass = compact
    ? 'flex flex-row items-end gap-2 sm:gap-4'
    : 'flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4'
  const labelClass = compact
    ? 'text-xs font-medium text-foreground whitespace-nowrap'
    : 'text-xs sm:text-sm font-medium text-foreground whitespace-nowrap'
  const selectClass = compact
    ? 'w-full flex-1 min-w-0 px-2 sm:px-3 py-1.5 text-sm rounded-md border border-border bg-elevated text-foreground shadow-sm focus:border-foreground focus:ring-2 focus:ring-foreground focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
    : 'w-full max-w-md px-3 py-1.5 sm:px-4 sm:py-2 text-sm rounded-md border border-border bg-elevated text-foreground shadow-sm focus:border-foreground focus:ring-2 focus:ring-foreground focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const optionClass = 'bg-elevated'

  return (
    <div className={cardClass || undefined}>
      <div className={rowClass}>
        <div className="flex flex-col gap-0.5 sm:gap-2 flex-1 min-w-0">
          <label htmlFor="workout-day-select" className={labelClass}>
            Workout Day
          </label>
          <select
            id="workout-day-select"
            value={selectedTemplateDayId ?? ''}
            onChange={(e) => onTemplateDayChange(e.target.value || null)}
            className={selectClass}
          >
            {dayOptions.map((opt) => (
              <option key={opt.dayId} value={opt.dayId} className={optionClass}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-0.5 sm:gap-2 flex-1 min-w-0">
          <label htmlFor="exercise-select" className={labelClass}>
            Exercise
          </label>
          <select
            id="exercise-select"
            value={selectedExercise}
            onChange={(e) => onExerciseChange(e.target.value)}
            disabled={!selectedTemplateDayId || loadingExercises || exercises.length === 0}
            className={selectClass}
          >
            {!selectedTemplateDayId ? (
              <option value="" className={optionClass}>
                Select a workout day first
              </option>
            ) : loadingExercises ? (
              <option value="" className={optionClass}>
                Loading...
              </option>
            ) : exercises.length === 0 ? (
              <option value="" className={optionClass}>
                No exercises for this day
              </option>
            ) : (
              exercises.map((name) => (
                <option key={name} value={name} className={optionClass}>
                  {name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>
    </div>
  )
}
