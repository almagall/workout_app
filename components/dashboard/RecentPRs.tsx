'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import { getRecentPRs } from '@/lib/pr-helper'
import { getTemplateDay } from '@/lib/storage'
import type { RecentPR } from '@/lib/pr-helper'

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function RecentPRs() {
  const [prs, setPrs] = useState<RecentPR[]>([])
  const [dayLabels, setDayLabels] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const user = getCurrentUser()
      if (!user) return

      const recent = await getRecentPRs(5)
      setPrs(recent)

      const dayIds = [...new Set(recent.map((p) => p.templateDayId))]
      const labels = new Map<string, string>()
      await Promise.all(
        dayIds.map(async (id) => {
          const day = await getTemplateDay(id)
          if (day) labels.set(id, day.day_label)
        })
      )
      setDayLabels(labels)
      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return (
      <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 text-white">Recent PRs</h2>
        <div className="text-[#888888] text-sm">Loading...</div>
      </div>
    )
  }

  if (prs.length === 0) {
    return (
      <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 text-white">Recent PRs</h2>
        <p className="text-[#888888] text-sm">No personal records yet. Log workouts to see your PRs here.</p>
      </div>
    )
  }

  return (
    <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 text-white">Recent PRs</h2>
      <div className="space-y-2">
        {prs.map((pr, i) => (
          <div
            key={`${pr.exerciseName}-${pr.templateDayId}-${pr.workoutDate}-${pr.prType}-${i}`}
            className="flex items-center justify-between py-2 border-b border-[#2a2a2a] last:border-0"
          >
            <div>
              <p className="text-white font-medium">{pr.exerciseName}</p>
              <p className="text-xs text-[#888888]">
                {dayLabels.get(pr.templateDayId) ?? 'Workout'} · {formatDate(pr.workoutDate)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-amber-300 font-semibold">{pr.value} lbs</span>
              <p className="text-xs text-[#888888]">
                {pr.prType === 'heaviestSet' ? 'Heaviest set' : 'Est. 1RM'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
