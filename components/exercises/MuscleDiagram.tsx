'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Model, { type IExerciseData, type IMuscleStats, type Muscle } from 'react-body-highlighter'

// Polygon order matches react-body-highlighter anteriorData and posteriorData
const ANTERIOR_MUSCLE_ORDER: Muscle[] = [
  'chest', 'chest', 'obliques', 'obliques', 'abs', 'abs', 'biceps', 'biceps', 'triceps', 'triceps',
  'neck', 'neck', 'front-deltoids', 'front-deltoids', 'head', 'abductors', 'abductors',
  'quadriceps', 'quadriceps', 'quadriceps', 'quadriceps', 'quadriceps', 'quadriceps',
  'knees', 'knees', 'calves', 'calves', 'calves', 'calves', 'forearm', 'forearm', 'forearm', 'forearm',
]
const POSTERIOR_MUSCLE_ORDER: Muscle[] = [
  'head', 'trapezius', 'trapezius', 'back-deltoids', 'back-deltoids', 'upper-back', 'upper-back',
  'triceps', 'triceps', 'triceps', 'triceps', 'lower-back', 'lower-back', 'forearm', 'forearm', 'forearm', 'forearm',
  'gluteal', 'gluteal', 'adductor', 'adductor', 'hamstring', 'hamstring', 'hamstring', 'hamstring',
  'knees', 'knees', 'calves', 'calves', 'calves', 'calves', 'left-soleus', 'right-soleus',
]

const MUSCLE_GROUP_TO_REGIONS: Record<string, string[]> = {
  Chest: ['chest'],
  Back: ['trapezius', 'upper-back', 'lower-back'],
  Shoulders: ['front-deltoids', 'back-deltoids'],
  Biceps: ['biceps'],
  Triceps: ['triceps'],
  Legs: ['quadriceps', 'hamstring', 'gluteal', 'adductor', 'abductors'],
  Calves: ['calves'],
  Core: ['abs', 'obliques'],
}

const REGION_TO_MUSCLE_GROUP: Record<string, string> = {
  chest: 'Chest',
  trapezius: 'Back',
  'upper-back': 'Back',
  'lower-back': 'Back',
  'front-deltoids': 'Shoulders',
  'back-deltoids': 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quadriceps: 'Legs',
  hamstring: 'Legs',
  gluteal: 'Legs',
  adductor: 'Legs',
  abductors: 'Legs',
  calves: 'Calves',
  'left-soleus': 'Calves',
  'right-soleus': 'Calves',
  abs: 'Core',
  obliques: 'Core',
}

function getRegions(muscleGroup: string): string[] {
  return MUSCLE_GROUP_TO_REGIONS[muscleGroup] ?? []
}

interface MuscleDiagramProps {
  primaryMuscleGroup: string
  secondaryMuscleGroups?: string[]
}

function DiagramView({
  type,
  commonProps,
  muscleOrder,
  primaryRegions,
  secondaryRegions,
  onTooltip,
}: {
  type: 'anterior' | 'posterior'
  commonProps: Record<string, unknown>
  muscleOrder: Muscle[]
  primaryRegions: string[]
  secondaryRegions: string[]
  onTooltip: (info: { classification: string; muscleGroupName: string } | null, pos?: { x: number; y: number }) => void
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback(
    (stats: IMuscleStats) => {
      const muscle = stats.muscle
      const muscleGroupName = REGION_TO_MUSCLE_GROUP[muscle] ?? muscle
      const classification = primaryRegions.includes(muscle) ? 'Primary' : secondaryRegions.includes(muscle) ? 'Secondary' : null
      if (classification) {
        onTooltip({ classification, muscleGroupName })
      }
    },
    [primaryRegions, secondaryRegions, onTooltip]
  )

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const svg = wrapper.querySelector('.rbh')
    if (!svg) return

    const polygons = svg.querySelectorAll('polygon')
    const cleanups: (() => void)[] = []

    polygons.forEach((polygon, index) => {
      const muscle = muscleOrder[index]
      if (!muscle) return

      const muscleGroupName = REGION_TO_MUSCLE_GROUP[muscle] ?? muscle
      const classification = primaryRegions.includes(muscle) ? 'Primary' : secondaryRegions.includes(muscle) ? 'Secondary' : null
      if (!classification) return

      const showTooltip = (e: MouseEvent) => {
        onTooltip({ classification, muscleGroupName }, { x: e.clientX, y: e.clientY })
      }
      const hideTooltip = () => onTooltip(null)

      polygon.addEventListener('mouseenter', showTooltip as EventListener)
      polygon.addEventListener('mouseleave', hideTooltip)
      cleanups.push(() => {
        polygon.removeEventListener('mouseenter', showTooltip as EventListener)
        polygon.removeEventListener('mouseleave', hideTooltip)
      })
    })

    return () => cleanups.forEach((fn) => fn())
  }, [muscleOrder, primaryRegions, secondaryRegions, onTooltip])

  return (
    <div ref={wrapperRef} className="relative">
      <Model type={type} {...commonProps} onClick={handleClick} />
    </div>
  )
}

export function MuscleDiagram({ primaryMuscleGroup, secondaryMuscleGroups = [] }: MuscleDiagramProps) {
  const [tooltip, setTooltip] = useState<{ classification: string; muscleGroupName: string } | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const primaryRegions = getRegions(primaryMuscleGroup)
  const secondaryRegions = secondaryMuscleGroups.flatMap(getRegions).filter((r) => !primaryRegions.includes(r))

  const PRIMARY_COLOR = '#e11d48' // fixed red for primary muscles
  const SECONDARY_COLOR = '#b45309' // muted orange
  const highlightedColors = [SECONDARY_COLOR, PRIMARY_COLOR, PRIMARY_COLOR]

  const data: IExerciseData[] = []
  if (primaryRegions.length > 0) {
    data.push({ name: 'primary', muscles: primaryRegions as Muscle[], frequency: 2 })
  }
  if (secondaryRegions.length > 0) {
    data.push({ name: 'secondary', muscles: secondaryRegions as Muscle[], frequency: 1 })
  }

  const commonProps = {
    data,
    bodyColor: '#2a2a2a',
    highlightedColors,
    style: { width: '100%', maxWidth: 200 },
  }

  const handleTooltip = useCallback((info: { classification: string; muscleGroupName: string } | null, pos?: { x: number; y: number }) => {
    setTooltip(info)
    if (pos) {
      setTooltipPos(pos)
    } else if (info && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 - 20 })
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (tooltip) {
      setTooltipPos({ x: e.clientX, y: e.clientY })
    }
  }, [tooltip])

  const handlePointerLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center gap-4 relative"
      onMouseMove={handleMouseMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center">
          <span className="text-xs text-[#999] uppercase tracking-wider mb-1">Front</span>
          <DiagramView
            type="anterior"
            commonProps={commonProps}
            muscleOrder={ANTERIOR_MUSCLE_ORDER}
            primaryRegions={primaryRegions}
            secondaryRegions={secondaryRegions}
            onTooltip={handleTooltip}
          />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-[#999] uppercase tracking-wider mb-1">Back</span>
          <DiagramView
            type="posterior"
            commonProps={commonProps}
            muscleOrder={POSTERIOR_MUSCLE_ORDER}
            primaryRegions={primaryRegions}
            secondaryRegions={secondaryRegions}
            onTooltip={handleTooltip}
          />
        </div>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1.5 rounded bg-[#2a2a2a] border border-[#3a3a3a] text-xs text-white shadow-lg pointer-events-none"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y - 36,
            transform: 'translate(-50%, 0)',
          }}
        >
          <span className="font-medium">{tooltip.classification}</span>
          <span className="text-[#999]"> — </span>
          <span>{tooltip.muscleGroupName}</span>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-[#999]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: PRIMARY_COLOR }} />
          <span>Primary</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: SECONDARY_COLOR }} />
          <span>Secondary</span>
        </div>
      </div>
    </div>
  )
}
