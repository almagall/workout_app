'use client'

import type { ExerciseEntry } from '@/lib/exercise-database'
import { getExerciseAlternativesWithEquipment } from '@/lib/exercise-database'
import { MuscleDiagram } from './MuscleDiagram'

const EQUIPMENT_ORDER = ['Cable', 'Dumbbell', 'Machine', 'Barbell', 'Bodyweight', 'Other'] as const

const EQUIPMENT_STYLES: Record<string, string> = {
  Barbell: 'bg-slate-600/30 text-slate-300 border border-slate-500/40',
  Dumbbell: 'bg-violet-600/30 text-violet-300 border border-violet-500/40',
  Cable: 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40',
  Machine: 'bg-amber-600/30 text-amber-300 border border-amber-500/40',
  Bodyweight: 'bg-green-600/30 text-green-300 border border-green-500/40',
}

const MUSCLE_GROUP_STYLES: Record<string, string> = {
  Chest: 'bg-rose-600/30 text-rose-300 border border-rose-500/40',
  Back: 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40',
  Shoulders: 'bg-blue-600/30 text-blue-300 border border-blue-500/40',
  Biceps: 'bg-orange-600/30 text-orange-300 border border-orange-500/40',
  Triceps: 'bg-teal-600/30 text-teal-300 border border-teal-500/40',
  Legs: 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40',
  Calves: 'bg-purple-600/30 text-purple-300 border border-purple-500/40',
  Core: 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/40',
}

const MUSCLE_GROUP_STYLES_SECONDARY: Record<string, string> = {
  Chest: 'bg-rose-600/15 text-rose-400/90 border border-rose-500/25',
  Back: 'bg-emerald-600/15 text-emerald-400/90 border border-emerald-500/25',
  Shoulders: 'bg-blue-600/15 text-blue-400/90 border border-blue-500/25',
  Biceps: 'bg-orange-600/15 text-orange-400/90 border border-orange-500/25',
  Triceps: 'bg-teal-600/15 text-teal-400/90 border border-teal-500/25',
  Legs: 'bg-indigo-600/15 text-indigo-400/90 border border-indigo-500/25',
  Calves: 'bg-purple-600/15 text-purple-400/90 border border-purple-500/25',
  Core: 'bg-yellow-600/15 text-yellow-400/90 border border-yellow-500/25',
}

function getEquipmentStyle(equipment: string): string {
  return EQUIPMENT_STYLES[equipment] ?? 'bg-[#2a2a2a] text-[#888888] border border-[#2a2a2a]'
}

function getMuscleGroupStyle(muscleGroup: string, isSecondary?: boolean): string {
  const styles = isSecondary ? MUSCLE_GROUP_STYLES_SECONDARY : MUSCLE_GROUP_STYLES
  return styles[muscleGroup] ?? 'bg-[#2a2a2a] text-[#888888] border border-[#2a2a2a]'
}

interface ExerciseDetailModalProps {
  exercise: ExerciseEntry | null
  onClose: () => void
  /** When provided, alternatives become clickable and trigger a swap. Used in WorkoutLogger. */
  onSelectAlternative?: (exerciseName: string) => void
}

export function ExerciseDetailModal({ exercise, onClose, onSelectAlternative }: ExerciseDetailModalProps) {
  if (!exercise) return null

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold text-white">{exercise.name}</h2>
            <button
              onClick={onClose}
              className="shrink-0 p-1 rounded text-[#888888] hover:text-white hover:bg-[#2a2a2a] transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-[#888888] mb-4">
            {exercise.description ?? `A ${exercise.equipment} exercise targeting ${exercise.muscleGroup}.`}
          </p>

          <div className="flex flex-col gap-1.5 mb-6">
            <div className="flex items-center gap-1.5">
              <span className="w-[4.5rem] shrink-0 text-[10px] uppercase tracking-wider text-[#999]">Equipment</span>
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${getEquipmentStyle(exercise.equipment)}`}>
                {exercise.equipment}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-[4.5rem] shrink-0 text-[10px] uppercase tracking-wider text-[#999]">Primary</span>
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${getMuscleGroupStyle(exercise.muscleGroup)}`}>
                {exercise.muscleGroup}
              </span>
            </div>
            {(exercise.secondaryMuscleGroups ?? []).length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="w-[4.5rem] shrink-0 text-[10px] uppercase tracking-wider text-[#999]">Secondary</span>
                {(exercise.secondaryMuscleGroups ?? []).map((mg) => (
                  <span key={mg} className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${getMuscleGroupStyle(mg, true)}`}>
                    {mg}
                  </span>
                ))}
              </div>
            )}
          </div>

          {(() => {
            const alternativesWithEquipment = getExerciseAlternativesWithEquipment(exercise.name)
            if (alternativesWithEquipment.length === 0) return null
            const byEquipment = alternativesWithEquipment.reduce<Record<string, string[]>>((acc, { name, equipment }) => {
              const key = equipment || 'Other'
              if (!acc[key]) acc[key] = []
              acc[key].push(name)
              return acc
            }, {})
            return (
              <div className="pt-4 border-t border-[#2a2a2a] mb-4">
                <h3 className="text-sm font-medium text-white mb-2">Alternatives</h3>
                <p className="text-xs text-[#888888] mb-3 flex items-center gap-1">
                  Equipment taken? Swap to the same movement with different equipment.
                  <span
                    className="inline-flex cursor-help text-[#666666] hover:text-[#888888]"
                    title="Targets are based on each exercise's own history. Your first time with an alternative establishes a new baseline."
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </p>
                <div className="flex flex-col gap-3">
                  {EQUIPMENT_ORDER.filter((eq) => byEquipment[eq]?.length).map((equipment) => (
                    <div key={equipment}>
                      <span className="inline-block text-[10px] uppercase tracking-wider text-[#999] mb-1.5">
                        {equipment}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {byEquipment[equipment].map((name) =>
                          onSelectAlternative ? (
                            <button
                              key={name}
                              type="button"
                              onClick={() => {
                                onSelectAlternative(name)
                                onClose()
                              }}
                              className={`text-xs px-2.5 py-1 rounded-md border transition-colors text-left ${getEquipmentStyle(equipment)} hover:opacity-90`}
                            >
                              {name}
                            </button>
                          ) : (
                            <span
                              key={name}
                              className={`text-xs px-2.5 py-1 rounded-md border ${getEquipmentStyle(equipment)}`}
                            >
                              {name}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                  {Object.keys(byEquipment)
                    .filter((eq) => !EQUIPMENT_ORDER.includes(eq as (typeof EQUIPMENT_ORDER)[number]))
                    .map((equipment) => (
                      <div key={equipment}>
                        <span className="inline-block text-[10px] uppercase tracking-wider text-[#999] mb-1.5">
                          {equipment}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {byEquipment[equipment].map((name) =>
                            onSelectAlternative ? (
                              <button
                                key={name}
                                type="button"
                                onClick={() => {
                                  onSelectAlternative(name)
                                  onClose()
                                }}
                                className={`text-xs px-2.5 py-1 rounded-md border transition-colors text-left ${getEquipmentStyle(equipment)} hover:opacity-90`}
                              >
                                {name}
                              </button>
                            ) : (
                              <span
                                key={name}
                                className={`text-xs px-2.5 py-1 rounded-md border ${getEquipmentStyle(equipment)}`}
                              >
                                {name}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )
          })()}

          <div className="pt-4 border-t border-[#2a2a2a]">
            <h3 className="text-sm font-medium text-white mb-3">Muscles worked</h3>
            <MuscleDiagram primaryMuscleGroup={exercise.muscleGroup} secondaryMuscleGroups={exercise.secondaryMuscleGroups} />
          </div>
        </div>
      </div>
    </div>
  )
}
