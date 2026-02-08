/**
 * Short explanations for why a target was suggested.
 * Kept under ~80 characters when possible.
 */

import type { PlanType, PerformanceStatus } from '@/types/workout'
import type { PlanSettings } from './progressive-overload'

export type TargetStrategy = 'default' | '531' | 'linear' | 'gzclp' | 'texas'

export function getTargetExplanation(
  performanceStatus: PerformanceStatus,
  planType: PlanType,
  consecutiveUnderperformance: number,
  strategy: TargetStrategy = 'default',
  strategyContext?: { cycleWeek?: number; weekLabel?: string }
): string {
  if (strategy !== 'default') {
    return getPresetStrategyExplanation(strategy, strategyContext)
  }

  switch (performanceStatus) {
    case 'overperformed':
      return 'You beat last time—slightly higher target to keep progressing.'
    case 'met_target':
      return planType === 'hypertrophy'
        ? 'Same weight, +1 rep from last session.'
        : 'Met target—small weight bump this week.'
    case 'underperformed':
      if (consecutiveUnderperformance === 0) {
        return 'Holding steady—aim for this again next time.'
      }
      if (consecutiveUnderperformance === 1) {
        return 'Reduced slightly to allow recovery.'
      }
      return 'Lightened to support recovery. Consider a deload week.'
    default:
      return 'Based on your last performance.'
  }
}

function getPresetStrategyExplanation(
  strategy: TargetStrategy,
  context?: { cycleWeek?: number; weekLabel?: string }
): string {
  switch (strategy) {
    case '531': {
      const week = context?.cycleWeek ?? 0
      const pct = week === 1 ? '65–85%' : week === 2 ? '70–90%' : '75–95%'
      return `5/3/1 Week ${week}: ${pct} of training max.`
    }
    case 'linear':
      return 'Linear progression: +5 lb upper / +10 lb lower.'
    case 'gzclp':
      return 'GZCLP: AMRAP on T1, progression based on reps.'
    case 'texas':
      const day = context?.weekLabel ?? ''
      return day ? `Texas Method ${day}.` : 'Texas Method: volume/intensity rotation.'
    default:
      return 'Program-based target.'
  }
}
