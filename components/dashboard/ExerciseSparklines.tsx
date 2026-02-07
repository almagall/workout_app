'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import { createClient } from '@/lib/supabase/client'
import { estimated1RM } from '@/lib/estimated-1rm'
import { getExerciseByName } from '@/lib/exercise-database'

interface ExerciseData {
  exerciseName: string
  templateDayId: string
  currentMax: number
  sparklineData: number[]
  percentChange: number
  equipment?: string
}

interface TemplateDay {
  id: string
  day_label: string
  template_id: string
}

export default function ExerciseSparklines() {
  const [loading, setLoading] = useState(true)
  const [exercises, setExercises] = useState<ExerciseData[]>([])
  const [allExercises, setAllExercises] = useState<ExerciseData[]>([])
  const [templateDays, setTemplateDays] = useState<TemplateDay[]>([])
  const [selectedDayId, setSelectedDayId] = useState<string>('all')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const user = getCurrentUser()
      if (!user) {
        setLoading(false)
        return
      }

      const supabase = createClient()

      // Get all template exercises for the user
      const { data: templates } = await supabase
        .from('workout_templates')
        .select('id')
        .eq('user_id', user.id)

      if (!templates || templates.length === 0) {
        setLoading(false)
        return
      }

      const templateIds = templates.map(t => t.id)

      const { data: days } = await supabase
        .from('template_days')
        .select('id, day_label, template_id')
        .in('template_id', templateIds)
        .order('day_order', { ascending: true })

      if (!days || days.length === 0) {
        setLoading(false)
        return
      }

      setTemplateDays(days)
      const dayIds = days.map(d => d.id)

      const { data: templateExercises } = await supabase
        .from('template_exercises')
        .select('exercise_name, template_day_id')
        .in('template_day_id', dayIds)

      if (!templateExercises || templateExercises.length === 0) {
        setLoading(false)
        return
      }

      // For each exercise, get last 8 workout sessions
      const exerciseDataPromises = templateExercises.map(async (ex) => {
        // Get last 8 sessions for this template day
        const { data: sessions } = await supabase
          .from('workout_sessions')
          .select('id, workout_date')
          .eq('user_id', user.id)
          .eq('template_day_id', ex.template_day_id)
          .eq('is_complete', true)
          .order('workout_date', { ascending: false })
          .limit(8)

        if (!sessions || sessions.length < 2) return null

        const sessionIds = sessions.map(s => s.id)

        const { data: logs } = await supabase
          .from('exercise_logs')
          .select('session_id, weight, reps, set_type')
          .eq('exercise_name', ex.exercise_name)
          .in('session_id', sessionIds)
          .eq('set_type', 'working')

        if (!logs || logs.length === 0) return null

        // Calculate max estimated 1RM per session
        const sessionMaxes: number[] = []
        sessions.reverse().forEach(session => {
          const sessionLogs = logs.filter(log => log.session_id === session.id)
          if (sessionLogs.length > 0) {
            const maxE1RM = Math.max(
              ...sessionLogs.map(log => estimated1RM(log.weight, log.reps))
            )
            sessionMaxes.push(maxE1RM)
          }
        })

        if (sessionMaxes.length < 2) return null

        const currentMax = sessionMaxes[sessionMaxes.length - 1]
        const firstMax = sessionMaxes[0]
        const percentChange = ((currentMax - firstMax) / firstMax) * 100

        // Get exercise equipment info
        const exerciseInfo = getExerciseByName(ex.exercise_name)

        return {
          exerciseName: ex.exercise_name,
          templateDayId: ex.template_day_id,
          currentMax,
          sparklineData: sessionMaxes,
          percentChange,
          equipment: exerciseInfo?.equipment || undefined,
        }
      })

      const results = await Promise.all(exerciseDataPromises)
      const validResults = results.filter((r) => r !== null) as ExerciseData[]

      // Sort by percent change (highest first)
      validResults.sort((a, b) => b.percentChange - a.percentChange)

      setAllExercises(validResults)
      setExercises(validResults.slice(0, 12))
      setLoading(false)
    }

    loadData()
  }, [])

  // Filter exercises when selected day changes
  useEffect(() => {
    if (selectedDayId === 'all') {
      setExercises(allExercises.slice(0, 12))
    } else {
      const filtered = allExercises.filter(ex => ex.templateDayId === selectedDayId)
      setExercises(filtered.slice(0, 12))
    }
  }, [selectedDayId, allExercises])

  // Generate simple sparkline SVG path
  const generateSparklinePath = (data: number[]): string => {
    if (data.length === 0) return ''

    const width = 80
    const height = 20
    const padding = 2

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * (width - 2 * padding) + padding
      const y = height - padding - ((value - min) / range) * (height - 2 * padding)
      return `${x},${y}`
    })

    return `M ${points.join(' L ')}`
  }

  if (loading) {
    return (
      <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6 h-[400px]">
        <h2 className="text-lg font-semibold text-white mb-4">Exercise Progression</h2>
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-[#888888]">Loading...</p>
        </div>
      </div>
    )
  }

  if (allExercises.length === 0) {
    return (
      <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6 h-[400px]">
        <h2 className="text-lg font-semibold text-white mb-4">Exercise Progression</h2>
        <div className="flex flex-col items-center justify-center h-[300px] text-center">
          <p className="text-[#888888] mb-2">Not enough data yet</p>
          <p className="text-sm text-[#666666]">Log at least 2 workouts per exercise to see trends</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] overflow-hidden h-[400px] flex flex-col">
      <div className="p-4 border-b border-[#2a2a2a]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Exercise Progression</h2>
        </div>
        {/* Workout Day Filter */}
        <select
          value={selectedDayId}
          onChange={(e) => setSelectedDayId(e.target.value)}
          className="w-full px-3 py-2 border border-[#2a2a2a] bg-[#1a1a1a] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white text-sm"
        >
          <option value="all">All Workout Days</option>
          {templateDays.map((day) => (
            <option key={day.id} value={day.id}>
              {day.day_label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {exercises.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#888888] text-sm">No exercises found for this workout day</p>
          </div>
        ) : (
          <div className="space-y-2">
            {exercises.map((exercise, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] hover:bg-[#222222] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-medium text-sm truncate">
                    {exercise.exerciseName}
                  </p>
                  {exercise.equipment && (
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 flex-shrink-0">
                      {exercise.equipment}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#888888]">
                  {exercise.currentMax.toFixed(1)} lbs (est. 1RM)
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Sparkline */}
                <svg width="80" height="20" className="flex-shrink-0">
                  <path
                    d={generateSparklinePath(exercise.sparklineData)}
                    fill="none"
                    stroke={exercise.percentChange >= 0 ? '#22c55e' : '#ef4444'}
                    strokeWidth="1.5"
                  />
                </svg>

                {/* Percent Change */}
                <span
                  className={`text-sm font-semibold w-16 text-right ${
                    exercise.percentChange >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {exercise.percentChange > 0 ? '+' : ''}
                  {exercise.percentChange.toFixed(1)}%
                </span>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
