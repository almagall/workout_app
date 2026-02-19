'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { TemplateSummary } from '@/app/api/share/template/[templateId]/route'
import TemplateShareCard from '@/components/share/TemplateShareCard'

export default function TemplateShareClient({ templateId }: { templateId: string }) {
  const [summary, setSummary] = useState<TemplateSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/share/template/${encodeURIComponent(templateId)}`)
        if (!res.ok) {
          setError(res.status === 404 ? 'Template not found' : 'Failed to load template')
          setLoading(false)
          return
        }
        const data = await res.json()
        setSummary(data.summary)
      } catch {
        setError('Failed to load template')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [templateId])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const exitLink = (
    <Link
      href="/workout/template"
      className="fixed top-4 right-4 z-10 p-2 rounded-full text-red-500 hover:text-red-400 hover:bg-elevated transition-colors"
      aria-label="Back to templates"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </Link>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {exitLink}
        <p className="text-muted">Loading template...</p>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        {exitLink}
        <p className="text-red-400 text-lg mb-4">{error || 'Template not found'}</p>
        <Link href="/" className="text-accent-light hover:text-accent">Go to Home</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {exitLink}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2 tracking-tight">Workout Template</h1>
          <p className="text-muted">
            Shared by <span className="text-accent-light font-medium">{summary.creator_username}</span>
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="p-6 border-b border-border bg-gradient-to-r from-blue-500/10 to-transparent">
            <h2 className="text-xl font-bold text-foreground">{summary.name}</h2>
            <p className="text-muted text-sm mt-1 capitalize">{summary.plan_type.replace(/_/g, ' ')}</p>
          </div>

          <div className="grid grid-cols-2 border-b border-border">
            <div className="p-4 text-center border-r border-border">
              <p className="text-2xl font-bold text-foreground">{summary.days.length}</p>
              <p className="text-muted text-xs">Workout Days</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-accent-light">{summary.total_exercises}</p>
              <p className="text-muted text-xs">Unique Exercises</p>
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Program Overview</h3>
            <div className="space-y-4">
              {summary.days.map((day, i) => (
                <div key={i} className="bg-elevated rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-2">{day.day_label}</h4>
                  <div className="space-y-1">
                    {day.exercises.map((ex, j) => (
                      <p key={j} className="text-sm text-secondary flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-accent/60 flex-shrink-0" />
                        {ex}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-border space-y-3">
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full py-3 px-4 btn-primary font-medium rounded-lg flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Link Copied!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  Share This Template
                </>
              )}
            </button>
            <TemplateShareCard summary={summary} />
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-muted text-sm mb-2">Track your workouts with</p>
          <Link href="/" className="text-accent-light hover:text-accent font-semibold text-lg">Workout Planner</Link>
        </div>
      </div>
    </div>
  )
}
