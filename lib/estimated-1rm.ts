/**
 * Estimated one-rep max (1RM) using Epley formula.
 * Use for comparing strength across different rep ranges (e.g. 135×10 vs 185×3).
 */
export function estimated1RM(weight: number, reps: number): number {
  const r = Math.max(1, reps)
  return weight * (1 + r / 30)
}
