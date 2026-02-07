'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import { getExerciseList } from '@/lib/exercise-database'
import type { ExerciseEntry } from '@/lib/exercise-database'
import { ExerciseDetailModal } from '@/components/exercises/ExerciseDetailModal'

const MUSCLE_GROUP_ORDER = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Calves', 'Core']

const EQUIPMENT_ORDER = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight']

type ViewMode = 'muscleGroup' | 'equipment'

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

function groupByMuscleGroup(exercises: ExerciseEntry[]): Record<string, ExerciseEntry[]> {
  const grouped: Record<string, ExerciseEntry[]> = {}
  for (const exercise of exercises) {
    const group = exercise.muscleGroup
    if (!grouped[group]) grouped[group] = []
    grouped[group].push(exercise)
  }
  return grouped
}

function groupByEquipment(exercises: ExerciseEntry[]): Record<string, ExerciseEntry[]> {
  const grouped: Record<string, ExerciseEntry[]> = {}
  for (const exercise of exercises) {
    const group = exercise.equipment
    if (!grouped[group]) grouped[group] = []
    grouped[group].push(exercise)
  }
  // Sort exercises within each equipment group by muscle group, then name
  for (const group of Object.keys(grouped)) {
    grouped[group].sort((a, b) => {
      const muscleOrder = MUSCLE_GROUP_ORDER.indexOf(a.muscleGroup) - MUSCLE_GROUP_ORDER.indexOf(b.muscleGroup)
      return muscleOrder !== 0 ? muscleOrder : a.name.localeCompare(b.name)
    })
  }
  return grouped
}

function ExerciseCard({ exercise, onClick }: { exercise: ExerciseEntry; onClick?: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
      className="bg-[#1a1a1a] rounded-lg p-4 hover:bg-[#222222] transition-colors border border-[#2a2a2a] cursor-pointer"
    >
      <h3 className="text-lg font-semibold text-white mb-2">{exercise.name}</h3>
      <p className="text-sm text-[#888888] mb-3">
        {exercise.description ?? `A ${exercise.equipment} exercise targeting ${exercise.muscleGroup}.`}
      </p>
      <div className="flex flex-col gap-1.5">
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
    </div>
  )
}

export default function ExerciseDatabasePage() {
  const [muscleGrouped, setMuscleGrouped] = useState<Record<string, ExerciseEntry[]>>({})
  const [equipmentGrouped, setEquipmentGrouped] = useState<Record<string, ExerciseEntry[]>>({})
  const [viewMode, setViewMode] = useState<ViewMode>('muscleGroup')
  const [loading, setLoading] = useState(true)
  const [selectedExercise, setSelectedExercise] = useState<ExerciseEntry | null>(null)

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      window.location.href = '/get-started'
      return
    }

    const exercises = getExerciseList()
    setMuscleGrouped(groupByMuscleGroup(exercises))
    setEquipmentGrouped(groupByEquipment(exercises))
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-[#888888]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-white">Exercise Database</h1>
        <div className="flex rounded-lg border border-[#2a2a2a] p-1 bg-[#0a0a0a]">
          <button
            onClick={() => setViewMode('muscleGroup')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'muscleGroup'
                ? 'bg-white text-black'
                : 'text-[#888888] hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            By Muscle Group
          </button>
          <button
            onClick={() => setViewMode('equipment')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'equipment'
                ? 'bg-white text-black'
                : 'text-[#888888] hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            By Equipment
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {viewMode === 'muscleGroup'
          ? MUSCLE_GROUP_ORDER.map((group) => {
              const exercises = muscleGrouped[group]
              if (!exercises?.length) return null

              return (
                <section key={group}>
                  <h2 className="text-xl font-semibold text-white mb-4">{group}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {exercises.map((exercise) => (
                      <ExerciseCard key={exercise.id} exercise={exercise} onClick={() => setSelectedExercise(exercise)} />
                    ))}
                  </div>
                </section>
              )
            })
          : EQUIPMENT_ORDER.map((group) => {
              const exercises = equipmentGrouped[group]
              if (!exercises?.length) return null

              return (
                <section key={group}>
                  <h2 className="text-xl font-semibold text-white mb-4">
                    <span className={`inline-block text-sm font-medium px-3 py-1 rounded border ${getEquipmentStyle(group)}`}>
                      {group}
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {exercises.map((exercise) => (
                      <ExerciseCard key={exercise.id} exercise={exercise} onClick={() => setSelectedExercise(exercise)} />
                    ))}
                  </div>
                </section>
              )
            })}
      </div>

      <ExerciseDetailModal exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />
    </div>
  )
}
