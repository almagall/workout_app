'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-simple'
import { getTemplates, getTemplateDays } from '@/lib/storage'
import type { TemplateDay, WorkoutTemplate } from '@/types/workout'

export default function LogWorkoutPage() {
  const [templates, setTemplates] = useState<Array<{
    template: WorkoutTemplate
    days: TemplateDay[]
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      window.location.href = '/get-started'
      return
    }

    // Get all templates for user
    const allTemplates = getTemplates()
    const templatesWithDays = allTemplates.map(template => ({
      template,
      days: getTemplateDays(template.id),
    }))

    setTemplates(templatesWithDays)
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-slate-300">Loading...</div>
      </div>
    )
  }

  if (templates.length === 0 || templates.every(t => t.days.length === 0)) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-8">Log Workout</h1>
        <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
          <p className="text-slate-300 mb-4">
            You need to create a workout template first before logging workouts.
          </p>
          <Link
            href="/workout/template/create"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500"
          >
            Create Template
          </Link>
        </div>
      </div>
    )
  }

  // Flatten template days with template info
  const allDays: Array<{
    templateId: string
    templateName: string
    dayId: string
    dayLabel: string
    dayOrder: number
  }> = []

  templates.forEach(({ template, days }) => {
    days.forEach((day) => {
      allDays.push({
        templateId: template.id,
        templateName: template.name,
        dayId: day.id,
        dayLabel: day.day_label,
        dayOrder: day.day_order,
      })
    })
  })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate-100 mb-8">Log Workout</h1>
      <p className="text-slate-300 mb-6">Select a workout day to log:</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allDays.map((day) => (
          <Link
            key={day.dayId}
            href={`/workout/log/${day.dayId}`}
            className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6 hover:border-indigo-500/50 transition-all"
          >
            <h3 className="text-xl font-semibold text-slate-100 mb-2">{day.dayLabel}</h3>
            <p className="text-sm text-slate-400">{day.templateName}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
