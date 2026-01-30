/**
 * Preset-specific target calculation (e.g. 5/3/1 percentage-based).
 * Used when template.preset_id is set and preset has targetStrategy !== 'default'.
 * Custom templates always use default planType-based logic in progressive-overload.ts.
 */

/** Cycle week 1–3 for 5/3/1. */
export type CycleWeek = 1 | 2 | 3

export interface SetTargetResult {
  targetWeight: number | null
  targetReps: number | null
  targetRpe: number | null
}

/**
 * 5/3/1: Week 1 = 5/5/5+, Week 2 = 3/3/3+, Week 3 = 5/3/1+
 * Percentages of training max (TM). TM is typically 90% of 1RM.
 */
const FIVE31_PERCENTAGES: Record<CycleWeek, [number, number, number]> = {
  1: [65, 75, 85],
  2: [70, 80, 90],
  3: [75, 85, 95],
}

const FIVE31_REPS: Record<CycleWeek, [number, number, number]> = {
  1: [5, 5, 5], // last set is 5+
  2: [3, 3, 3], // last set is 3+
  3: [5, 3, 1], // last set is 1+
}

/**
 * Compute target for one working set in 5/3/1.
 * @param cycleWeek 1, 2, or 3
 * @param setIndex 0-based (0 = first working set)
 * @param trainingMax Typically 90% of estimated 1RM
 */
export function calculate531SetTarget(
  cycleWeek: CycleWeek,
  setIndex: 0 | 1 | 2,
  trainingMax: number
): SetTargetResult {
  const pct = FIVE31_PERCENTAGES[cycleWeek][setIndex]
  const reps = FIVE31_REPS[cycleWeek][setIndex]
  const targetWeight = Math.round((trainingMax * (pct / 100)) * 2) / 2 // round to 0.5
  const isLastSet = setIndex === 2
  const targetRpe = isLastSet ? 9 : 8 // AMRAP on last set
  return {
    targetWeight,
    targetReps: reps,
    targetRpe,
  }
}

/**
 * Derive cycle week (1–3) from number of completed sessions for this template day.
 * Session 1 → week 1, session 2 → week 2, session 3 → week 3, session 4 → week 1, ...
 */
export function get531CycleWeek(sessionCount: number): CycleWeek {
  const w = (sessionCount % 3) || 3
  return w as CycleWeek
}
