'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAllStrengthStandards } from '@/lib/strength-standards'
import type { StrengthStandard } from '@/types/profile'

export default function StrengthStandards() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [standards, setStandards] = useState<StrengthStandard[]>([])
  const [needsProfile, setNeedsProfile] = useState(false)

  useEffect(() => {
    async function loadStandards() {
      setLoading(true)
      const data = await getAllStrengthStandards()
      
      if (data.length === 0) {
        setNeedsProfile(true)
      } else {
        setStandards(data)
      }
      
      setLoading(false)
    }

    loadStandards()
  }, [])

  const tierConfig: Record<string, { color: string; bgGlow: string; label: string; segmentStart: number }> = {
    beginner: { color: '#6b7280', bgGlow: 'rgba(107, 114, 128, 0.15)', label: 'Beginner', segmentStart: 0 },
    novice: { color: '#8b5cf6', bgGlow: 'rgba(139, 92, 246, 0.15)', label: 'Novice', segmentStart: 20 },
    intermediate: { color: '#3b82f6', bgGlow: 'rgba(59, 130, 246, 0.15)', label: 'Intermediate', segmentStart: 40 },
    advanced: { color: '#22c55e', bgGlow: 'rgba(34, 197, 94, 0.15)', label: 'Advanced', segmentStart: 60 },
    elite: { color: '#fbbf24', bgGlow: 'rgba(251, 191, 36, 0.15)', label: 'Elite', segmentStart: 80 },
  }
  const getTier = (tier: string) => tierConfig[tier] ?? tierConfig.beginner

  // Compute bar position from weight progress within current tier (0 = just entered, 1 = about to reach next)
  function getBarPosition(standard: { currentWeight: number; currentTierWeight: number; nextTierWeight: number; tier: string }): number {
    const tier = getTier(standard.tier)
    const segmentSize = 20
    if (standard.tier === 'elite') return tier.segmentStart + segmentSize / 2
    const weightRange = standard.nextTierWeight - standard.currentTierWeight
    const progress = weightRange > 0
      ? Math.min(1, (standard.currentWeight - standard.currentTierWeight) / weightRange)
      : 1
    return tier.segmentStart + progress * segmentSize
  }

  if (loading) {
    return (
      <div className="bg-[#0d0d0d] rounded-xl border border-[#252525] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
        <div className="p-4 sm:p-5 border-b border-[#252525] bg-gradient-to-b from-[#141414] to-transparent">
          <h2 className="text-lg font-semibold text-white tracking-tight">Strength Standards</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <p className="text-[#666]">Loading...</p>
        </div>
      </div>
    )
  }

  if (needsProfile) {
    return (
      <div className="bg-[#0d0d0d] rounded-xl border border-[#252525] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
        <div className="p-4 sm:p-5 border-b border-[#252525] bg-gradient-to-b from-[#141414] to-transparent">
          <h2 className="text-lg font-semibold text-white tracking-tight">Strength Standards</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
          <p className="text-[#888] mb-5">
            Set your bodyweight and gender in Settings to see how you compare to strength standards
          </p>
          <button
            onClick={() => router.push('/settings')}
            className="px-5 py-2.5 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Go to Settings
          </button>
        </div>
      </div>
    )
  }

  if (standards.length === 0) {
    return (
      <div className="bg-[#0d0d0d] rounded-xl border border-[#252525] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
        <div className="p-4 sm:p-5 border-b border-[#252525] bg-gradient-to-b from-[#141414] to-transparent">
          <h2 className="text-lg font-semibold text-white tracking-tight">Strength Standards</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
          <p className="text-[#888] mb-2">No main lifts logged yet</p>
          <p className="text-sm text-[#666]">Log Bench Press, Squat, Deadlift, or Overhead Press to see standards</p>
        </div>
      </div>
    )
  }

  // Overall message based on average tier (beginner=0 .. elite=4)
  const tierOrder = { beginner: 0, novice: 1, intermediate: 2, advanced: 3, elite: 4 }
  const avgTierIndex = standards.reduce((sum, s) => sum + tierOrder[s.tier], 0) / standards.length
  const overallMessage =
    avgTierIndex >= 3.5
      ? { text: 'Top 10% of lifters!', color: '#fbbf24', icon: '★' }
      : avgTierIndex >= 2.5
      ? { text: 'Top 25% of lifters!', color: '#22c55e', icon: '◆' }
      : avgTierIndex >= 1.5
      ? { text: 'Above average strength', color: '#3b82f6', icon: '●' }
      : { text: 'Keep pushing!', color: '#8b5cf6', icon: '▲' }

  return (
    <div className="bg-[#0d0d0d] rounded-xl border border-[#252525] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="p-4 border-b border-[#252525] bg-gradient-to-b from-[#141414] to-transparent">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white tracking-tight">Strength Standards</h2>
          <div
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              color: overallMessage.color,
              backgroundColor: `${overallMessage.color}20`,
              borderColor: `${overallMessage.color}40`,
              borderWidth: '1px',
            }}
          >
            {overallMessage.icon} {overallMessage.text}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:pb-0 lg:mx-0 lg:px-0">
          {standards.map((standard, index) => {
            const tier = getTier(standard.tier)
            const nextTier = getTier(standard.nextTierName)
            return (
              <div
                key={index}
                className="relative rounded-lg border border-[#252525] bg-[#141414] p-4 sm:p-5 min-w-[240px] sm:min-w-0 flex-shrink-0 lg:flex-shrink lg:min-w-0 overflow-hidden group hover:border-[#333] transition-colors duration-200"
              >
                {/* Subtle tier glow */}
                <div
                  className="absolute inset-0 opacity-30 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse 80% 50% at 0% 50%, ${tier.bgGlow}, transparent)`,
                  }}
                />

                <div className="relative space-y-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-white font-semibold text-sm truncate">{standard.exercise}</p>
                    <span className="text-sm font-bold text-white tabular-nums shrink-0">
                      {standard.currentWeight.toFixed(0)}
                      <span className="text-[#666] font-normal text-xs ml-0.5">lbs</span>
                    </span>
                  </div>

                  {/* Tier progress spectrum bar with quartile ticks and labels */}
                  <div className="space-y-2">
                    <div className="relative h-4 rounded-full overflow-hidden flex">
                      {/* Discrete segments - each classification has a unique solid color */}
                      <div className="flex-1 bg-[#4b5563]" title="Beginner" />
                      <div className="flex-1 bg-[#8b5cf6]" title="Novice" />
                      <div className="flex-1 bg-[#3b82f6]" title="Intermediate" />
                      <div className="flex-1 bg-[#22c55e]" title="Advanced" />
                      <div className="flex-1 bg-[#fbbf24]" title="Elite" />
                      {/* Quartile tick marks at 20%, 40%, 60%, 80% */}
                      {[20, 40, 60, 80].map((pct) => (
                        <div
                          key={pct}
                          className="absolute top-0 bottom-0 w-px bg-[#333] z-[1]"
                          style={{ left: `${pct}%` }}
                        />
                      ))}
                    {/* Current position marker - based on weight progress within tier */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-white bg-[#404040] shadow-sm transition-transform group-hover:scale-110 z-[2]"
                      style={{
                        left: `clamp(0px, calc(${getBarPosition(standard)}% - 6px), calc(100% - 12px))`,
                      }}
                    />
                    </div>
                    {/* Lifter classification labels */}
                    <div className="relative flex justify-between text-[10px] font-medium px-0.5">
                      <span className="text-center truncate" style={{ width: '20%', color: '#6b7280' }}>Beg</span>
                      <span className="text-center truncate" style={{ width: '20%', color: '#8b5cf6' }}>Nov</span>
                      <span className="text-center truncate" style={{ width: '20%', color: '#3b82f6' }}>Int</span>
                      <span className="text-center truncate" style={{ width: '20%', color: '#22c55e' }}>Adv</span>
                      <span className="text-center truncate" style={{ width: '20%', color: '#fbbf24' }}>Elite</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"
                      style={{
                        color: tier.color,
                        backgroundColor: `${tier.color}18`,
                      }}
                    >
                      {tier.label}
                    </div>
                    {standard.tier !== 'elite' && (
                      <p className="text-[11px] text-[#888] leading-tight">
                        Next tier: <span style={{ color: nextTier.color }}>{standard.nextTierWeight} lbs</span>
                        <span className="text-[#555]"> (+{(standard.nextTierWeight - standard.currentWeight).toFixed(0)})</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
