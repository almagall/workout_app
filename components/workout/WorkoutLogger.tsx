'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-simple'
import { getPreviousWorkoutSession, getExerciseLogsForSession, saveWorkoutSession, getWorkoutSessionByDate, getExerciseLogs, updateWorkoutSession, getWorkoutSessions } from '@/lib/storage'
import { calculateSetTarget } from '@/lib/progressive-overload'
import { generateExerciseFeedback, generateWorkoutFeedback, calculateWorkoutRating } from '@/lib/feedback-generator'
import { evaluateSetPerformance } from '@/lib/progressive-overload'
import type { PlanType, SetData, ExerciseData, PerformanceStatus, SetType } from '@/types/workout'

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
  // Track confirmed sets
  const [confirmedSets, setConfirmedSets] = useState<Set<string>>(new Set())
  // Track completed exercises
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set())
  // Track if exercise selector dropdown is open
  const [showExerciseSelector, setShowExerciseSelector] = useState(false)
  const [workoutDate, setWorkoutDate] = useState<string>(() => {
    // Use provided date or default to today's date in YYYY-MM-DD format
    return initialWorkoutDate || new Date().toISOString().split('T')[0]
  })
  const [isEditMode, setIsEditMode] = useState(!!sessionId)
  const router = useRouter()
  const exerciseSelectorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function initializeWorkout() {
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
          const allLogs = await getExerciseLogs()
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
                setType: (log.set_type ?? 'working') as SetType,
                weight: parseFloat(log.weight.toString()),
                reps: log.reps,
                rpe: parseFloat(log.rpe.toString()),
                targetWeight: log.target_weight ? parseFloat(log.target_weight.toString()) : null,
                targetReps: log.target_reps,
                targetRpe: log.target_rpe ? parseFloat(log.target_rpe.toString()) : null,
              }))

            // Calculate exercise rating if feedback exists (only working sets count)
            let exerciseRating: number | null = null
            if (exerciseLogs[0]?.exercise_feedback) {
              const workingSets = sets.filter((s) => s.setType === 'working')
              const performanceStatuses = workingSets.map((set) =>
                evaluateSetPerformance(
                  set.weight,
                  set.reps,
                  set.rpe,
                  set.targetWeight ?? null,
                  set.targetReps ?? null,
                  set.targetRpe ?? null
                )
              )
              let totalScore = 0
              performanceStatuses.forEach((status) => {
                if (status === 'overperformed') {
                  totalScore += 9
                } else if (status === 'met_target') {
                  totalScore += 7
                } else {
                  totalScore += 4
                }
              })
              exerciseRating = workingSets.length > 0 
                ? Math.round((totalScore / workingSets.length) * 10) / 10 
                : 5
            }

            return {
              exerciseName,
              sets: sets.length > 0 ? sets : [{
                setNumber: 1,
                setType: 'working' as SetType,
                weight: 0,
                reps: 0,
                rpe: 5,
                targetWeight: null,
                targetReps: null,
                targetRpe: null,
              }],
              exerciseFeedback: exerciseLogs[0]?.exercise_feedback || null,
              exerciseRating,
            }
          })
        } else {
          // New workout mode: Get the most recent previous session for THIS SPECIFIC template day
          const previousSession = await getPreviousWorkoutSession(dayId, workoutDate)

          // Get all previous sessions for this day to calculate consecutive underperformance
          const allSessions = await getWorkoutSessions()
          const daySessions = allSessions
            .filter(s => s.template_day_id === dayId)
            .sort((a, b) => new Date(b.workout_date).getTime() - new Date(a.workout_date).getTime())

          // Get exercise logs for previous session
          const allPreviousLogs = previousSession 
            ? await getExerciseLogsForSession(previousSession.id)
            : []

          // Pre-calculate consecutive underperformance for each exercise
          const exerciseUnderperformanceMap = new Map<string, number>()
          for (const exerciseName of exercises) {
            let consecutiveUnderperformance = 0
            if (daySessions.length > 0) {
              // Check previous sessions in reverse chronological order
              for (let i = 0; i < Math.min(daySessions.length, 5); i++) {
                const session = daySessions[i]
                const sessionLogs = await getExerciseLogsForSession(session.id)
                const exerciseSessionLogs = sessionLogs.filter(log => log.exercise_name === exerciseName)
                const workingLogs = exerciseSessionLogs.filter(log => (log.set_type ?? 'working') === 'working')
                if (workingLogs.length === 0) break
                
                // Check if this session had underperformance (only working sets count)
                const hadUnderperformance = workingLogs.some(log => 
                  log.performance_status === 'underperformed'
                )
                
                if (hadUnderperformance) {
                  consecutiveUnderperformance++
                } else {
                  // Stop counting if we hit a non-underperformance session
                  break
                }
              }
            }
            exerciseUnderperformanceMap.set(exerciseName, consecutiveUnderperformance)
          }

          // Initialize exercise data (only working sets from previous session get targets)
          initializedExercises = exercises.map((exerciseName) => {
            const exerciseLogs = allPreviousLogs.filter(
              (log) => log.exercise_name === exerciseName
            )
            const workingLogs = exerciseLogs.filter((l) => (l.set_type ?? 'working') === 'working')

            const consecutiveUnderperformance = exerciseUnderperformanceMap.get(exerciseName) || 0

          let sets: SetData[] = []

          if (workingLogs.length > 0 && planSettings) {
            // Calculate individual target for each WORKING set based on the corresponding previous working set
            const sortedLogs = [...workingLogs].sort((a, b) => a.set_number - b.set_number)
            
            sets = sortedLogs.map((log, idx) => {
              const previousSet = {
                weight: parseFloat(log.weight.toString()),
                reps: log.reps,
                rpe: parseFloat(log.rpe.toString()),
                targetWeight: log.target_weight ? parseFloat(log.target_weight.toString()) : null,
                targetReps: log.target_reps,
                targetRpe: log.target_rpe ? parseFloat(log.target_rpe.toString()) : null,
              }

              // Calculate target for this specific set number based on the same set number from previous workout
              // Pass consecutive underperformance
              const setTarget = calculateSetTarget(
                previousSet, 
                planType, 
                planSettings,
                consecutiveUnderperformance
              )

              return {
                setNumber: idx + 1,
                setType: 'working' as SetType,
                weight: parseFloat(log.weight.toString()),
                reps: log.reps,
                rpe: parseFloat(log.rpe.toString()),
                targetWeight: setTarget.targetWeight,
                targetReps: setTarget.targetReps,
                targetRpe: setTarget.targetRpe,
              }
            })
          } else {
            // First week - no targets, create one empty working set
            sets = [
              {
                setNumber: 1,
                setType: 'working' as SetType,
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

  // Close exercise selector when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exerciseSelectorRef.current && !exerciseSelectorRef.current.contains(event.target as Node)) {
        setShowExerciseSelector(false)
      }
    }

    if (showExerciseSelector) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showExerciseSelector])

  // Mark exercises as completed when in edit mode if they have feedback
  useEffect(() => {
    if (isEditMode && exerciseData.length > 0) {
      const completed = new Set<number>()
      exerciseData.forEach((exercise, index) => {
        if (exercise.exerciseFeedback) {
          completed.add(index)
        }
      })
      setCompletedExercises(completed)
    }
  }, [isEditMode, exerciseData])

  const addSet = (exerciseIndex: number, setType: SetType) => {
    const newData = [...exerciseData]
    const exercise = newData[exerciseIndex]
    const lastSet = exercise.sets[exercise.sets.length - 1]
    const lastWorking = [...exercise.sets].reverse().find((s) => s.setType === 'working')
    const template = setType === 'working' ? (lastWorking ?? lastSet) : lastSet
    exercise.sets.push({
      setNumber: exercise.sets.length + 1,
      setType,
      weight: template?.weight ?? 0,
      reps: template?.reps ?? 0,
      rpe: template?.rpe ?? 5,
      targetWeight: setType === 'working' ? (template?.targetWeight ?? null) : null,
      targetReps: setType === 'working' ? (template?.targetReps ?? null) : null,
      targetRpe: setType === 'working' ? (template?.targetRpe ?? null) : null,
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
    // Remove confirmation for this set
    const key = `${exerciseIndex}-${setIndex}`
    const newConfirmed = new Set(confirmedSets)
    newConfirmed.delete(key)
    // Update keys for sets after the removed one
    for (let i = setIndex; i < newData[exerciseIndex].sets.length; i++) {
      const oldKey = `${exerciseIndex}-${i + 1}`
      const newKey = `${exerciseIndex}-${i}`
      if (newConfirmed.has(oldKey)) {
        newConfirmed.delete(oldKey)
        newConfirmed.add(newKey)
      }
    }
    setConfirmedSets(newConfirmed)
  }

  const confirmSet = (exerciseIndex: number, setIndex: number) => {
    const key = `${exerciseIndex}-${setIndex}`
    const newConfirmed = new Set(confirmedSets)
    newConfirmed.add(key)
    setConfirmedSets(newConfirmed)
  }

  const completeExercise = (exerciseIndex: number) => {
    const exercise = exerciseData[exerciseIndex]
    const workingSets = exercise.sets.filter((s) => s.setType === 'working')
    
    // Evaluate performance for working sets only (warmup/cooldown don't count)
    const performanceStatuses = workingSets.map((set) =>
      evaluateSetPerformance(
        set.weight,
        set.reps,
        set.rpe,
        set.targetWeight ?? null,
        set.targetReps ?? null,
        set.targetRpe ?? null
      )
    )

    // Calculate overall exercise performance from working sets only
    const overperformedCount = performanceStatuses.filter((s) => s === 'overperformed').length
    const metTargetCount = performanceStatuses.filter((s) => s === 'met_target').length
    const underperformedCount = performanceStatuses.filter((s) => s === 'underperformed').length

    let overallStatus: PerformanceStatus = 'met_target'
    if (overperformedCount > underperformedCount) {
      overallStatus = 'overperformed'
    } else if (underperformedCount > metTargetCount) {
      overallStatus = 'underperformed'
    }

    // Exercise rating based on working sets only
    let totalScore = 0
    performanceStatuses.forEach((status) => {
      if (status === 'overperformed') {
        totalScore += 9
      } else if (status === 'met_target') {
        totalScore += 7
      } else {
        totalScore += 4
      }
    })
    const exerciseRating = workingSets.length > 0 
      ? Math.round((totalScore / workingSets.length) * 10) / 10 
      : 5

    // Generate feedback from working sets only
    const feedback = generateExerciseFeedback(
      {
        exerciseName: exercise.exerciseName,
        status: overallStatus,
        overperformedCount,
        metTargetCount,
        underperformedCount,
        sets: workingSets.map((set) => ({
          weight: set.weight,
          reps: set.reps,
          rpe: set.rpe,
          targetWeight: set.targetWeight ?? null,
          targetReps: set.targetReps ?? null,
        })),
      },
      planType
    )

    // Update exercise data with feedback and rating
    const newData = [...exerciseData]
    newData[exerciseIndex].exerciseFeedback = feedback
    newData[exerciseIndex].exerciseRating = exerciseRating
    setExerciseData(newData)
    
    // Mark exercise as completed
    setCompletedExercises(prev => new Set(prev).add(exerciseIndex))
  }

  const saveWorkout = async () => {
    setSaving(true)
    setError(null)

    try {
      if (isEditMode && sessionId) {
        // Edit mode: Update existing session (only working sets count for rating/feedback)
        const workoutPerformance = {
          exercises: exerciseData.map((exercise) => {
            const workingSets = exercise.sets.filter((s) => s.setType === 'working')
            const statuses = workingSets.map((set) =>
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
              sets: workingSets.map((set) => ({
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

        // Update workout session (all sets saved; performanceStatus only for working sets)
        await updateWorkoutSession(sessionId, {
          templateDayId: dayId,
          workoutDate,
          overallRating: rating,
          overallFeedback: feedback,
          exercises: exerciseData.map((exercise) => ({
            exerciseName: exercise.exerciseName,
            sets: exercise.sets.map((set) => {
              const performanceStatus =
                set.setType === 'working'
                  ? evaluateSetPerformance(
                      set.weight,
                      set.reps,
                      set.rpe,
                      set.targetWeight ?? null,
                      set.targetReps ?? null,
                      set.targetRpe ?? null
                    )
                  : null

              return {
                setNumber: set.setNumber,
                setType: set.setType,
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
      const existingSession = await getWorkoutSessionByDate(dayId, workoutDate)

      if (existingSession) {
        setError('A workout already exists for this date. Please select a different date or edit the existing workout.')
        setSaving(false)
        return
      }

      // Calculate overall rating and feedback from working sets only
      const workoutPerformance = {
        exercises: exerciseData.map((exercise) => {
          const workingSets = exercise.sets.filter((s) => s.setType === 'working')
          const statuses = workingSets.map((set) =>
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
            sets: workingSets.map((set) => ({
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

      // Save workout session (all sets; performanceStatus only for working sets)
      await saveWorkoutSession({
        templateDayId: dayId,
        workoutDate,
        overallRating: rating,
        overallFeedback: feedback,
        exercises: exerciseData.map((exercise) => ({
          exerciseName: exercise.exerciseName,
          sets: exercise.sets.map((set) => {
            const performanceStatus =
              set.setType === 'working'
                ? evaluateSetPerformance(
                    set.weight,
                    set.reps,
                    set.rpe,
                    set.targetWeight ?? null,
                    set.targetReps ?? null,
                    set.targetRpe ?? null
                  )
                : null

            return {
              setNumber: set.setNumber,
              setType: set.setType,
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
        <div className="text-center text-[#888888]">Loading workout...</div>
      </div>
    )
  }

  if (workoutComplete) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
          <h2 className="text-2xl font-bold mb-4 text-white">Workout Complete!</h2>
          <div className="mb-4">
            <p className="text-lg font-semibold text-white">Overall Rating: <span className="text-white font-bold">{overallRating}/10</span></p>
          </div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-white">Overall Feedback:</h3>
            <p className="text-[#a1a1a1]">{overallFeedback}</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-white text-black rounded-md hover:bg-[#e5e5e5] transition-colors font-medium"
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
          <h1 className="text-3xl font-bold text-white mb-2">{dayLabel}</h1>
          <p className="text-[#888888]">
            Exercise {currentExerciseIndex + 1} of {exercises.length}
          </p>
        </div>
        <div className="relative" ref={exerciseSelectorRef}>
          <button
            onClick={() => setShowExerciseSelector(!showExerciseSelector)}
            className="px-4 py-2 bg-[#1a1a1a] text-white rounded-md hover:bg-[#2a2a2a] border border-[#2a2a2a] transition-colors flex items-center gap-2"
          >
            <span>Select Exercise</span>
            <svg 
              className={`w-4 h-4 transition-transform ${showExerciseSelector ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showExerciseSelector && (
            <div className="absolute right-0 mt-2 w-64 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md shadow-lg z-10 max-h-96 overflow-y-auto">
              <div className="p-2">
                {exercises.map((exerciseName, index) => {
                  const isCompleted = completedExercises.has(index)
                  const isCurrent = index === currentExerciseIndex
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentExerciseIndex(index)
                        setShowExerciseSelector(false)
                      }}
                      className={`w-full text-left px-4 py-3 rounded-md mb-1 transition-colors ${
                        isCurrent
                          ? 'bg-white text-black font-semibold'
                          : isCompleted
                          ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                          : 'text-white hover:bg-[#2a2a2a]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{exerciseName}</span>
                        {isCompleted && (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end">
          <label htmlFor="workout-date" className="block text-sm font-medium text-white mb-2">
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
            className="px-3 py-2 border border-[#2a2a2a] bg-[#1a1a1a] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
          />
          <p className="text-xs text-[#888888] mt-1">
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
        <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Exercise Progress Indicator */}
      <div className="mb-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-[#888888] mr-2">Exercises:</span>
          {exercises.map((exerciseName, index) => {
            const isCompleted = completedExercises.has(index)
            const isCurrent = index === currentExerciseIndex
            return (
              <button
                key={index}
                onClick={() => setCurrentExerciseIndex(index)}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  isCurrent
                    ? 'bg-white text-black font-semibold'
                    : isCompleted
                    ? 'bg-green-600/20 text-green-400 border border-green-600/50 hover:bg-green-600/30'
                    : 'bg-[#111111] text-white border border-[#2a2a2a] hover:bg-[#2a2a2a]'
                }`}
              >
                {index + 1}. {exerciseName}
                {isCompleted && ' ✓'}
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-white">{currentExercise.exerciseName}</h2>
          {isEditMode && (
            <span className="px-3 py-1 bg-yellow-600/20 text-yellow-400 rounded-md text-sm">
              Editing Workout
            </span>
          )}
        </div>

        <div className="space-y-4">
          {currentExercise.sets.map((set, setIndex) => {
            const setKey = `${currentExerciseIndex}-${setIndex}`
            const isConfirmed = confirmedSets.has(setKey)
            return (
            <div 
              key={setIndex} 
              className={`bg-[#1a1a1a] rounded-lg p-4 ${
                isConfirmed 
                  ? 'border-2 border-green-500' 
                  : 'border border-[#2a2a2a]'
              }`}
            >
              <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Set {set.setNumber}</span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      set.setType === 'warmup'
                        ? 'bg-amber-600/30 text-amber-400'
                        : set.setType === 'cooldown'
                        ? 'bg-blue-600/30 text-blue-400'
                        : 'bg-green-600/30 text-green-400'
                    }`}
                  >
                    {set.setType === 'warmup' ? 'Warm-up' : set.setType === 'cooldown' ? 'Cool-down' : 'Working'}
                  </span>
                </div>
                {set.setType === 'working' && set.targetWeight != null && (
                  <span className="text-sm text-[#888888]">
                    Target: {set.targetWeight} lbs × {set.targetReps} reps @ RPE {set.targetRpe}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Weight (lbs)
                  </label>
                  <input
                    type="number"
                    step="2.5"
                    value={set.weight || ''}
                    onChange={(e) =>
                      updateSet(currentExerciseIndex, setIndex, 'weight', parseFloat(e.target.value) || 0)
                    }
                    className={`w-full px-3 py-2 border border-[#2a2a2a] bg-[#111111] rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white ${
                      (() => {
                        const key = `${currentExerciseIndex}-${setIndex}`
                        const prePop = prePopulatedValues.get(key)
                        return prePop && set.weight === prePop.weight 
                          ? 'text-[#888888]' 
                          : 'text-white'
                      })()
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Reps
                  </label>
                  <input
                    type="number"
                    value={set.reps || ''}
                    onChange={(e) =>
                      updateSet(currentExerciseIndex, setIndex, 'reps', parseInt(e.target.value) || 0)
                    }
                    className={`w-full px-3 py-2 border border-[#2a2a2a] bg-[#111111] rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white ${
                      (() => {
                        const key = `${currentExerciseIndex}-${setIndex}`
                        const prePop = prePopulatedValues.get(key)
                        return prePop && set.reps === prePop.reps 
                          ? 'text-[#888888]' 
                          : 'text-white'
                      })()
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    RPE
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    value={set.rpe || ''}
                    onChange={(e) =>
                      updateSet(currentExerciseIndex, setIndex, 'rpe', parseFloat(e.target.value) || 0)
                    }
                    className={`w-full px-3 py-2 border border-[#2a2a2a] bg-[#111111] rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white ${
                      (() => {
                        const key = `${currentExerciseIndex}-${setIndex}`
                        const prePop = prePopulatedValues.get(key)
                        return prePop && set.rpe === prePop.rpe 
                          ? 'text-[#888888]' 
                          : 'text-white'
                      })()
                    }`}
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {!isConfirmed ? (
                  <button
                    onClick={() => confirmSet(currentExerciseIndex, setIndex)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 text-sm font-medium"
                  >
                    Confirm Set
                  </button>
                ) : (
                  <span className="text-green-500 text-sm font-medium flex items-center gap-1">
                    ✓ Set Confirmed
                  </span>
                )}
                {currentExercise.sets.length > 1 && (
                  <button
                    onClick={() => removeSet(currentExerciseIndex, setIndex)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Remove Set
                  </button>
                )}
              </div>
            </div>
          )})}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => addSet(currentExerciseIndex, 'warmup')}
            className="px-4 py-2 bg-amber-600/20 text-amber-400 rounded-md hover:bg-amber-600/30 border border-amber-600/50 transition-colors text-sm font-medium"
          >
            + Add Warm Up Set
          </button>
          <button
            onClick={() => addSet(currentExerciseIndex, 'working')}
            className="px-4 py-2 bg-green-600/20 text-green-400 rounded-md hover:bg-green-600/30 border border-green-600/50 transition-colors text-sm font-medium"
          >
            + Add Working Set
          </button>
          <button
            onClick={() => addSet(currentExerciseIndex, 'cooldown')}
            className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-md hover:bg-blue-600/30 border border-blue-600/50 transition-colors text-sm font-medium"
          >
            + Add Cool Down Set
          </button>
          <button
            onClick={() => completeExercise(currentExerciseIndex)}
            className="px-4 py-2 bg-white text-black rounded-md hover:bg-[#e5e5e5] transition-colors font-medium"
          >
            Complete Exercise
          </button>
        </div>

        {currentExercise.exerciseFeedback && (
          <div className="mt-4 p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
            {currentExercise.exerciseRating !== null && currentExercise.exerciseRating !== undefined && (
              <div className="mb-3 pb-3 border-b border-[#2a2a2a]">
                <p className="text-sm text-[#888888] mb-1">Exercise Rating</p>
                <p className="text-2xl font-bold text-white">{currentExercise.exerciseRating}/10</p>
              </div>
            )}
            <h3 className="font-semibold mb-2 text-white">Feedback:</h3>
            <p className="text-[#a1a1a1]">{currentExercise.exerciseFeedback}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentExerciseIndex(Math.max(0, currentExerciseIndex - 1))}
          disabled={currentExerciseIndex === 0}
          className="px-4 py-2 bg-[#1a1a1a] text-white rounded-md hover:bg-[#2a2a2a] border border-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        {currentExerciseIndex < exercises.length - 1 ? (
          <button
            onClick={() => setCurrentExerciseIndex(currentExerciseIndex + 1)}
            className="px-4 py-2 bg-white text-black rounded-md hover:bg-[#e5e5e5] transition-colors font-medium"
          >
            Next Exercise
          </button>
        ) : (
          <button
            onClick={saveWorkout}
            disabled={saving}
            className="px-4 py-2 bg-white text-black rounded-md hover:bg-[#e5e5e5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {saving ? 'Saving...' : 'Complete Workout'}
          </button>
        )}
      </div>
    </div>
  )
}
