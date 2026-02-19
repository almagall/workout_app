'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import { getWeeklyHitRates } from '@/lib/performance-analytics'
import { getDeloadSuggestion, setDeloadWeek, isInDeloadPeriod } from '@/lib/deload-detection'
import { getDefaultPlanSettings } from '@/lib/progressive-overload'
import type { PlanType } from '@/types/workout'

interface FatigueData {
  weeksTrained: number
  fatigueScore: number
  deloadRecommended: boolean
  deloadReason: string | null
  inDeloadPeriod: boolean
}

function getEndOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const daysToSunday = day === 0 ? 0 : 7 - day
  d.setDate(d.getDate() + daysToSunday)
  return d.toISOString().split('T')[0]
}

interface FatigueMonitorProps {
  planType?: PlanType
}

export default function FatigueMonitor({ planType = 'hypertrophy' }: FatigueMonitorProps) {
  const [data, setData] = useState<FatigueData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const onDeloadStarted = () => {
      setData((prev) =>
        prev ? { ...prev, inDeloadPeriod: true, deloadRecommended: false } : null
      )
    }
    window.addEventListener('deload-started', onDeloadStarted)
    return () => window.removeEventListener('deload-started', onDeloadStarted)
  }, [])

  useEffect(() => {
    async function load() {
      const user = getCurrentUser()
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const [weeklyData, suggestion] = await Promise.all([
          getWeeklyHitRates(12),
          getDeloadSuggestion(planType),
        ])

        const weeksTrained = weeklyData.filter((d) => d.hitRate !== null && d.hitRate > 0).length
        const hitRates = weeklyData
          .map((d) => d.hitRate)
          .filter((r): r is number => r !== null && r > 0)

        let fatigueScore = 0

        // Time factor: more weeks trained → higher baseline fatigue
        const planSettings = getDefaultPlanSettings(planType)
        const deloadFreq = planSettings.deload_frequency_weeks ?? 6
        const timeFactor = Math.min(100, (weeksTrained / deloadFreq) * 40)
        fatigueScore += timeFactor

        // Declining hit rate: recent < earlier
        if (hitRates.length >= 6) {
          const recent = hitRates.slice(-2)
          const earlier = hitRates.slice(-6, -2)
          const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
          const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length
          if (recentAvg < earlierAvg - 10) {
            fatigueScore += 25
          } else if (recentAvg < earlierAvg - 5) {
            fatigueScore += 15
          }
        }

        // Consecutive low hit-rate weeks
        let lowStreak = 0
        for (let i = hitRates.length - 1; i >= 0; i--) {
          if (hitRates[i] < 50) lowStreak++
          else break
        }
        if (lowStreak >= 3) fatigueScore += 30
        else if (lowStreak >= 2) fatigueScore += 20
        else if (lowStreak >= 1) fatigueScore += 10

        fatigueScore = Math.min(100, Math.round(fatigueScore))

        const today = new Date().toISOString().split('T')[0]
        const inDeloadPeriodNow = isInDeloadPeriod(user.id, today)

        setData({
          weeksTrained,
          fatigueScore,
          deloadRecommended: suggestion?.shouldDeload ?? false,
          deloadReason: suggestion?.reason ?? null,
          inDeloadPeriod: inDeloadPeriodNow,
        })
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [planType])

  const handleStartDeload = () => {
    const user = getCurrentUser()
    if (!user) return
    const until = getEndOfWeek(new Date())
    setDeloadWeek(user.id, until)
    setData((prev) => prev ? { ...prev, inDeloadPeriod: true, deloadRecommended: false } : null)
    window.dispatchEvent(new CustomEvent('deload-started'))
  }

  if (loading) {
    return (
      <div className="card-glass p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Training load</h3>
        <p className="text-sm text-secondary">Loading...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="card-glass p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Training load</h3>
        <p className="text-sm text-secondary">Not enough data yet.</p>
      </div>
    )
  }

  const zone =
    data.fatigueScore < 50 ? 'green' : data.fatigueScore < 75 ? 'yellow' : 'red'
  const zoneColors = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    red: 'bg-red-500',
  }

  return (
    <div className="card-glass p-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Training load</h3>
      <p className="text-xs text-muted mb-3">
        {data.weeksTrained} week{data.weeksTrained !== 1 ? 's' : ''} of training
      </p>

      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${zoneColors[zone]}`}
          style={{ width: `${Math.min(100, data.fatigueScore)}%` }}
        />
      </div>

      {zone === 'red' && (
        <p className="text-xs text-red-400 mb-3">Consider deload</p>
      )}

      {(data.deloadRecommended || data.fatigueScore >= 75) && !data.inDeloadPeriod && (
        <button
          onClick={handleStartDeload}
          className="w-full px-4 py-2 text-sm font-medium rounded-md bg-amber-600/20 text-amber-400 border border-amber-500/50 hover:bg-amber-600/30 transition-colors"
        >
          Start deload week
        </button>
      )}

      {data.inDeloadPeriod && (
        <p className="text-xs text-amber-400">Deload week active</p>
      )}
    </div>
  )
}
