'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Model, { type IExerciseData, type Muscle } from 'react-body-highlighter'

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

function bucketVolume(vol: number, maxVol: number): number {
  if (vol <= 0) return 0
  if (maxVol <= 0) return 0
  const ratio = vol / maxVol
  if (ratio <= 0.33) return 1
  if (ratio <= 0.66) return 2
  return 3
}

function getIntensityLabel(intensity: number): string {
  if (intensity === 1) return 'Low'
  if (intensity === 2) return 'Medium'
  return 'High'
}

function DiagramView({
  type,
  commonProps,
  muscleOrder,
  muscleVolume,
  volumeToIntensity,
  onTooltip,
}: {
  type: 'anterior' | 'posterior'
  commonProps: Record<string, unknown>
  muscleOrder: Muscle[]
  muscleVolume: Record<string, number>
  volumeToIntensity: (vol: number) => number
  onTooltip: (info: { group: string; volume: number; intensity: string } | null, pos?: { x: number; y: number }) => void
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)

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
      const volume = muscleVolume[muscleGroupName] ?? 0
      if (volume <= 0) return

      const intensity = volumeToIntensity(volume)
      const intensityLabel = getIntensityLabel(intensity)

      const showTooltip = (e: MouseEvent) => {
        onTooltip({ group: muscleGroupName, volume, intensity: intensityLabel }, { x: e.clientX, y: e.clientY })
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
  }, [muscleOrder, muscleVolume, volumeToIntensity, onTooltip])

  return (
    <div ref={wrapperRef} className="relative">
      <Model type={type} {...commonProps} />
    </div>
  )
}

interface MuscleBalanceDiagramProps {
  muscleVolume: Record<string, number>
}

export function MuscleBalanceDiagram({ muscleVolume }: MuscleBalanceDiagramProps) {
  const [tooltip, setTooltip] = useState<{ group: string; volume: number; intensity: string } | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const maxVol = Math.max(0, ...Object.values(muscleVolume))

  const volumeToIntensity = useCallback(
    (vol: number) => bucketVolume(vol, maxVol),
    [maxVol]
  )

  const data: IExerciseData[] = []
  for (const [group, vol] of Object.entries(muscleVolume)) {
    const intensity = bucketVolume(vol, maxVol)
    if (intensity <= 0) continue

    const regions = getRegions(group)
    if (regions.length === 0) continue

    data.push({ name: group, muscles: regions as Muscle[], frequency: intensity })
  }

  const LOW_COLOR = '#3b82f6'   // blue – minimal volume
  const MID_COLOR = '#f59e0b'   // amber – moderate volume
  const HIGH_COLOR = '#10b981'  // green – high volume
  const highlightedColors = [LOW_COLOR, MID_COLOR, HIGH_COLOR]

  const commonProps = {
    data,
    bodyColor: '#2a2a2a',
    highlightedColors,
    style: { width: '100%', maxWidth: 180 },
  }

  const handleTooltip = useCallback((info: { group: string; volume: number; intensity: string } | null, pos?: { x: number; y: number }) => {
    setTooltip(info)
    if (pos) setTooltipPos(pos)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (tooltip) setTooltipPos({ x: e.clientX, y: e.clientY })
  }, [tooltip])

  const handlePointerLeave = useCallback(() => setTooltip(null), [])

  return (
    <div
      className="flex flex-col items-center gap-3 relative"
      onMouseMove={handleMouseMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="flex items-center justify-center gap-3">
        <DiagramView
          type="anterior"
          commonProps={commonProps}
          muscleOrder={ANTERIOR_MUSCLE_ORDER}
          muscleVolume={muscleVolume}
          volumeToIntensity={volumeToIntensity}
          onTooltip={handleTooltip}
        />
        <DiagramView
          type="posterior"
          commonProps={commonProps}
          muscleOrder={POSTERIOR_MUSCLE_ORDER}
          muscleVolume={muscleVolume}
          volumeToIntensity={volumeToIntensity}
          onTooltip={handleTooltip}
        />
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
          <span className="font-medium">{tooltip.group}</span>
          <span className="text-[#999]"> — </span>
          <span>{tooltip.volume} weighted sets</span>
          <span className="text-[#999]"> ({tooltip.intensity})</span>
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-[#888888]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: LOW_COLOR }} />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: MID_COLOR }} />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: HIGH_COLOR }} />
          <span>High</span>
        </div>
      </div>
    </div>
  )
}
