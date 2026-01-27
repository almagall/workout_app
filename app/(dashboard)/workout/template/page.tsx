'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-simple'
import { getTemplates, getTemplateDays, deleteTemplate } from '@/lib/storage'
import type { TemplateDay, WorkoutTemplate } from '@/types/workout'

export default function TemplatePage() {
  const [templates, setTemplates] = useState<Array<{
    template: WorkoutTemplate
    days: TemplateDay[]
  }>>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadTemplates() {
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

      // Get all templates for user
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

  const handleDeleteClick = (templateId: string, templateName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the template "${templateName}"?\n\n` +
      `This will also delete all associated workout days and exercises.\n` +
      `This action cannot be undone.`
    )

    if (confirmed) {
      handleDeleteTemplate(templateId, templateName)
    }
  }

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    setDeletingId(templateId)
    try {
      await deleteTemplate(templateId)
      // Reload templates
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
    } catch (err: any) {
      alert(`Failed to delete template: ${err.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-[#888888]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Template</h1>
        <Link
          href="/workout/template/create"
          className="px-4 py-2 bg-white text-black rounded-md hover:bg-[#e5e5e5] transition-colors font-medium"
        >
          + New Template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
          <p className="text-[#a1a1a1] mb-4">
            You have not created any templates yet. Create your first template to get started.
          </p>
          <Link
            href="/workout/template/create"
            className="inline-block px-4 py-2 bg-white text-black rounded-md hover:bg-[#e5e5e5] transition-colors font-medium"
          >
            Create Template
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map(({ template, days }) => (
            <div
              key={template.id}
              className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">{template.name}</h2>
                  <p className="text-sm text-[#888888]">
                    {days.length} workout day{days.length !== 1 ? 's' : ''}
                  </p>
                  {days.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {days.map((day) => (
                        <span
                          key={day.id}
                          className="text-xs px-2 py-1 bg-[#1a1a1a] text-[#888888] rounded border border-[#2a2a2a]"
                        >
                          {day.day_label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/workout/template/edit/${template.id}`}
                    className="px-4 py-2 bg-[#1a1a1a] text-white rounded-md hover:bg-[#2a2a2a] border border-[#2a2a2a] transition-colors text-sm font-medium"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(template.id, template.name)}
                    disabled={deletingId === template.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {deletingId === template.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
