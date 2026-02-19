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
import TrophyIcon from '@/components/achievements/TrophyIcon'

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
        <div className="text-muted">Loading...</div>
      </div>
    )
  }

  const unlockedCount = unlockedIds.size
  const totalCount = ACHIEVEMENT_DEFINITIONS.length
  const percentage = Math.round((unlockedCount / totalCount) * 100)
  
  const orderedAchievements = [...ACHIEVEMENT_DEFINITIONS].sort(
    (a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]
  )
  
  const unlockedAchievements = orderedAchievements.filter((a) => unlockedIds.has(a.id))
  const lockedAchievements = orderedAchievements.filter((a) => !unlockedIds.has(a.id))

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display text-3xl font-bold text-foreground mb-6 tracking-tight">Achievements</h1>
      
      {/* Progress Header */}
      <div className="flex items-center justify-center mb-10">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 56}
              strokeDashoffset={2 * Math.PI * 56 * (1 - unlockedCount / totalCount)}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground">{unlockedCount}</span>
            <span className="text-xs text-muted">of {totalCount}</span>
          </div>
        </div>
        <div className="ml-6">
          <p className="text-xl font-semibold text-foreground">{percentage}% Complete</p>
          <p className="text-sm text-muted mt-1">
            {unlockedCount === totalCount
              ? 'All achievements unlocked!'
              : `${totalCount - unlockedCount} more to unlock`}
          </p>
        </div>
      </div>

      {/* Your Trophies Section */}
      <div className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">Your Trophies</h2>
        {unlockedAchievements.length === 0 ? (
          <div className="card-glass p-8 text-center">
            <p className="text-muted">No achievements unlocked yet. Start working out to unlock your first!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {unlockedAchievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                unlocked={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Locked Achievements Section */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">Locked Achievements</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {lockedAchievements.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              unlocked={false}
            />
          ))}
        </div>
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
      className={`rounded-lg border p-4 flex flex-col items-center text-center transition-all ${
        unlocked
          ? 'bg-amber-950/30 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)] hover:scale-105 hover:border-amber-300'
          : 'bg-card border-white/[0.06] opacity-70'
      }`}
    >
      <div className="relative mb-2">
        {unlocked ? (
          <TrophyIcon className="w-16 h-16" />
        ) : (
          <>
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-white/[0.04]">
              <span className="text-3xl grayscale opacity-60" aria-hidden>
                {achievement.icon}
              </span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 text-sm">🔒</div>
          </>
        )}
      </div>
      <h3 className="text-sm font-semibold text-foreground leading-tight mt-1">{achievement.name}</h3>
      <p className="text-xs text-secondary mt-1.5 leading-snug">{achievement.description}</p>
    </div>
  )
}
