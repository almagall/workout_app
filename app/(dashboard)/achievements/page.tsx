'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import {
  ACHIEVEMENT_DEFINITIONS,
  getUnlockedAchievementIds,
  checkAndUnlockAchievements,
  type AchievementDefinition,
  type AchievementTier,
} from '@/lib/achievements'

const TIER_ORDER: Record<AchievementTier, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
  legendary: 3,
}

export default function AchievementsPage() {
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const user = getCurrentUser()
      if (!user) {
        window.location.href = '/get-started'
        return
      }
      const ids = await getUnlockedAchievementIds()
      setUnlockedIds(new Set(ids))
      await checkAndUnlockAchievements()
      const afterIds = await getUnlockedAchievementIds()
      setUnlockedIds(new Set(afterIds))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-[#888888]">Loading...</div>
      </div>
    )
  }

  const unlockedCount = unlockedIds.size
  const orderedAchievements = [...ACHIEVEMENT_DEFINITIONS].sort(
    (a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]
  )

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-white mb-2">Achievements</h1>
      <p className="text-[#888888] mb-6">
        {unlockedCount} of {ACHIEVEMENT_DEFINITIONS.length} unlocked
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {orderedAchievements.map((achievement) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            unlocked={unlockedIds.has(achievement.id)}
          />
        ))}
      </div>
    </div>
  )
}

function AchievementCard({
  achievement,
  unlocked,
}: {
  achievement: AchievementDefinition
  unlocked: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-5 flex flex-col ${
        unlocked
          ? 'bg-amber-950/30 border-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.2)]'
          : 'bg-[#111111] border-[#2a2a2a] opacity-80'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`text-2xl flex-shrink-0 ${unlocked ? '' : 'grayscale opacity-60'}`}
          aria-hidden
        >
          {achievement.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-white">{achievement.name}</h2>
          </div>
          <p className="text-sm text-[#a1a1a1] mt-1">{achievement.description}</p>
          {unlocked && (
            <p className="text-xs text-amber-400/90 mt-2">Unlocked</p>
          )}
        </div>
      </div>
    </div>
  )
}
