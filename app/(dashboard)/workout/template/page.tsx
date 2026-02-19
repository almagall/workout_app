'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth-simple'
import { getTemplates, getTemplateDays, deleteTemplate, saveTemplate } from '@/lib/storage'
import { PRESET_TEMPLATES } from '@/lib/preset-templates'
import { checkAndUnlockAchievements } from '@/lib/achievements'
import type { TemplateDay, WorkoutTemplate, PlanType } from '@/types/workout'

type Tab = 'my' | 'precreated'
type FocusFilter = 'all' | PlanType

export default function TemplatePage() {
  const [tab, setTab] = useState<Tab>('my')
  const [focusFilter, setFocusFilter] = useState<FocusFilter>('all')
  const [templates, setTemplates] = useState<Array<{
    template: WorkoutTemplate
    days: TemplateDay[]
  }>>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [usingPresetId, setUsingPresetId] = useState<string | null>(null)
  const [expandedPresetId, setExpandedPresetId] = useState<string | null>(null)

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

  const handleUsePreset = async (presetId: string) => {
    const preset = PRESET_TEMPLATES.find((p) => p.id === presetId)
    if (!preset) return
    const user = getCurrentUser()
    if (!user) {
      window.location.href = '/get-started'
      return
    }
    setUsingPresetId(presetId)
    try {
      await saveTemplate({
        name: preset.name,
        planType: preset.planType,
        presetId: preset.id,
        days: preset.days.map((d) => ({
          dayLabel: d.dayLabel,
          dayOrder: d.dayOrder,
          exercises: d.exercises,
        })),
      })
      const allTemplates = await getTemplates()
      const templatesWithDays = await Promise.all(
        allTemplates.map(async (template) => ({
          template,
          days: await getTemplateDays(template.id),
        }))
      )
      setTemplates(templatesWithDays)
      setTab('my')
      checkAndUnlockAchievements().catch(() => {})
    } catch (err: any) {
      alert(`Failed to add template: ${err.message}`)
    } finally {
      setUsingPresetId(null)
    }
  }

  const filteredPresets = focusFilter === 'all'
    ? PRESET_TEMPLATES
    : PRESET_TEMPLATES.filter((p) => p.planType === focusFilter)

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">Templates</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/workout/template/create"
            className="btn-primary text-sm sm:text-base px-5 py-2.5"
          >
            + Create custom
          </Link>
          <div className="flex rounded-md border border-white/[0.06] overflow-hidden">
            <button
              type="button"
              onClick={() => setTab('my')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                tab === 'my'
                  ? 'bg-white/[0.04] text-foreground'
                  : 'bg-card text-muted hover:text-foreground'
              }`}
            >
              My templates
            </button>
            <button
              type="button"
              onClick={() => setTab('precreated')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                tab === 'precreated'
                  ? 'bg-white/[0.04] text-foreground'
                  : 'bg-card text-muted hover:text-foreground'
              }`}
            >
              Pre-created
            </button>
          </div>
        </div>
      </div>

      {tab === 'my' && (
        <>
          {templates.length === 0 ? (
            <div className="card-glass card-accent-top p-6 relative">
              <div className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }} />
              <p className="text-secondary mb-4">
                You have not created any templates yet. Create a custom template or choose a pre-created one to get started.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/workout/template/create"
                  className="btn-primary inline-block"
                >
                  Create custom
                </Link>
                <button
                  type="button"
                  onClick={() => setTab('precreated')}
                  className="btn-primary inline-block"
                >
                  Browse pre-created
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map(({ template, days }) => (
                <div
                  key={template.id}
                  className="card-glass card-accent-top p-6 relative"
                >
                  <div className="absolute -top-10 -left-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }} />
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h2 className="text-xl font-semibold text-foreground">{template.name}</h2>
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
                      <p className="text-sm text-muted">
                        {days.length} workout day{days.length !== 1 ? 's' : ''}
                      </p>
                      {days.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {days.map((day) => (
                            <span
                              key={day.id}
                              className="text-xs px-2 py-1 bg-white/[0.04] text-muted rounded border border-white/[0.06]"
                            >
                              {day.day_label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/share/template/${template.id}`}
                        className="p-2 text-muted hover:text-accent-light hover:bg-white/[0.04] rounded-md transition-colors"
                        title="Share template"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </Link>
                      <Link
                        href={`/workout/template/edit/${template.id}`}
                        className="btn-primary text-sm px-4 py-2"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(template.id, template.name)}
                        disabled={deletingId === template.id}
                        className="px-4 py-2 bg-red-600 text-foreground rounded-md hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {deletingId === template.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'precreated' && (
        <>
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted">Workout focus:</span>
            <div className="flex rounded-md border border-white/[0.06] overflow-hidden">
              {(['all', 'hypertrophy', 'strength'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFocusFilter(f)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    focusFilter === f
                      ? 'bg-white/[0.04] text-foreground'
                      : 'bg-card text-muted hover:text-foreground'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'hypertrophy' ? 'Hypertrophy' : 'Strength'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredPresets.map((preset) => (
              <div
                key={preset.id}
                className="card-glass card-accent-top p-5 flex flex-col relative"
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }} />
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-foreground">{preset.name}</h2>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${
                      preset.planType === 'hypertrophy'
                        ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50'
                        : 'bg-amber-900/40 text-amber-300 border border-amber-700/50'
                    }`}
                  >
                    {preset.planType === 'hypertrophy' ? 'Hypertrophy' : 'Strength'}
                  </span>
                </div>
                <div className="mb-3 flex-1">
                  {expandedPresetId === preset.id ? (
                    <>
                      <p className="text-sm text-secondary mb-1">
                        {preset.description}
                      </p>
                      <button
                        type="button"
                        onClick={() => setExpandedPresetId(null)}
                        className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
                        aria-expanded="true"
                      >
                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        See less
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-secondary line-clamp-3">
                        {preset.description}
                      </p>
                      {preset.description.length > 100 && (
                        <button
                          type="button"
                          onClick={() => setExpandedPresetId(preset.id)}
                          className="inline-flex items-center gap-1 mt-1 text-xs text-muted hover:text-foreground transition-colors"
                          aria-expanded="false"
                        >
                          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          See more
                        </button>
                      )}
                    </>
                  )}
                </div>
                <p className="text-xs text-muted mb-2">
                  {preset.days.length} workout day{preset.days.length !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {preset.days.map((day) => (
                    <span
                      key={day.dayOrder}
                      className="text-xs px-2 py-0.5 bg-white/[0.04] text-muted rounded border border-white/[0.06]"
                    >
                      {day.dayLabel}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 mb-4 max-h-20 overflow-y-auto">
                  {preset.days.flatMap((day) =>
                    day.exercises.map((ex) => (
                      <span
                        key={`${day.dayOrder}-${ex}`}
                        className="text-[10px] sm:text-xs px-1.5 py-0.5 bg-background text-secondary rounded border border-white/[0.06]"
                      >
                        {ex}
                      </span>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleUsePreset(preset.id)}
                  disabled={usingPresetId !== null}
                  className="btn-primary mt-auto w-full disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {usingPresetId === preset.id ? 'Adding...' : 'Use this template'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
