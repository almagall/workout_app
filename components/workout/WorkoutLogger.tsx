'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-simple'
import { getPreviousWorkoutSession, getExerciseLogsForSession, saveWorkoutSession, getWorkoutSessionByDate, getExerciseLogs, updateWorkoutSession } from '@/lib/storage'
import { calculateSetTarget } from '@/lib/progressive-overload'
import { generateExerciseFeedback, generateWorkoutFeedback, calculateWorkoutRating } from '@/lib/feedback-generator'
import { evaluateSetPerformance } from '@/lib/progressive-overload'
import type { PlanType, SetData, ExerciseData, PerformanceStatus } from '@/types/workout'

interface WorkoutLoggerProps {
  dayId: string
  dayLabel: string
  planType: PlanType
  exercises: string[]
  userId: string
  sessionId?: string // Optional: if provided, we're editing an existing workout
  workoutDate?: string // Optional: if provided, use this date instead of today
}

export default function WorkoutLogger({
  dayId,
  dayLabel,
  planType,
  exercises,
  userId,
  sessionId,
  workoutDate: initialWorkoutDate,
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
  // Track pre-populated values for styling
  const [prePopulatedValues, setPrePopulatedValues] = useState<Map<string, { weight: number; reps: number; rpe: number }>>(new Map())
  const [workoutDate, setWorkoutDate] = useState<string>(() => {
    // Use provided date or default to today's date in YYYY-MM-DD format
    return initialWorkoutDate || new Date().toISOString().split('T')[0]
  })
  const [isEditMode, setIsEditMode] = useState(!!sessionId)
  const router = useRouter()

  useEffect(() => {
    function initializeWorkout() {
      try {
        const user = getCurrentUser()
        if (!user) {
          router.push('/get-started')
          return
        }

        // Get plan settings from localStorage
        const settingsStr = localStorage.getItem(`workout_settings_${user.id}`)
        if (settingsStr) {
          try {
            const settingsData = JSON.parse(settingsStr)
            if (settingsData.settings_json && settingsData.settings_json[planType]) {
              setPlanSettings(settingsData.settings_json[planType])
            }
          } catch (e) {
            console.error('Failed to parse settings', e)
          }
        }

        let initializedExercises: ExerciseData[] = []

        if (isEditMode && sessionId) {
          // Edit mode: Load existing session data
          const allLogs = getExerciseLogs()
          const sessionLogs = allLogs.filter(log => log.session_id === sessionId)

          // Group logs by exercise
          const exerciseMap = new Map<string, typeof sessionLogs>()
          exercises.forEach(exerciseName => {
            exerciseMap.set(exerciseName, sessionLogs.filter(log => log.exercise_name === exerciseName))
          })

          initializedExercises = exercises.map((exerciseName) => {
            const exerciseLogs = exerciseMap.get(exerciseName) || []
            const sets: SetData[] = exerciseLogs
              .sort((a, b) => a.set_number - b.set_number)
              .map((log) => ({
                setNumber: log.set_number,
                weight: parseFloat(log.weight.toString()),
                reps: log.reps,
                rpe: parseFloat(log.rpe.toString()),
                targetWeight: log.target_weight ? parseFloat(log.target_weight.toString()) : null,
                targetReps: log.target_reps,
                targetRpe: log.target_rpe ? parseFloat(log.target_rpe.toString()) : null,
              }))

            return {
              exerciseName,
              sets: sets.length > 0 ? sets : [{
                setNumber: 1,
                weight: 0,
                reps: 0,
                rpe: 5,
                targetWeight: null,
                targetReps: null,
                targetRpe: null,
              }],
              exerciseFeedback: exerciseLogs[0]?.exercise_feedback || null,
            }
          })
        } else {
          // New workout mode: Get the most recent previous session for THIS SPECIFIC template day
          const previousSession = getPreviousWorkoutSession(dayId, workoutDate)

          // Get exercise logs for previous session
          const allPreviousLogs = previousSession 
            ? getExerciseLogsForSession(previousSession.id)
            : []

          // Initialize exercise data
          initializedExercises = exercises.map((exerciseName) => {
            const exerciseLogs = allPreviousLogs.filter(
              (log) => log.exercise_name === exerciseName
            )

          let sets: SetData[] = []

          if (exerciseLogs.length > 0 && planSettings) {
            // Calculate individual target for each set based on the corresponding previous set

            // Create sets with targets
            sets = exerciseLogs.map((log, index: number) => ({
              setNumber: index + 1,
              weight: parseFloat(log.weight),
              reps: log.reps,
              rpe: parseFloat(log.rpe),
              targetWeight: (() => {
                const previousSet = {
                  weight: parseFloat(log.weight.toString()),
                  reps: log.reps,
                  rpe: parseFloat(log.rpe.toString()),
                  targetWeight: log.target_weight ? parseFloat(log.target_weight.toString()) : null,
                  targetReps: log.target_reps,
                  targetRpe: log.target_rpe ? parseFloat(log.target_rpe.toString()) : null,
                }
                return calculateSetTarget(previousSet, planType, planSettings).targetWeight
              })(),
              targetReps: (() => {
                const previousSet = {
                  weight: parseFloat(log.weight.toString()),
                  reps: log.reps,
                  rpe: parseFloat(log.rpe.toString()),
                  targetWeight: log.target_weight ? parseFloat(log.target_weight.toString()) : null,
                  targetReps: log.target_reps,
                  targetRpe: log.target_rpe ? parseFloat(log.target_rpe.toString()) : null,
                }
                return calculateSetTarget(previousSet, planType, planSettings).targetReps
              })(),
              targetRpe: (() => {
                const previousSet = {
                  weight: parseFloat(log.weight.toString()),
                  reps: log.reps,
                  rpe: parseFloat(log.rpe.toString()),
                  targetWeight: log.target_weight ? parseFloat(log.target_weight.toString()) : null,
                  targetReps: log.target_reps,
                  targetRpe: log.target_rpe ? parseFloat(log.target_rpe.toString()) : null,
                }
                return calculateSetTarget(previousSet, planType, planSettings).targetRpe
              })(),
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
        }

        // Track pre-populated values for styling
        const prePopulated = new Map<string, { weight: number; reps: number; rpe: number }>()
        initializedExercises.forEach((exercise, exIndex) => {
          exercise.sets.forEach((set, setIndex) => {
            const key = `${exIndex}-${setIndex}`
            prePopulated.set(key, {
              weight: set.weight,
              reps: set.reps,
              rpe: set.rpe,
            })
          })
        })
        setPrePopulatedValues(prePopulated)

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
        set.targetWeight ?? null,
        set.targetReps ?? null,
        set.targetRpe ?? null
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
        sets: exercise.sets.map((set) => ({
          weight: set.weight,
          reps: set.reps,
          rpe: set.rpe,
          targetWeight: set.targetWeight ?? null,
          targetReps: set.targetReps ?? null,
        })),
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
      if (isEditMode && sessionId) {
        // Edit mode: Update existing session
        // Calculate overall rating and feedback
        const workoutPerformance = {
          exercises: exerciseData.map((exercise) => {
            const statuses = exercise.sets.map((set) =>
              evaluateSetPerformance(
                set.weight,
                set.reps,
                set.rpe,
                set.targetWeight ?? null,
                set.targetReps ?? null,
                set.targetRpe ?? null
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
              sets: exercise.sets.map((set) => ({
                weight: set.weight,
                reps: set.reps,
                rpe: set.rpe,
                targetWeight: set.targetWeight ?? null,
                targetReps: set.targetReps ?? null,
              })),
            }
          }),
          overallRating: 0,
        }

        const rating = calculateWorkoutRating(workoutPerformance)
        workoutPerformance.overallRating = rating
        const feedback = generateWorkoutFeedback(workoutPerformance, planType)

        // Update workout session
        updateWorkoutSession(sessionId, {
          templateDayId: dayId,
          workoutDate,
          overallRating: rating,
          overallFeedback: feedback,
          exercises: exerciseData.map((exercise) => ({
            exerciseName: exercise.exerciseName,
            sets: exercise.sets.map((set) => {
              const performanceStatus = evaluateSetPerformance(
                set.weight,
                set.reps,
                set.rpe,
                set.targetWeight ?? null,
                set.targetReps ?? null,
                set.targetRpe ?? null
              )

              return {
                setNumber: set.setNumber,
                weight: set.weight,
                reps: set.reps,
                rpe: set.rpe,
                targetWeight: set.targetWeight ?? null,
                targetReps: set.targetReps ?? null,
                targetRpe: set.targetRpe ?? null,
                performanceStatus,
                exerciseFeedback: exercise.exerciseFeedback || null,
              }
            }),
          })),
        })

        setOverallRating(rating)
        setOverallFeedback(feedback)
        setWorkoutComplete(true)
        return
      }

      // New workout mode: Check if a session already exists for this date and template day
      const existingSession = getWorkoutSessionByDate(dayId, workoutDate)

      if (existingSession) {
        setError('A workout already exists for this date. Please select a different date or edit the existing workout.')
        setSaving(false)
        return
      }

      // Calculate overall rating and feedback
      const workoutPerformance = {
        exercises: exerciseData.map((exercise) => {
          const statuses = exercise.sets.map((set) =>
            evaluateSetPerformance(
              set.weight,
              set.reps,
              set.rpe,
              set.targetWeight ?? null,
              set.targetReps ?? null,
              set.targetRpe ?? null
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
            sets: exercise.sets.map((set) => ({
              weight: set.weight,
              reps: set.reps,
              rpe: set.rpe,
              targetWeight: set.targetWeight ?? null,
              targetReps: set.targetReps ?? null,
            })),
          }
        }),
        overallRating: 0,
      }

      const rating = calculateWorkoutRating(workoutPerformance)
      workoutPerformance.overallRating = rating
      const feedback = generateWorkoutFeedback(workoutPerformance, planType)

      // Save workout session using localStorage
      saveWorkoutSession({
        templateDayId: dayId,
        workoutDate,
        overallRating: rating,
        overallFeedback: feedback,
        exercises: exerciseData.map((exercise) => ({
          exerciseName: exercise.exerciseName,
          sets: exercise.sets.map((set) => {
            const performanceStatus = evaluateSetPerformance(
              set.weight,
              set.reps,
              set.rpe,
              set.targetWeight ?? null,
              set.targetReps ?? null,
              set.targetRpe ?? null
            )

            return {
              setNumber: set.setNumber,
              weight: set.weight,
              reps: set.reps,
              rpe: set.rpe,
              targetWeight: set.targetWeight ?? null,
              targetReps: set.targetReps ?? null,
              targetRpe: set.targetRpe ?? null,
              performanceStatus,
              exerciseFeedback: exercise.exerciseFeedback || null,
            }
          }),
        })),
      })

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
              : (() => {
                  // Parse date string directly to avoid timezone issues
                  // workoutDate is in YYYY-MM-DD format
                  const [year, month, day] = workoutDate.split('-').map(Number)
                  const date = new Date(year, month - 1, day)
                  return `Logging workout for ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                })()}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-slate-100">{currentExercise.exerciseName}</h2>
          {isEditMode && (
            <span className="px-3 py-1 bg-yellow-600/20 text-yellow-400 rounded-md text-sm">
              Editing Workout
            </span>
          )}
        </div>

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
                    className={`w-full px-3 py-2 border border-slate-600 bg-slate-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      (() => {
                        const key = `${currentExerciseIndex}-${setIndex}`
                        const prePop = prePopulatedValues.get(key)
                        return prePop && set.weight === prePop.weight ? 'text-slate-400' : 'text-slate-100'
                      })()
                    }`}
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
                    className={`w-full px-3 py-2 border border-slate-600 bg-slate-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      (() => {
                        const key = `${currentExerciseIndex}-${setIndex}`
                        const prePop = prePopulatedValues.get(key)
                        return prePop && set.reps === prePop.reps ? 'text-slate-400' : 'text-slate-100'
                      })()
                    }`}
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
                    className={`w-full px-3 py-2 border border-slate-600 bg-slate-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      (() => {
                        const key = `${currentExerciseIndex}-${setIndex}`
                        const prePop = prePopulatedValues.get(key)
                        return prePop && set.rpe === prePop.rpe ? 'text-slate-400' : 'text-slate-100'
                      })()
                    }`}
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
