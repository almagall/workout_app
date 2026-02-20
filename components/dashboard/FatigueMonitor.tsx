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

const ZONE_INSIGHTS: Record<'green' | 'yellow' | 'red', string> = {
  green: 'You\'re well-recovered. Push hard and aim for PRs this week.',
  yellow: 'Accumulated load is building. Prioritize sleep and nutrition to sustain performance.',
  red: 'High fatigue detected. A deload week will help you recover and come back stronger.',
}

function FatigueGauge({ score, zone }: { score: number; zone: 'green' | 'yellow' | 'red' }) {
  // Convert score (0–100) to needle angle. score=0 → left (π), score=100 → right (0).
  const angle = (1 - score / 100) * Math.PI
  const needleX = 100 + 62 * Math.cos(angle)
  const needleY = 100 - 62 * Math.sin(angle)

  // Zone boundary tick positions (on arc, r=75) and outer endpoints (r=88)
  const tick50 = { x: 100, y: 25 }
  const outer50 = { x: 100, y: 13 }
  const tick75 = { x: 153.03, y: 46.97 }
  const outer75 = {
    x: 100 + 88 * Math.cos(Math.PI / 4),
    y: 100 - 88 * Math.sin(Math.PI / 4),
  }

  const zoneColor = zone === 'green' ? '#22c55e' : zone === 'yellow' ? '#f59e0b' : '#ef4444'
  const zoneLabel = zone === 'green' ? 'Fresh' : zone === 'yellow' ? 'Moderate' : 'Consider Deload'

  return (
    <div className="flex flex-col items-center gap-2">
      {/* viewBox tall enough to contain score label (y=130) + padding */}
      <svg viewBox="0 0 200 135" className="w-full max-w-[260px]">
        {/* Dim background full arc */}
        <path
          d="M 25 100 A 75 75 0 0 1 175 100"
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="15"
        />

        {/* Green zone: score 0–50 (left → top) */}
        <path
          d="M 25 100 A 75 75 0 0 1 100 25"
          fill="none"
          stroke="#22c55e"
          strokeWidth="15"
          opacity={zone === 'green' ? '1' : '0.35'}
        />

        {/* Yellow zone: score 50–75 (top → ~45°) */}
        <path
          d="M 100 25 A 75 75 0 0 1 153.03 46.97"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="15"
          opacity={zone === 'yellow' ? '1' : '0.35'}
        />

        {/* Red zone: score 75–100 (~45° → right) */}
        <path
          d="M 153.03 46.97 A 75 75 0 0 1 175 100"
          fill="none"
          stroke="#ef4444"
          strokeWidth="15"
          opacity={zone === 'red' ? '1' : '0.35'}
        />

        {/* Zone boundary ticks */}
        <line x1={tick50.x} y1={tick50.y} x2={outer50.x} y2={outer50.y} stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1={tick75.x} y1={tick75.y} x2={outer75.x} y2={outer75.y} stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />

        {/* Scale labels */}
        <text x="20"  y="114" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8">0</text>
        <text x="100" y="11"  textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8">50</text>
        <text x="180" y="114" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8">100</text>

        {/* Needle shadow */}
        <line x1="100" y1="100" x2={needleX + 0.8} y2={needleY + 0.8} stroke="rgba(0,0,0,0.5)" strokeWidth="2.5" strokeLinecap="round" />
        {/* Needle */}
        <line x1="100" y1="100" x2={needleX} y2={needleY} stroke="white" strokeWidth="2" strokeLinecap="round" />

        {/* Pivot circle */}
        <circle cx="100" cy="100" r="6"   fill="#111113" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="2.5" fill="white" />

        {/* Score number — safely inside the viewBox at y=130 */}
        <text x="100" y="130" textAnchor="middle" fill={zoneColor} fontSize="20" fontWeight="bold">
          {score}
        </text>
      </svg>

      {/* Zone status badge */}
      <span
        className="text-xs font-semibold px-3 py-1 rounded-full"
        style={{
          color: zoneColor,
          backgroundColor: `${zoneColor}18`,
          border: `1px solid ${zoneColor}35`,
        }}
      >
        {zoneLabel}
      </span>
    </div>
  )
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
      <div className="card-glass card-accent-top p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Fatigue Score</h3>
        <p className="text-sm text-secondary">Loading...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="card-glass card-accent-top p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Fatigue Score</h3>
        <p className="text-sm text-secondary">Not enough data yet.</p>
      </div>
    )
  }

  const zone =
    data.fatigueScore < 50 ? 'green' : data.fatigueScore < 75 ? 'yellow' : 'red'

  return (
    <div className="card-glass card-accent-top p-6">
      <div
        className="absolute -top-10 -left-10 w-40 h-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }}
      />
      <div className="relative">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-2 mb-4">
          <span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Fatigue Score
        </h3>

        <FatigueGauge score={data.fatigueScore} zone={zone} />

        <p className="text-xs text-muted text-center mt-3 leading-relaxed">
          {ZONE_INSIGHTS[zone]}
        </p>

        {(data.deloadRecommended || data.fatigueScore >= 75) && !data.inDeloadPeriod && (
          <button
            onClick={handleStartDeload}
            className="w-full mt-3 px-4 py-2 text-sm font-medium rounded-md bg-amber-600/20 text-amber-400 border border-amber-500/50 hover:bg-amber-600/30 transition-colors"
          >
            Start deload week
          </button>
        )}

        {data.inDeloadPeriod && (
          <p className="text-xs text-amber-400 text-center mt-3">Deload week active</p>
        )}
      </div>
    </div>
  )
}
