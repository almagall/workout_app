/**
 * Plate calculator for barbell exercises.
 * Shows which plates to load per side for a given total weight.
 * Supports user-configured plate availability.
 */

const DEFAULT_BAR_WEIGHT = 45
export const STANDARD_PLATES = [45, 25, 10, 5, 2.5, 1.25] // lbs per side

export interface PlateConfig {
  barWeight: number
  plates: number[]
}

export interface PlateBreakdown {
  perSide: number[]
  display: string
}

const PLATE_CONFIG_KEY = 'plate_config'

/** Get user's plate config from localStorage. Returns default if missing. */
export function getPlateConfig(userId: string): PlateConfig {
  if (typeof window === 'undefined') {
    return { barWeight: DEFAULT_BAR_WEIGHT, plates: [...STANDARD_PLATES] }
  }
  const raw = localStorage.getItem(`${PLATE_CONFIG_KEY}_${userId}`)
  if (!raw) return { barWeight: DEFAULT_BAR_WEIGHT, plates: [...STANDARD_PLATES] }
  try {
    const parsed = JSON.parse(raw) as { barWeight?: number; plates?: number[] }
    return {
      barWeight: typeof parsed.barWeight === 'number' ? parsed.barWeight : DEFAULT_BAR_WEIGHT,
      plates: Array.isArray(parsed.plates) && parsed.plates.length > 0 ? parsed.plates : [...STANDARD_PLATES],
    }
  } catch {
    return { barWeight: DEFAULT_BAR_WEIGHT, plates: [...STANDARD_PLATES] }
  }
}

/** Save plate config to localStorage. */
export function savePlateConfig(userId: string, config: PlateConfig): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${PLATE_CONFIG_KEY}_${userId}`, JSON.stringify(config))
}

/**
 * Round raw weight to nearest loadable weight using available plates.
 * Uses bar + 2 * (combination of plates). Rounds to nearest loadable.
 */
export function roundToLoadableWeight(
  rawWeight: number,
  plates: number[],
  barWeight: number = 45
): number {
  if (!rawWeight || rawWeight <= barWeight) return barWeight
  if (!plates.length) return Math.round(rawWeight / 2.5) * 2.5

  const weightPerSide = (rawWeight - barWeight) / 2
  if (weightPerSide <= 0) return barWeight

  const loadablePerSide = getAchievableWeightsPerSide(plates, weightPerSide + 25)
  if (loadablePerSide.length === 0) return Math.round(rawWeight / 2.5) * 2.5

  const nearest = loadablePerSide.reduce((best, val) =>
    Math.abs(val - weightPerSide) < Math.abs(best - weightPerSide) ? val : best
  )
  return barWeight + nearest * 2
}

/** Generate all achievable weights per side (up to maxPerSide) using plates (any count each). */
function getAchievableWeightsPerSide(plates: number[], maxPerSide: number): number[] {
  const achievable = new Set<number>([0])
  for (const p of plates) {
    const add: number[] = []
    achievable.forEach((v) => {
      let n = v
      while (n + p <= maxPerSide + 0.01) {
        n += p
        add.push(n)
      }
    })
    add.forEach((a) => achievable.add(a))
  }
  return Array.from(achievable).filter((v) => v > 0)
}

/**
 * Compute plate breakdown for a barbell lift.
 * @param totalWeight - Total weight including bar (lbs)
 * @param barWeight - Bar weight (default 45 lbs)
 * @param plates - Available plates per side (default STANDARD_PLATES)
 */
export function getPlateBreakdown(
  totalWeight: number,
  barWeight: number = DEFAULT_BAR_WEIGHT,
  plates: number[] = STANDARD_PLATES
): PlateBreakdown | null {
  if (!totalWeight || totalWeight <= 0) return null
  if (totalWeight < barWeight) return null

  const weightPerSide = (totalWeight - barWeight) / 2
  if (weightPerSide < 0) return null

  const sortedPlates = [...plates].sort((a, b) => b - a)
  let remaining = weightPerSide
  const perSide: number[] = []

  for (const plate of sortedPlates) {
    while (remaining >= plate - 0.01) {
      perSide.push(plate)
      remaining -= plate
    }
  }

  if (remaining > 0.5) return null

  const plateStr =
    perSide.length === 0
      ? 'empty bar'
      : perSide
          .sort((a, b) => b - a)
          .map((p) => p.toString())
          .join(' + ')

  const display = perSide.length === 0
    ? `${totalWeight} lbs = ${barWeight} bar (empty)`
    : `${totalWeight} lbs = ${barWeight} bar + ${plateStr} each side`

  return { perSide, display }
}

/**
 * Check if an exercise uses a barbell (for showing plate calculator).
 */
export function isBarbellExercise(exerciseName: string): boolean {
  const lower = exerciseName.toLowerCase()
  return lower.includes('barbell') || lower.includes('bb-')
}
