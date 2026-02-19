'use client'

import { useState, useEffect } from 'react'
import { getRecentPRs } from '@/lib/pr-helper'
import { getTemplateDay } from '@/lib/storage'

interface CelebrationData {
  dayLabel: string
  prCount: number
  prs: { name: string; value: number; type: string }[]
}

const DISMISS_KEY = 'pr_celebration_dismissed'

function getDismissedDate(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(DISMISS_KEY)
}

export default function PRCelebration() {
  const [data, setData] = useState<CelebrationData | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function load() {
      const prs = await getRecentPRs(20)
      if (prs.length === 0) return

      const now = new Date()
      const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000)
      const dismissedDate = getDismissedDate()

      // Filter to PRs from last 48 hours
      const recentPrs = prs.filter(pr => {
        const prDate = new Date(pr.workoutDate + 'T12:00:00')
        if (prDate < cutoff) return false
        if (dismissedDate && pr.workoutDate <= dismissedDate) return false
        return true
      })

      if (recentPrs.length === 0) return

      // Group by most recent workout date
      const latestDate = recentPrs[0].workoutDate
      const latestPrs = recentPrs.filter(pr => pr.workoutDate === latestDate)

      // Get day label
      let dayLabel = 'your workout'
      if (latestPrs[0]?.templateDayId) {
        const day = await getTemplateDay(latestPrs[0].templateDayId)
        if (day) dayLabel = day.day_label
      }

      // Deduplicate by exercise + PR type combo
      const seen = new Set<string>()
      const allPrs: { name: string; value: number; type: string }[] = []
      for (const pr of latestPrs) {
        const key = `${pr.exerciseName}:${pr.prType}`
        if (seen.has(key)) continue
        seen.add(key)
        allPrs.push({
          name: pr.exerciseName,
          value: pr.value,
          type: pr.prType === 'e1RM' ? 'Est. 1RM' : 'Heaviest set',
        })
      }

      setData({
        dayLabel,
        prCount: allPrs.length,
        prs: allPrs.slice(0, 5),
      })
    }
    load()
  }, [])

  if (!data || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem(DISMISS_KEY, today)
  }

  return (
    <div className="relative rounded-xl border border-amber-500/20 bg-amber-500/[0.04] backdrop-blur-sm p-4 shadow-[0_0_24px_rgba(245,158,11,0.08)] overflow-hidden">
      <div
        className="absolute -top-10 -left-10 w-32 h-32 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.08), transparent 70%)' }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-amber-400 mb-1.5" style={{ textShadow: '0 0 16px rgba(251,191,36,0.2)' }}>
            You hit {data.prCount} new PR{data.prCount !== 1 ? 's' : ''} on {data.dayLabel}!
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {data.prs.map(pr => (
              <span key={`${pr.name}-${pr.type}`} className="text-xs text-amber-300/80">
                {pr.name}: <span className="font-semibold text-amber-300">{pr.value} lbs</span> <span className="text-amber-400/50">({pr.type})</span>
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded text-amber-400/60 hover:text-amber-400 transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
