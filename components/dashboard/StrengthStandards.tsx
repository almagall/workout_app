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

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'elite':
        return '#fbbf24'
      case 'advanced':
        return '#22c55e'
      case 'intermediate':
        return '#3b82f6'
      case 'novice':
        return '#8b5cf6'
      default:
        return '#888888'
    }
  }

  const getTierLabel = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1)
  }

  if (loading) {
    return (
      <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6 h-[400px]">
        <h2 className="text-lg font-semibold text-white mb-4">Strength Standards</h2>
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-[#888888]">Loading...</p>
        </div>
      </div>
    )
  }

  if (needsProfile) {
    return (
      <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6 h-[400px]">
        <h2 className="text-lg font-semibold text-white mb-4">Strength Standards</h2>
        <div className="flex flex-col items-center justify-center h-[300px] text-center px-4">
          <p className="text-[#888888] mb-4">
            Set your bodyweight and gender in Settings to see how you compare to strength standards
          </p>
          <button
            onClick={() => router.push('/settings')}
            className="px-4 py-2 bg-white text-black rounded-md font-medium hover:bg-gray-200 transition-colors"
          >
            Go to Settings
          </button>
        </div>
      </div>
    )
  }

  if (standards.length === 0) {
    return (
      <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6 h-[400px]">
        <h2 className="text-lg font-semibold text-white mb-4">Strength Standards</h2>
        <div className="flex flex-col items-center justify-center h-[300px] text-center">
          <p className="text-[#888888] mb-2">No main lifts logged yet</p>
          <p className="text-sm text-[#666666]">Log Bench Press, Squat, Deadlift, or Overhead Press to see standards</p>
        </div>
      </div>
    )
  }

  // Calculate overall percentile (average)
  const avgPercentile = Math.round(
    standards.reduce((sum, s) => sum + s.percentile, 0) / standards.length
  )

  return (
    <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] overflow-hidden h-[400px] flex flex-col">
      <div className="p-4 border-b border-[#2a2a2a]">
        <h2 className="text-lg font-semibold text-white">Strength Standards</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {standards.map((standard, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <p className="text-white font-medium text-sm">{standard.exercise}</p>
                <p className="text-xs text-[#888888]">{standard.currentWeight.toFixed(0)} lbs</p>
              </div>

              {/* Tier Bar */}
              <div className="relative h-6 bg-[#2a2a2a] rounded-full overflow-hidden">
                <div className="absolute inset-0 flex">
                  <div className="flex-1 border-r border-[#1a1a1a]" title="Beginner" />
                  <div className="flex-1 border-r border-[#1a1a1a]" title="Novice" />
                  <div className="flex-1 border-r border-[#1a1a1a]" title="Intermediate" />
                  <div className="flex-1 border-r border-[#1a1a1a]" title="Advanced" />
                  <div className="flex-1" title="Elite" />
                </div>
                
                {/* Current position indicator */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                  style={{
                    left: `${(standard.percentile / 100) * 100}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-semibold"
                  style={{ color: getTierColor(standard.tier) }}
                >
                  {getTierLabel(standard.tier)} ({standard.percentile}th percentile)
                </span>
                {standard.tier !== 'elite' && (
                  <span className="text-xs text-[#888888]">
                    Next: {getTierLabel(standard.nextTierName)} at {standard.nextTierWeight} lbs
                    <span className="text-[#666666]"> (+{(standard.nextTierWeight - standard.currentWeight).toFixed(0)})</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Overall Summary */}
        <div className="mt-6 pt-4 border-t border-[#2a2a2a]">
          <p className="text-sm text-center">
            <span className="text-[#888888]">Overall: </span>
            <span className="text-white font-semibold">
              {avgPercentile >= 90
                ? 'Top 10% of lifters!'
                : avgPercentile >= 75
                ? 'Top 25% of lifters!'
                : avgPercentile >= 50
                ? 'Above average strength'
                : 'Keep pushing!'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
