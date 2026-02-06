'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-simple'
import { getTemplates, getTemplateDays } from '@/lib/storage'
import { PRESET_TEMPLATES } from '@/lib/preset-templates'
import type { TemplateDay, WorkoutTemplate } from '@/types/workout'

export default function LogWorkoutPage() {
  const [templates, setTemplates] = useState<Array<{
    template: WorkoutTemplate
    days: TemplateDay[]
  }>>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  useEffect(() => {
    async function loadTemplates() {
      const user = getCurrentUser()
      if (!user) {
        window.location.href = '/get-started'
        return
      }

      const allTemplates = await getTemplates()
      const templatesWithDays = await Promise.all(
        allTemplates.map(async (template) => ({
          template,
          days: await getTemplateDays(template.id),
        }))
      )

      setTemplates(templatesWithDays)
      setLoading(false)
    }

    loadTemplates()
  }, [])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-[#888888]">Loading...</div>
      </div>
    )
  }

  if (templates.length === 0 || templates.every((t) => t.days.length === 0)) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Log Workout</h1>
        <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
          <p className="text-[#a1a1a1] mb-4">
            You need to create a workout template first before logging workouts.
          </p>
          <Link
            href="/workout/template/create"
            className="inline-block px-4 py-2 bg-white text-black rounded-md hover:bg-[#e5e5e5] transition-colors font-medium"
          >
            Create Template
          </Link>
        </div>
      </div>
    )
  }

  const selectedItem = templates.find((t) => t.template.id === selectedTemplateId)
  const templatesWithDays = templates.filter((t) => t.days.length > 0)

  // Step 1: Pick a template (or if selected template no longer exists, show templates)
  if (!selectedTemplateId || !selectedItem) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">Log Workout</h1>
        <p className="text-[#888888] mb-6">Select a template to log a workout:</p>

        <div className="space-y-4">
          {templatesWithDays.map(({ template, days }) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelectedTemplateId(template.id)}
              className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6 text-left hover:border-white transition-all hover:bg-[#1a1a1a]"
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h2 className="text-lg font-semibold text-white">{template.name}</h2>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${
                    template.plan_type === 'hypertrophy'
                      ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50'
                      : 'bg-amber-900/40 text-amber-300 border border-amber-700/50'
                  }`}
                >
                  {template.plan_type === 'hypertrophy' ? 'Hypertrophy' : 'Strength'}
                </span>
              </div>
              <p className="text-sm text-[#888888]">
                {days.length} workout day{days.length !== 1 ? 's' : ''}
              </p>
              {days.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {days.map((day) => (
                    <span
                      key={day.id}
                      className="text-xs px-2 py-0.5 bg-[#1a1a1a] text-[#888888] rounded border border-[#2a2a2a]"
                    >
                      {day.day_label}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Step 2: Pick a workout day from the selected template
  const { template, days } = selectedItem
  const preset = template.preset_id ? PRESET_TEMPLATES.find((p) => p.id === template.preset_id) : null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        type="button"
        onClick={() => setSelectedTemplateId(null)}
        className="mb-4 text-sm text-[#888888] hover:text-white transition-colors flex items-center gap-1"
      >
        ← Change template
      </button>
      <h1 className="text-3xl font-bold text-white mb-2">Log Workout</h1>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-lg font-semibold text-white">{template.name}</span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded ${
            template.plan_type === 'hypertrophy'
              ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50'
              : 'bg-amber-900/40 text-amber-300 border border-amber-700/50'
          }`}
        >
          {template.plan_type === 'hypertrophy' ? 'Hypertrophy' : 'Strength'}
        </span>
      </div>
      {preset?.description && (
        <p className="text-sm text-[#a1a1a1] mb-4">{preset.description}</p>
      )}
      <p className="text-[#888888] mb-4">Select a workout day:</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {days.map((day) => (
          <Link
            key={day.id}
            href={`/workout/log/${day.id}`}
            className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6 hover:border-white transition-all hover:bg-[#1a1a1a]"
          >
            <h3 className="text-xl font-semibold text-white">{day.day_label}</h3>
          </Link>
        ))}
      </div>
    </div>
  )
}
