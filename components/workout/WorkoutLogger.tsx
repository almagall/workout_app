'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calculateTargets } from '@/lib/progressive-overload'
import { generateExerciseFeedback, generateWorkoutFeedback, calculateWorkoutRating } from '@/lib/feedback-generator'
import { evaluateSetPerformance } from '@/lib/progressive-overload'
import type { PlanType, SetData, ExerciseData, PerformanceStatus } from '@/types/workout'

interface WorkoutLoggerProps {
  dayId: string
  dayLabel: string
  planType: PlanType
  exercises: string[]
  userId: string
}

export default function WorkoutLogger({
  dayId,
  dayLabel,
  planType,
  exercises,
  userId,
}: WorkoutLoggerProps) {
  const [exerciseData, setExerciseData] = useState<ExerciseData[]>([])
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [planSettings, setPlanSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workoutComplete, setWorkoutComplete] = useState(false)
  const [overallFeedback, setOverallFeedback] = useState<string | null>(null)
  const [overallRating, setOverallRating] = useState<number | null>(null)
  const [workoutDate, setWorkoutDate] = useState<string>(() => {
    // Default to today's date in YYYY-MM-DD format
    return new Date().toISOString().split('T')[0]
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function initializeWorkout() {
      try {
        // Get plan settings
        const { data: settings } = await supabase
          .from('progressive_overload_settings')
          .select('settings_json')
          .eq('user_id', userId)
          .eq('plan_type', planType)
          .single()

        if (settings) {
          setPlanSettings(settings.settings_json[planType])
        }

        // Get the most recent previous session for THIS SPECIFIC template day (e.g., "Push A")
        // This finds the last time the user did this workout day, regardless of:
        // - What day of the week it was
        // - How many days/weeks ago it was
        // - Whether they skipped weeks
        // Example: If you did "Push A" 2 weeks ago on Monday, and now you're doing "Push A" 
        // on Wednesday, it will find that workout from 2 weeks ago (the last "Push A" workout)
        const { data: previousSessions } = await supabase
          .from('workout_sessions')
          .select(`
            id,
            workout_date,
            exercise_logs (
              exercise_name,
              set_number,
              weight,
              reps,
              rpe,
              target_weight,
              target_reps,
              target_rpe
            )
          `)
          .eq('user_id', userId)
          .eq('template_day_id', dayId) // Same workout day (e.g., "Push A")
          .lt('workout_date', workoutDate) // Before the selected date
          .order('workout_date', { ascending: false }) // Most recent first
          .limit(1) // Get only the most recent one

        const previousSession = previousSessions && previousSessions.length > 0 ? previousSessions[0] : null

        // Initialize exercise data
        const initializedExercises: ExerciseData[] = exercises.map((exerciseName) => {
          const previousLogs = previousSession?.exercise_logs?.filter(
            (log: any) => log.exercise_name === exerciseName
          ) || []

          let sets: SetData[] = []

          if (previousLogs.length > 0 && planSettings) {
            // Calculate targets based on previous performance
            const previousExerciseData = {
              sets: previousLogs.map((log: any) => ({
                weight: parseFloat(log.weight),
                reps: log.reps,
                rpe: parseFloat(log.rpe),
                targetWeight: log.target_weight ? parseFloat(log.target_weight) : null,
                targetReps: log.target_reps,
                targetRpe: log.target_rpe ? parseFloat(log.target_rpe) : null,
              })),
            }

            // Count consecutive underperformance (simplified - would need more logic in production)
            const targets = calculateTargets(previousExerciseData, planType, planSettings, 0)

            // Create sets with targets
            sets = previousLogs.map((log: any, index: number) => ({
              setNumber: index + 1,
              weight: parseFloat(log.weight),
              reps: log.reps,
              rpe: parseFloat(log.rpe),
              targetWeight: targets.targetWeight,
              targetReps: targets.targetReps,
              targetRpe: targets.targetRpe,
            }))
          } else {
            // First week - no targets, create empty sets
            sets = [
              {
                setNumber: 1,
                weight: 0,
                reps: 0,
                rpe: 5,
                targetWeight: null,
                targetReps: null,
                targetRpe: null,
              },
            ]
          }

          return {
            exerciseName,
            sets,
            exerciseFeedback: null,
          }
        })

        setExerciseData(initializedExercises)
      } catch (err: any) {
        setError(err.message || 'Failed to initialize workout')
      } finally {
        setLoading(false)
      }
    }

    initializeWorkout()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayId, planType, exercises, userId, workoutDate])

  const addSet = (exerciseIndex: number) => {
    const newData = [...exerciseData]
    const exercise = newData[exerciseIndex]
    const lastSet = exercise.sets[exercise.sets.length - 1]
    exercise.sets.push({
      setNumber: exercise.sets.length + 1,
      weight: lastSet.weight || 0,
      reps: lastSet.reps || 0,
      rpe: lastSet.rpe || 5,
      targetWeight: lastSet.targetWeight,
      targetReps: lastSet.targetReps,
      targetRpe: lastSet.targetRpe,
    })
    setExerciseData(newData)
  }

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetData,
    value: number
  ) => {
    const newData = [...exerciseData]
    const set = newData[exerciseIndex].sets[setIndex]
    ;(set as any)[field] = value
    setExerciseData(newData)
  }

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const newData = [...exerciseData]
    newData[exerciseIndex].sets.splice(setIndex, 1)
    // Renumber sets
    newData[exerciseIndex].sets.forEach((set, index) => {
      set.setNumber = index + 1
    })
    setExerciseData(newData)
  }

  const completeExercise = (exerciseIndex: number) => {
    const exercise = exerciseData[exerciseIndex]
    
    // Evaluate performance for each set
    const performanceStatuses = exercise.sets.map((set) =>
      evaluateSetPerformance(
        set.weight,
        set.reps,
        set.rpe,
        set.targetWeight,
        set.targetReps,
        set.targetRpe
      )
    )

    // Calculate overall exercise performance
    const overperformedCount = performanceStatuses.filter((s) => s === 'overperformed').length
    const metTargetCount = performanceStatuses.filter((s) => s === 'met_target').length
    const underperformedCount = performanceStatuses.filter((s) => s === 'underperformed').length

    let overallStatus: PerformanceStatus = 'met_target'
    if (overperformedCount > underperformedCount) {
      overallStatus = 'overperformed'
    } else if (underperformedCount > metTargetCount) {
      overallStatus = 'underperformed'
    }

    // Generate feedback
    const feedback = generateExerciseFeedback(
      {
        exerciseName: exercise.exerciseName,
        status: overallStatus,
        overperformedCount,
        metTargetCount,
        underperformedCount,
        sets: exercise.sets,
      },
      planType
    )

    // Update exercise data with feedback
    const newData = [...exerciseData]
    newData[exerciseIndex].exerciseFeedback = feedback
    setExerciseData(newData)
  }

  const saveWorkout = async () => {
    setSaving(true)
    setError(null)

    try {
      // Check if a session already exists for this date and template day
      const { data: existingSession } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('template_day_id', dayId)
        .eq('workout_date', workoutDate)
        .single()

      if (existingSession) {
        setError('A workout already exists for this date. Please select a different date or edit the existing workout.')
        setSaving(false)
        return
      }

      // Create workout session with selected date
      const { data: session, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: userId,
          template_day_id: dayId,
          workout_date: workoutDate,
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // Calculate overall rating and feedback
      const workoutPerformance = {
        exercises: exerciseData.map((exercise) => {
          const statuses = exercise.sets.map((set) =>
            evaluateSetPerformance(
              set.weight,
              set.reps,
              set.rpe,
              set.targetWeight,
              set.targetReps,
              set.targetRpe
            )
          )
          const overperformedCount = statuses.filter((s) => s === 'overperformed').length
          const metTargetCount = statuses.filter((s) => s === 'met_target').length
          const underperformedCount = statuses.filter((s) => s === 'underperformed').length

          let status: PerformanceStatus = 'met_target'
          if (overperformedCount > underperformedCount) {
            status = 'overperformed'
          } else if (underperformedCount > metTargetCount) {
            status = 'underperformed'
          }

          return {
            exerciseName: exercise.exerciseName,
            status,
            overperformedCount,
            metTargetCount,
            underperformedCount,
            sets: exercise.sets,
          }
        }),
        overallRating: 0,
      }

      const rating = calculateWorkoutRating(workoutPerformance)
      workoutPerformance.overallRating = rating
      const feedback = generateWorkoutFeedback(workoutPerformance, planType)

      // Update session with rating and feedback
      await supabase
        .from('workout_sessions')
        .update({
          overall_performance_rating: rating,
          overall_feedback: feedback,
        })
        .eq('id', session.id)

      // Insert exercise logs
      const logsToInsert = exerciseData.flatMap((exercise) =>
        exercise.sets.map((set) => {
          const performanceStatus = evaluateSetPerformance(
            set.weight,
            set.reps,
            set.rpe,
            set.targetWeight,
            set.targetReps,
            set.targetRpe
          )

          return {
            session_id: session.id,
            exercise_name: exercise.exerciseName,
            set_number: set.setNumber,
            weight: set.weight,
            reps: set.reps,
            rpe: set.rpe,
            target_weight: set.targetWeight,
            target_reps: set.targetReps,
            target_rpe: set.targetRpe,
            performance_status: performanceStatus,
            exercise_feedback: exercise.exerciseFeedback,
          }
        })
      )

      const { error: logsError } = await supabase
        .from('exercise_logs')
        .insert(logsToInsert)

      if (logsError) throw logsError

      setOverallRating(rating)
      setOverallFeedback(feedback)
      setWorkoutComplete(true)
    } catch (err: any) {
      setError(err.message || 'Failed to save workout')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-slate-300">Loading workout...</div>
      </div>
    )
  }

  if (workoutComplete) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6">
          <h2 className="text-2xl font-bold mb-4 text-slate-100">Workout Complete!</h2>
          <div className="mb-4">
            <p className="text-lg font-semibold text-slate-200">Overall Rating: <span className="text-indigo-400">{overallRating}/10</span></p>
          </div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-slate-100">Overall Feedback:</h3>
            <p className="text-slate-300">{overallFeedback}</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const currentExercise = exerciseData[currentExerciseIndex]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">{dayLabel}</h1>
          <p className="text-slate-300">
            Exercise {currentExerciseIndex + 1} of {exercises.length}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <label htmlFor="workout-date" className="block text-sm font-medium text-slate-200 mb-2">
            Workout Date
          </label>
          <input
            id="workout-date"
            type="date"
            value={workoutDate}
            onChange={(e) => {
              const newDate = e.target.value
              const today = new Date().toISOString().split('T')[0]
              if (newDate > today) {
                setError('Cannot log workouts for future dates. Please select today or a past date.')
                return
              }
              setWorkoutDate(newDate)
              setError(null)
              // Re-initialize workout data when date changes
              setLoading(true)
              setCurrentExerciseIndex(0)
            }}
            max={new Date().toISOString().split('T')[0]} // Prevent future dates
            className="px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            {workoutDate === new Date().toISOString().split('T')[0] 
              ? 'Logging today\'s workout' 
              : `Logging workout for ${new Date(workoutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4 text-slate-100">{currentExercise.exerciseName}</h2>

        <div className="space-y-4">
          {currentExercise.sets.map((set, setIndex) => (
            <div key={setIndex} className="border border-slate-600 bg-slate-700/50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-slate-200">Set {set.setNumber}</span>
                {set.targetWeight && (
                  <span className="text-sm text-slate-400">
                    Target: {set.targetWeight} lbs × {set.targetReps} reps @ RPE {set.targetRpe}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Weight (lbs)
                  </label>
                  <input
                    type="number"
                    step="2.5"
                    value={set.weight || ''}
                    onChange={(e) =>
                      updateSet(currentExerciseIndex, setIndex, 'weight', parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">Reps</label>
                  <input
                    type="number"
                    value={set.reps || ''}
                    onChange={(e) =>
                      updateSet(currentExerciseIndex, setIndex, 'reps', parseInt(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">RPE</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    value={set.rpe || ''}
                    onChange={(e) =>
                      updateSet(currentExerciseIndex, setIndex, 'rpe', parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              {currentExercise.sets.length > 1 && (
                <button
                  onClick={() => removeSet(currentExerciseIndex, setIndex)}
                  className="mt-2 text-sm text-red-400 hover:text-red-300"
                >
                  Remove Set
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => addSet(currentExerciseIndex)}
            className="px-4 py-2 bg-slate-600 text-slate-200 rounded-md hover:bg-slate-500"
          >
            + Add Set
          </button>
          <button
            onClick={() => completeExercise(currentExerciseIndex)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500"
          >
            Complete Exercise
          </button>
        </div>

        {currentExercise.exerciseFeedback && (
          <div className="mt-4 p-4 bg-indigo-900/30 border border-indigo-700 rounded-lg">
            <h3 className="font-semibold mb-2 text-indigo-300">Feedback:</h3>
            <p className="text-slate-200">{currentExercise.exerciseFeedback}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentExerciseIndex(Math.max(0, currentExerciseIndex - 1))}
          disabled={currentExerciseIndex === 0}
          className="px-4 py-2 bg-slate-600 text-slate-200 rounded-md hover:bg-slate-500 disabled:opacity-50"
        >
          Previous
        </button>
        {currentExerciseIndex < exercises.length - 1 ? (
          <button
            onClick={() => setCurrentExerciseIndex(currentExerciseIndex + 1)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500"
          >
            Next Exercise
          </button>
        ) : (
          <button
            onClick={saveWorkout}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Complete Workout'}
          </button>
        )}
      </div>
    </div>
  )
}
