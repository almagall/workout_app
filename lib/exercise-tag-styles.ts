/**
 * Shared styles for exercise equipment and muscle group tags.
 * Used in Exercise Database, Exercise Detail Modal, and Workout Logger.
 */

export const EQUIPMENT_STYLES: Record<string, string> = {
  Barbell: 'bg-slate-600/30 text-slate-300 border border-slate-500/40',
  Dumbbell: 'bg-violet-600/30 text-violet-300 border border-violet-500/40',
  Cable: 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40',
  Machine: 'bg-amber-600/30 text-amber-300 border border-amber-500/40',
  Bodyweight: 'bg-green-600/30 text-green-300 border border-green-500/40',
}

export const MUSCLE_GROUP_STYLES: Record<string, string> = {
  Chest: 'bg-rose-600/30 text-rose-300 border border-rose-500/40',
  Back: 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40',
  Shoulders: 'bg-blue-600/30 text-blue-300 border border-blue-500/40',
  Biceps: 'bg-orange-600/30 text-orange-300 border border-orange-500/40',
  Triceps: 'bg-teal-600/30 text-teal-300 border border-teal-500/40',
  Legs: 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40',
  Calves: 'bg-purple-600/30 text-purple-300 border border-purple-500/40',
  Core: 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/40',
}

export const MUSCLE_GROUP_STYLES_SECONDARY: Record<string, string> = {
  Chest: 'bg-rose-600/15 text-rose-400/90 border border-rose-500/25',
  Back: 'bg-emerald-600/15 text-emerald-400/90 border border-emerald-500/25',
  Shoulders: 'bg-blue-600/15 text-blue-400/90 border border-blue-500/25',
  Biceps: 'bg-orange-600/15 text-orange-400/90 border border-orange-500/25',
  Triceps: 'bg-teal-600/15 text-teal-400/90 border border-teal-500/25',
  Legs: 'bg-indigo-600/15 text-indigo-400/90 border border-indigo-500/25',
  Calves: 'bg-purple-600/15 text-purple-400/90 border border-purple-500/25',
  Core: 'bg-yellow-600/15 text-yellow-400/90 border border-yellow-500/25',
}

export function getEquipmentStyle(equipment: string): string {
  return EQUIPMENT_STYLES[equipment] ?? 'bg-[#2a2a2a] text-[#888888] border border-[#2a2a2a]'
}

export function getMuscleGroupStyle(muscleGroup: string, isSecondary?: boolean): string {
  const styles = isSecondary ? MUSCLE_GROUP_STYLES_SECONDARY : MUSCLE_GROUP_STYLES
  return styles[muscleGroup] ?? 'bg-[#2a2a2a] text-[#888888] border border-[#2a2a2a]'
}
