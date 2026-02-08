'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-simple'
import { getPreviousWorkoutSessionExcludingDeload, getMostRecentSessionWithExercise, getExerciseLogsForSession, saveWorkoutSession, getWorkoutSessionByDate, getExerciseLogs, updateWorkoutSession, getWorkoutSessions, saveDraftWorkoutSession, completeWorkoutSession, deleteWorkoutSession } from '@/lib/storage'
import { calculateSetTarget, getDefaultPlanSettings } from '@/lib/progressive-overload'
import { generateExerciseFeedback, generateWorkoutFeedback, calculateWorkoutRating } from '@/lib/feedback-generator'
import { evaluateSetPerformance } from '@/lib/progressive-overload'
import { getTargetExplanation } from '@/lib/target-explanation'
import { getPlateBreakdown, isBarbellExercise, getPlateConfig, roundToLoadableWeight } from '@/lib/plate-calculator'
import { isInDeloadPeriod, getDeloadMultiplier } from '@/lib/deload-detection'
import { getTodayLocalYYYYMMDD } from '@/lib/date-utils'
import { getPresetTargetStrategy, getPresetExerciseNotes } from '@/lib/preset-templates'
import {
  calculate531SetTarget,
  get531CycleWeek,
  calculateLinearProgressionTarget,
  calculateGZCLPSetTarget,
  getTexasMethodDayType,
  calculateTexasMethodSetTarget,
} from '@/lib/target-strategies'
import { estimated1RM } from '@/lib/estimated-1rm'
import { checkSetPR, getPRsForSession, type SessionPR } from '@/lib/pr-helper'
import { checkAndUnlockAchievements } from '@/lib/achievements'
import { getBodyweightForDate } from '@/lib/bodyweight-storage'
import { isBodyweightExercise, getExerciseByName, getExerciseEquivalence, type ExerciseEntry } from '@/lib/exercise-database'
import { getEquipmentStyle, getMuscleGroupStyle } from '@/lib/exercise-tag-styles'
import { ExerciseDetailModal } from '@/components/exercises/ExerciseDetailModal'
import RestTimer from '@/components/workout/RestTimer'
import type { PlanType, SetData, ExerciseData, PerformanceStatus, SetType } from '@/types/workout'

interface WorkoutLoggerProps {
  dayId: string
  dayLabel: string
  planType: PlanType
  exercises: string[]
  userId: string
  presetId?: string | null
  sessionId?: string // Optional: if provided, we're editing an existing workout
  workoutDate?: string // Optional: if provided, use this date instead of today
  draftSessionId?: string // Optional: if provided, we're resuming a draft workout
}

export default function WorkoutLogger({
  dayId,
  dayLabel,
  planType,
  exercises,
  userId,
  presetId,
  sessionId,
  workoutDate: initialWorkoutDate,
  draftSessionId: initialDraftSessionId,
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
  const [workoutCompletePRs, setWorkoutCompletePRs] = useState<SessionPR[] | null>(null)
  // Track pre-populated values for styling
  const [prePopulatedValues, setPrePopulatedValues] = useState<Map<string, { weight: number; reps: number; rpe: number }>>(new Map())
  // Track confirmed sets
  const [confirmedSets, setConfirmedSets] = useState<Set<string>>(new Set())
  // Track completed exercises
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set())
  // Track if exercise selector dropdown is open
  const [showExerciseSelector, setShowExerciseSelector] = useState(false)
  const [prBadges, setPrBadges] = useState<Map<string, { heaviestSetPR: boolean; e1RMPR: boolean }>>(new Map())
  const [setValidationError, setSetValidationError] = useState<{ key: string; message: string } | null>(null)
  const [userBodyweightForDate, setUserBodyweightForDate] = useState<{ weight: number; unit: 'lbs' } | null>(null)
  // Feedback context: underperformance streaks, last session RPE, program type (computed on init)
  const [feedbackContext, setFeedbackContext] = useState<{
    underperformanceMap: Map<string, number>
    lastSessionRpeMap: Map<string, number>
    targetStrategy: string | null
  }>({
    underperformanceMap: new Map(),
    lastSessionRpeMap: new Map(),
    targetStrategy: null,
  })
  const [workoutDate, setWorkoutDate] = useState<string>(() => {
    // Use provided date or default to today's date in YYYY-MM-DD format (local timezone)
    return initialWorkoutDate || getTodayLocalYYYYMMDD()
  })
  const [isEditMode, setIsEditMode] = useState(!!sessionId)
  const [isBaselineWorkout, setIsBaselineWorkout] = useState(false)
  // Rest timer state
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [restTimerEnabled, setRestTimerEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workout_rest_timer_enabled')
      return saved === 'true' // Default to off
    }
    return false
  })
  const [defaultRestSeconds, setDefaultRestSeconds] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workout_rest_timer_seconds')
      return saved ? parseInt(saved, 10) : 90
    }
    return 90
  })
  const [restTimerAfterSetKey, setRestTimerAfterSetKey] = useState<string | null>(null)
  // Draft workout state
  const [draftSessionId, setDraftSessionId] = useState<string | null>(initialDraftSessionId || null)
  const [isResumedDraft, setIsResumedDraft] = useState(!!initialDraftSessionId)
  const [autoSaving, setAutoSaving] = useState(false)
  const [exerciseInfoModal, setExerciseInfoModal] = useState<ExerciseEntry | null>(null)
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

        // Get plan settings from localStorage (legacy) or use defaults per template plan type
        let resolvedPlanSettings = getDefaultPlanSettings(planType)
        const settingsStr = localStorage.getItem(`workout_settings_${user.id}`)
        if (settingsStr) {
          try {
            const settingsData = JSON.parse(settingsStr)
            if (settingsData.settings_json && settingsData.settings_json[planType]) {
              resolvedPlanSettings = settingsData.settings_json[planType]
            }
          } catch (e) {
            console.error('Failed to parse settings', e)
          }
        }
        setPlanSettings(resolvedPlanSettings)

        let initializedExercises: ExerciseData[] = []

        // Draft mode: Load draft session data
        if (draftSessionId && !isEditMode) {
          const allLogs = await getExerciseLogs()
          const draftLogs = allLogs.filter(log => log.session_id === draftSessionId)

          // Group logs by exercise
          const exerciseMap = new Map<string, typeof draftLogs>()
          exercises.forEach(exerciseName => {
            exerciseMap.set(exerciseName, draftLogs.filter(log => log.exercise_name === exerciseName))
          })

          // Track which sets are confirmed (all sets in draft are considered confirmed)
          const confirmedSetKeys = new Set<string>()

          initializedExercises = exercises.map((exerciseName, exerciseIndex) => {
            const exerciseLogs = exerciseMap.get(exerciseName) || []
            const sets: SetData[] = exerciseLogs
              .sort((a, b) => a.set_number - b.set_number)
              .map((log, setIndex) => {
                const weight = parseFloat(log.weight.toString())
                const reps = log.reps
                
                // Only mark set as confirmed if it has actual data (weight > 0 and reps > 0)
                if (weight > 0 && reps > 0) {
                  confirmedSetKeys.add(`${exerciseIndex}-${setIndex}`)
                }
                
                return {
                  setNumber: log.set_number,
                  setType: (log.set_type ?? 'working') as SetType,
                  weight,
                  reps,
                  rpe: parseFloat(log.rpe.toString()),
                  targetWeight: log.target_weight ? parseFloat(log.target_weight.toString()) : null,
                  targetReps: log.target_reps,
                  targetRpe: log.target_rpe ? parseFloat(log.target_rpe.toString()) : null,
                }
              })

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
              exerciseFeedback: null,
              exerciseRating: null,
            }
          })

          // Set confirmed sets
          setConfirmedSets(confirmedSetKeys)
          setExerciseData(initializedExercises)
          setLoading(false)
          return
        }

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
          // New workout mode: Get the most recent previous session for THIS SPECIFIC template day.
          // Exclude sessions during deload so targets use pre-deload performance.
          const previousSession = await getPreviousWorkoutSessionExcludingDeload(dayId, workoutDate, user.id)
          
          // Track if this is a baseline workout (first time logging this template day)
          setIsBaselineWorkout(previousSession === null)

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

          // Compute last session's avg RPE per exercise (for RPE-aware feedback)
          const lastSessionRpeMap = new Map<string, number>()
          for (const exerciseName of exercises) {
            const workingLogs = allPreviousLogs.filter(
              (l) => l.exercise_name === exerciseName && (l.set_type ?? 'working') === 'working'
            )
            if (workingLogs.length > 0) {
              const avgRpe = workingLogs.reduce((s, l) => s + parseFloat(l.rpe.toString()), 0) / workingLogs.length
              lastSessionRpeMap.set(exerciseName, Math.round(avgRpe * 10) / 10)
            }
          }

          // Preset-specific target strategy. Custom templates use default planType logic.
          const targetStrategy = getPresetTargetStrategy(presetId ?? undefined)
          const use531Strategy = targetStrategy === '531'
          const useLinearStrategy = targetStrategy === 'startingStrength' || targetStrategy === 'stronglifts'
          const usePhulStrategy = targetStrategy === 'phul'
          const useGzclpStrategy = targetStrategy === 'gzclp'
          const useTexasMethodStrategy = targetStrategy === 'texasMethod'

          const phulPlanType = dayLabel.toLowerCase().includes('power') ? 'strength' : 'hypertrophy'
          const phulSettings = getDefaultPlanSettings(phulPlanType)
          const texasDayType = getTexasMethodDayType(dayLabel)

          const linearSetsPerExercise = targetStrategy === 'stronglifts' ? 5 : 3

          const plateConfig = getPlateConfig(user.id)
          const roundToLoadable = (w: number) => roundToLoadableWeight(w, plateConfig.plates, plateConfig.barWeight)
          const inDeload = isInDeloadPeriod(user.id, workoutDate)
          const deloadMult = getDeloadMultiplier()
          const applyDeload = (tw: number | null) =>
            tw != null && inDeload ? Math.round(tw * deloadMult * 2) / 2 : tw

          // Initialize exercise data (only working sets from previous session get targets)
          initializedExercises = exercises.map((exerciseName, exerciseIndex) => {
            const exerciseLogs = allPreviousLogs.filter(
              (log) => log.exercise_name === exerciseName
            )
            const workingLogs = exerciseLogs.filter((l) => (l.set_type ?? 'working') === 'working')

            const consecutiveUnderperformance = exerciseUnderperformanceMap.get(exerciseName) || 0
            const is531MainLift = use531Strategy && exerciseIndex === 0
            const gzclpTier = useGzclpStrategy
              ? (exerciseIndex === 0 ? 1 : exerciseIndex === 1 ? 2 : 3)
              : null

            let sets: SetData[] = []

            if (workingLogs.length > 0) {
              const sortedLogs = [...workingLogs].sort((a, b) => a.set_number - b.set_number)

              if (is531MainLift) {
                // 5/3/1: 3 working sets with percentage-based targets. TM = 90% of estimated 1RM from previous session.
                const set1RMs = sortedLogs.map((log) =>
                  estimated1RM(parseFloat(log.weight.toString()), log.reps)
                )
                const prevE1RM = set1RMs.length > 0 ? Math.max(...set1RMs) : 0
                const trainingMax = prevE1RM * 0.9
                const cycleWeek = get531CycleWeek(daySessions.length + 1)
                const num531Sets = Math.min(3, sortedLogs.length)
                const expl531 = getTargetExplanation('met_target', planType, 0, '531', { cycleWeek })
                sets = sortedLogs.map((log, idx) => {
                  const setIndex = idx < 3 ? (idx as 0 | 1 | 2) : 2
                  const t531 =
                    idx < 3 && trainingMax > 0
                      ? calculate531SetTarget(cycleWeek, setIndex, trainingMax, roundToLoadable)
                      : { targetWeight: null, targetReps: null, targetRpe: null }
                  return {
                    setNumber: idx + 1,
                    setType: 'working' as SetType,
                    weight: parseFloat(log.weight.toString()),
                    reps: log.reps,
                    rpe: parseFloat(log.rpe.toString()),
                    targetWeight: applyDeload(t531.targetWeight),
                    targetReps: t531.targetReps,
                    targetRpe: t531.targetRpe,
                    targetExplanation: expl531,
                  }
                })
                // 5/3/1 main lift is exactly 3 sets; if previous had fewer, pad; if more, keep first 3 with 531
                if (sets.length < 3) {
                  while (sets.length < 3) {
                    const setIndex = sets.length as 0 | 1 | 2
                    const t531 =
                      trainingMax > 0
                        ? calculate531SetTarget(cycleWeek, setIndex, trainingMax, roundToLoadable)
                        : { targetWeight: null, targetReps: null, targetRpe: null }
                    sets.push({
                      setNumber: sets.length + 1,
                      setType: 'working' as SetType,
                      weight: 0,
                      reps: 0,
                      rpe: 5,
                      targetWeight: applyDeload(t531.targetWeight),
                      targetReps: t531.targetReps,
                      targetRpe: t531.targetRpe,
                      targetExplanation: expl531,
                    })
                  }
                } else if (sets.length > 3) {
                  // First 3 get 531; rest keep default progression for assistance-style extra sets
                  for (let i = 3; i < sets.length; i++) {
                    const prev = sortedLogs[i]
                    const previousSet = {
                      weight: parseFloat(prev.weight.toString()),
                      reps: prev.reps,
                      rpe: parseFloat(prev.rpe.toString()),
                      targetWeight: prev.target_weight ? parseFloat(prev.target_weight.toString()) : null,
                      targetReps: prev.target_reps,
                      targetRpe: prev.target_rpe ? parseFloat(prev.target_rpe.toString()) : null,
                    }
                    const setTarget = calculateSetTarget(
                      previousSet,
                      planType,
                      resolvedPlanSettings,
                      consecutiveUnderperformance,
                      roundToLoadable
                    )
                    const status = evaluateSetPerformance(
                      previousSet.weight,
                      previousSet.reps,
                      previousSet.rpe,
                      previousSet.targetWeight,
                      previousSet.targetReps,
                      previousSet.targetRpe
                    )
                    const targetExplanation = getTargetExplanation(
                      status,
                      planType,
                      consecutiveUnderperformance,
                      'default'
                    )
                    sets[i] = {
                      ...sets[i],
                      targetWeight: applyDeload(setTarget.targetWeight),
                      targetReps: setTarget.targetReps,
                      targetRpe: setTarget.targetRpe,
                      targetExplanation,
                    }
                  }
                }
              } else if (useLinearStrategy) {
                const deadlift1x5 = exerciseName.toLowerCase().includes('deadlift')
                const numSets = deadlift1x5 ? 1 : linearSetsPerExercise
                sets = sortedLogs.slice(0, numSets).map((log, idx) => {
                  const previousSet = {
                    weight: parseFloat(log.weight.toString()),
                    reps: log.reps,
                    rpe: parseFloat(log.rpe.toString()),
                    targetWeight: log.target_weight ? parseFloat(log.target_weight.toString()) : null,
                    targetReps: log.target_reps,
                    targetRpe: log.target_rpe ? parseFloat(log.target_rpe.toString()) : null,
                  }
                  const t = calculateLinearProgressionTarget(
                    previousSet,
                    exerciseName,
                    5,
                    consecutiveUnderperformance,
                    roundToLoadable
                  )
                  const explLinear = getTargetExplanation('met_target', planType, consecutiveUnderperformance, 'linear')
                  return {
                    setNumber: idx + 1,
                    setType: 'working' as SetType,
                    weight: parseFloat(log.weight.toString()),
                    reps: log.reps,
                    rpe: parseFloat(log.rpe.toString()),
                    targetWeight: applyDeload(t.targetWeight),
                    targetReps: t.targetReps,
                    targetRpe: t.targetRpe,
                    targetExplanation: explLinear,
                  }
                })
                while (sets.length < numSets) {
                  const lastLog = sortedLogs[Math.min(sets.length, sortedLogs.length) - 1]
                  const previousSet = lastLog
                    ? {
                        weight: parseFloat(lastLog.weight.toString()),
                        reps: lastLog.reps,
                        targetWeight: lastLog.target_weight ? parseFloat(lastLog.target_weight.toString()) : null,
                        targetReps: lastLog.target_reps,
                      }
                    : { weight: 0, reps: 0, targetWeight: null, targetReps: null }
                  const t = calculateLinearProgressionTarget(
                    previousSet,
                    exerciseName,
                    5,
                    consecutiveUnderperformance,
                    roundToLoadable
                  )
                  const explLinear = getTargetExplanation('met_target', planType, consecutiveUnderperformance, 'linear')
                  sets.push({
                    setNumber: sets.length + 1,
                    setType: 'working' as SetType,
                    weight: lastLog ? parseFloat(lastLog.weight.toString()) : 0,
                    reps: lastLog ? lastLog.reps : 0,
                    rpe: lastLog ? parseFloat(lastLog.rpe.toString()) : 5,
                    targetWeight: applyDeload(t.targetWeight),
                    targetReps: t.targetReps,
                    targetRpe: t.targetRpe,
                    targetExplanation: explLinear,
                  })
                }
              } else if (usePhulStrategy) {
                sets = sortedLogs.map((log, idx) => {
                  const previousSet = {
                    weight: parseFloat(log.weight.toString()),
                    reps: log.reps,
                    rpe: parseFloat(log.rpe.toString()),
                    targetWeight: log.target_weight ? parseFloat(log.target_weight.toString()) : null,
                    targetReps: log.target_reps,
                    targetRpe: log.target_rpe ? parseFloat(log.target_rpe.toString()) : null,
                  }
                  const setTarget = calculateSetTarget(
                    previousSet,
                    phulPlanType,
                    phulSettings,
                    consecutiveUnderperformance,
                    roundToLoadable
                  )
                  const status = evaluateSetPerformance(
                    previousSet.weight,
                    previousSet.reps,
                    previousSet.rpe,
                    previousSet.targetWeight,
                    previousSet.targetReps,
                    previousSet.targetRpe
                  )
                  const targetExplanation = getTargetExplanation(
                    status,
                    phulPlanType,
                    consecutiveUnderperformance,
                    'default'
                  )
                  return {
                    setNumber: idx + 1,
                    setType: 'working' as SetType,
                    weight: parseFloat(log.weight.toString()),
                    reps: log.reps,
                    rpe: parseFloat(log.rpe.toString()),
                    targetWeight: applyDeload(setTarget.targetWeight),
                    targetReps: setTarget.targetReps,
                    targetRpe: setTarget.targetRpe,
                    targetExplanation,
                  }
                })
              } else if (useGzclpStrategy && gzclpTier) {
                const numSets = gzclpTier === 1 ? 5 : 3
                sets = sortedLogs.slice(0, numSets).map((log, idx) => {
                  const previousSet = {
                    weight: parseFloat(log.weight.toString()),
                    reps: log.reps,
                    rpe: parseFloat(log.rpe.toString()),
                    targetWeight: log.target_weight ? parseFloat(log.target_weight.toString()) : null,
                    targetReps: log.target_reps,
                    targetRpe: log.target_rpe ? parseFloat(log.target_rpe.toString()) : null,
                  }
                  const t = calculateGZCLPSetTarget(
                    gzclpTier as 1 | 2 | 3,
                    idx,
                    previousSet,
                    exerciseName,
                    consecutiveUnderperformance,
                    roundToLoadable
                  )
                  const explGzclp = getTargetExplanation('met_target', planType, consecutiveUnderperformance, 'gzclp')
                  return {
                    setNumber: idx + 1,
                    setType: 'working' as SetType,
                    weight: parseFloat(log.weight.toString()),
                    reps: log.reps,
                    rpe: parseFloat(log.rpe.toString()),
                    targetWeight: applyDeload(t.targetWeight),
                    targetReps: t.targetReps,
                    targetRpe: t.targetRpe,
                    targetExplanation: explGzclp,
                  }
                })
                while (sets.length < numSets) {
                  const lastLog = sortedLogs[Math.min(sets.length, sortedLogs.length) - 1]
                  const prev = lastLog
                    ? {
                        weight: parseFloat(lastLog.weight.toString()),
                        reps: lastLog.reps,
                        targetWeight: lastLog.target_weight ? parseFloat(lastLog.target_weight.toString()) : null,
                        targetReps: lastLog.target_reps,
                      }
                    : { weight: 0, reps: 0, targetWeight: null, targetReps: null }
                  const t = calculateGZCLPSetTarget(
                    gzclpTier as 1 | 2 | 3,
                    sets.length,
                    prev,
                    exerciseName,
                    consecutiveUnderperformance,
                    roundToLoadable
                  )
                  const explGzclp = getTargetExplanation('met_target', planType, consecutiveUnderperformance, 'gzclp')
                  sets.push({
                    setNumber: sets.length + 1,
                    setType: 'working' as SetType,
                    weight: lastLog ? parseFloat(lastLog.weight.toString()) : 0,
                    reps: lastLog ? lastLog.reps : 0,
                    rpe: lastLog ? parseFloat(lastLog.rpe.toString()) : 5,
                    targetWeight: applyDeload(t.targetWeight),
                    targetReps: t.targetReps,
                    targetRpe: t.targetRpe,
                    targetExplanation: explGzclp,
                  })
                }
              } else if (useTexasMethodStrategy && texasDayType) {
                const numSets = texasDayType === 'volume' ? 5 : texasDayType === 'recovery' ? 2 : 1
                sets = sortedLogs.slice(0, numSets).map((log, idx) => {
                  const previousSet = {
                    weight: parseFloat(log.weight.toString()),
                    reps: log.reps,
                    rpe: parseFloat(log.rpe.toString()),
                    targetWeight: log.target_weight ? parseFloat(log.target_weight.toString()) : null,
                    targetReps: log.target_reps,
                    targetRpe: log.target_rpe ? parseFloat(log.target_rpe.toString()) : null,
                  }
                  const t = calculateTexasMethodSetTarget(
                    texasDayType,
                    idx,
                    previousSet,
                    exerciseName,
                    consecutiveUnderperformance,
                    roundToLoadable
                  )
                  const explTexas = getTargetExplanation('met_target', planType, consecutiveUnderperformance, 'texas', { weekLabel: texasDayType })
                  return {
                    setNumber: idx + 1,
                    setType: 'working' as SetType,
                    weight: parseFloat(log.weight.toString()),
                    reps: log.reps,
                    rpe: parseFloat(log.rpe.toString()),
                    targetWeight: applyDeload(t.targetWeight),
                    targetReps: t.targetReps,
                    targetRpe: t.targetRpe,
                    targetExplanation: explTexas,
                  }
                })
                while (sets.length < numSets) {
                  const lastLog = sortedLogs[Math.min(sets.length, sortedLogs.length) - 1]
                  const prev = lastLog
                    ? {
                        weight: parseFloat(lastLog.weight.toString()),
                        reps: lastLog.reps,
                        targetWeight: lastLog.target_weight ? parseFloat(lastLog.target_weight.toString()) : null,
                        targetReps: lastLog.target_reps,
                      }
                    : { weight: 0, reps: 0, targetWeight: null, targetReps: null }
                  const t = calculateTexasMethodSetTarget(
                    texasDayType,
                    sets.length,
                    prev,
                    exerciseName,
                    consecutiveUnderperformance,
                    roundToLoadable
                  )
                  const explTexas = getTargetExplanation('met_target', planType, consecutiveUnderperformance, 'texas', { weekLabel: texasDayType })
                  sets.push({
                    setNumber: sets.length + 1,
                    setType: 'working' as SetType,
                    weight: lastLog ? parseFloat(lastLog.weight.toString()) : 0,
                    reps: lastLog ? lastLog.reps : 0,
                    rpe: lastLog ? parseFloat(lastLog.rpe.toString()) : 5,
                    targetWeight: applyDeload(t.targetWeight),
                    targetReps: t.targetReps,
                    targetRpe: t.targetRpe,
                    targetExplanation: explTexas,
                  })
                }
              } else {
                // Default: planType-based progression (custom templates)
                sets = sortedLogs.map((log, idx) => {
                  const previousSet = {
                    weight: parseFloat(log.weight.toString()),
                    reps: log.reps,
                    rpe: parseFloat(log.rpe.toString()),
                    targetWeight: log.target_weight ? parseFloat(log.target_weight.toString()) : null,
                    targetReps: log.target_reps,
                    targetRpe: log.target_rpe ? parseFloat(log.target_rpe.toString()) : null,
                  }
                  const setTarget = calculateSetTarget(
                    previousSet,
                    planType,
                    resolvedPlanSettings,
                    consecutiveUnderperformance,
                    roundToLoadable
                  )
                  const status = evaluateSetPerformance(
                    previousSet.weight,
                    previousSet.reps,
                    previousSet.rpe,
                    previousSet.targetWeight,
                    previousSet.targetReps,
                    previousSet.targetRpe
                  )
                  const targetExplanation = getTargetExplanation(
                    status,
                    planType,
                    consecutiveUnderperformance,
                    'default'
                  )
                  return {
                    setNumber: idx + 1,
                    setType: 'working' as SetType,
                    weight: parseFloat(log.weight.toString()),
                    reps: log.reps,
                    rpe: parseFloat(log.rpe.toString()),
                    targetWeight: applyDeload(setTarget.targetWeight),
                    targetReps: setTarget.targetReps,
                    targetRpe: setTarget.targetRpe,
                    targetExplanation,
                  }
                })
              }
            } else {
              const emptySet = (n: number) => ({
                setNumber: n,
                setType: 'working' as SetType,
                weight: 0,
                reps: 0,
                rpe: 5,
                targetWeight: null,
                targetReps: null,
                targetRpe: null,
              })
              if (is531MainLift) {
                sets = [1, 2, 3].map(emptySet)
              } else if (useLinearStrategy) {
                const deadlift1x5 = exerciseName.toLowerCase().includes('deadlift')
                const numSets = deadlift1x5 ? 1 : linearSetsPerExercise
                sets = Array.from({ length: numSets }, (_, i) => emptySet(i + 1))
              } else if (useGzclpStrategy && gzclpTier) {
                const numSets = gzclpTier === 1 ? 5 : 3
                sets = Array.from({ length: numSets }, (_, i) => emptySet(i + 1))
              } else if (useTexasMethodStrategy && texasDayType) {
                const numSets = texasDayType === 'volume' ? 5 : texasDayType === 'recovery' ? 2 : 1
                sets = Array.from({ length: numSets }, (_, i) => emptySet(i + 1))
              } else {
                sets = [emptySet(1)]
              }
            }

            return {
              exerciseName,
              sets,
              exerciseFeedback: null,
            }
          })

          // Store feedback context for smarter exercise/workout feedback (new workout only)
          setFeedbackContext({
            underperformanceMap: exerciseUnderperformanceMap,
            lastSessionRpeMap,
            targetStrategy,
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
  }, [dayId, planType, exercises, userId, workoutDate, presetId])

  // Fetch user bodyweight for workout date (used for bodyweight exercises)
  useEffect(() => {
    let cancelled = false
    getBodyweightForDate(workoutDate).then((bw) => {
      if (!cancelled) setUserBodyweightForDate(bw)
    })
    return () => { cancelled = true }
  }, [workoutDate])

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

  /** Resolve effective weight for a set: user's bodyweight for bodyweight exercises, else set.weight */
  const getEffectiveWeight = (exerciseName: string, set: SetData): number => {
    if (isBodyweightExercise(exerciseName) && userBodyweightForDate) return userBodyweightForDate.weight
    return set.weight ?? 0
  }

  const handleSelectAlternative = async (newExerciseName: string) => {
    if (!planSettings) return
    const exIdx = currentExerciseIndex
    const originalExerciseName = exerciseData[exIdx]?.exerciseName ?? ''

    let result = await getMostRecentSessionWithExercise(dayId, newExerciseName, workoutDate, userId)
    let useEquivalenceScaling = false
    let weightRatio = 1

    if (!result) {
      const equiv = getExerciseEquivalence(newExerciseName)
      if (equiv && equiv.equivalentTo === originalExerciseName) {
        const sourceResult = await getMostRecentSessionWithExercise(dayId, originalExerciseName, workoutDate, userId)
        if (sourceResult) {
          result = sourceResult
          useEquivalenceScaling = true
          weightRatio = equiv.weightRatio
        }
      }
    }

    const workingLogs = result?.logs ?? []
    const sortedLogs = [...workingLogs].sort((a, b) => a.set_number - b.set_number)

    const allSessions = await getWorkoutSessions()
    const daySessions = allSessions
      .filter((s) => s.template_day_id === dayId)
      .sort((a, b) => new Date(b.workout_date).getTime() - new Date(a.workout_date).getTime())

    const exerciseForUnderperformance = useEquivalenceScaling ? originalExerciseName : newExerciseName
    let consecutiveUnderperformance = 0
    for (let i = 0; i < Math.min(daySessions.length, 5); i++) {
      const session = daySessions[i]
      const sessionLogs = await getExerciseLogsForSession(session.id)
      const exLogs = sessionLogs.filter(
        (l) => l.exercise_name === exerciseForUnderperformance && (l.set_type ?? 'working') === 'working'
      )
      if (exLogs.length === 0) break
      if (exLogs.some((l) => l.performance_status === 'underperformed')) consecutiveUnderperformance++
      else break
    }

    const targetStrategy = getPresetTargetStrategy(presetId ?? undefined)
    const use531Strategy = targetStrategy === '531'
    const useLinearStrategy = targetStrategy === 'startingStrength' || targetStrategy === 'stronglifts'
    const usePhulStrategy = targetStrategy === 'phul'
    const useGzclpStrategy = targetStrategy === 'gzclp'
    const useTexasMethodStrategy = targetStrategy === 'texasMethod'
    const phulPlanType = dayLabel.toLowerCase().includes('power') ? 'strength' : 'hypertrophy'
    const phulSettings = getDefaultPlanSettings(phulPlanType)
    const texasDayType = getTexasMethodDayType(dayLabel)
    const linearSetsPerExercise = targetStrategy === 'stronglifts' ? 5 : 3
    const plateConfig = getPlateConfig(userId)
    const roundToLoadable = (w: number) => roundToLoadableWeight(w, plateConfig.plates, plateConfig.barWeight)
    const inDeload = isInDeloadPeriod(userId, workoutDate)
    const deloadMult = getDeloadMultiplier()
    const applyDeload = (tw: number | null) =>
      tw != null && inDeload ? Math.round(tw * deloadMult * 2) / 2 : tw
    const exerciseForTargetComputation = useEquivalenceScaling ? originalExerciseName : newExerciseName
    const applyTargetWeight = (tw: number | null) => {
      if (tw == null) return null
      const val = useEquivalenceScaling ? roundToLoadable(tw * weightRatio) : tw
      return applyDeload(val)
    }
    const logWeight = (log: { weight: unknown }, fallback = 0) =>
      useEquivalenceScaling ? fallback : parseFloat(String(log.weight ?? 0))
    const logReps = (log: { reps: number }, fallback = 0) =>
      useEquivalenceScaling ? fallback : (log.reps ?? 0)
    const logRpe = (log: { rpe: unknown }, fallback = 5) =>
      useEquivalenceScaling ? fallback : parseFloat(String(log.rpe ?? 5))
    const is531MainLift = use531Strategy && exIdx === 0
    const gzclpTier = useGzclpStrategy ? (exIdx === 0 ? 1 : exIdx === 1 ? 2 : 3) : null

    const emptySet = (n: number): SetData => ({
      setNumber: n,
      setType: 'working' as SetType,
      weight: 0,
      reps: 0,
      rpe: 5,
      targetWeight: null,
      targetReps: null,
      targetRpe: null,
    })

    let sets: SetData[] = []
    if (sortedLogs.length > 0) {
      if (is531MainLift) {
        const set1RMs = sortedLogs.map((l) => estimated1RM(parseFloat(l.weight.toString()), l.reps))
        const prevE1RM = set1RMs.length > 0 ? Math.max(...set1RMs) : 0
        const trainingMax = prevE1RM * 0.9
        const cycleWeek = get531CycleWeek(daySessions.length + 1)
        const expl531 = getTargetExplanation('met_target', planType, 0, '531', { cycleWeek })
        sets = sortedLogs.slice(0, 3).map((log, idx) => {
          const setIndex = idx as 0 | 1 | 2
          const t531 =
            trainingMax > 0
              ? calculate531SetTarget(cycleWeek, setIndex, trainingMax, roundToLoadable)
              : { targetWeight: null, targetReps: null, targetRpe: null }
          return {
            setNumber: idx + 1,
            setType: 'working' as SetType,
            weight: logWeight(log),
            reps: logReps(log),
            rpe: logRpe(log),
            targetWeight: applyTargetWeight(t531.targetWeight),
            targetReps: t531.targetReps,
            targetRpe: t531.targetRpe,
            targetExplanation: expl531,
          }
        })
        while (sets.length < 3) {
          const setIndex = sets.length as 0 | 1 | 2
          const t531 =
            trainingMax > 0
              ? calculate531SetTarget(cycleWeek, setIndex, trainingMax, roundToLoadable)
              : { targetWeight: null, targetReps: null, targetRpe: null }
          sets.push({
            ...emptySet(sets.length + 1),
            targetWeight: applyTargetWeight(t531.targetWeight),
            targetReps: t531.targetReps,
            targetRpe: t531.targetRpe,
            targetExplanation: expl531,
          })
        }
      } else if (useLinearStrategy) {
        const deadlift1x5 = newExerciseName.toLowerCase().includes('deadlift')
        const numSets = deadlift1x5 ? 1 : linearSetsPerExercise
        const explLinear = getTargetExplanation('met_target', planType, consecutiveUnderperformance, 'linear')
        sets = sortedLogs.slice(0, numSets).map((log, idx) => {
          const prev = {
            weight: parseFloat(log.weight.toString()),
            reps: log.reps,
            rpe: parseFloat(log.rpe.toString()),
            targetWeight: log.target_weight ? parseFloat(log.target_weight.toString()) : null,
            targetReps: log.target_reps,
            targetRpe: log.target_rpe ? parseFloat(log.target_rpe.toString()) : null,
          }
          const t = calculateLinearProgressionTarget(prev, exerciseForTargetComputation, 5, consecutiveUnderperformance, roundToLoadable)
          return {
            setNumber: idx + 1,
            setType: 'working' as SetType,
            weight: logWeight(log),
            reps: logReps(log),
            rpe: logRpe(log),
            targetWeight: applyTargetWeight(t.targetWeight),
            targetReps: t.targetReps,
            targetRpe: t.targetRpe,
            targetExplanation: explLinear,
          }
        })
        while (sets.length < numSets) {
          const lastLog = sortedLogs[Math.min(sets.length, sortedLogs.length) - 1]
          const prev = lastLog
            ? {
                weight: parseFloat(lastLog.weight.toString()),
                reps: lastLog.reps,
                targetWeight: lastLog.target_weight ? parseFloat(lastLog.target_weight.toString()) : null,
                targetReps: lastLog.target_reps,
              }
            : { weight: 0, reps: 0, targetWeight: null, targetReps: null }
          const t = calculateLinearProgressionTarget(prev, exerciseForTargetComputation, 5, consecutiveUnderperformance, roundToLoadable)
          sets.push({
            ...emptySet(sets.length + 1),
            weight: lastLog ? logWeight(lastLog) : 0,
            reps: lastLog ? logReps(lastLog) : 0,
            rpe: lastLog ? logRpe(lastLog) : 5,
            targetWeight: applyTargetWeight(t.targetWeight),
            targetReps: t.targetReps,
            targetRpe: t.targetRpe,
            targetExplanation: explLinear,
          })
        }
      } else if (usePhulStrategy) {
        sets = sortedLogs.map((log, idx) => {
          const prev = {
            weight: parseFloat(log.weight.toString()),
            reps: log.reps,
            rpe: parseFloat(log.rpe.toString()),
            targetWeight: log.target_weight ? parseFloat(log.target_weight.toString()) : null,
            targetReps: log.target_reps,
            targetRpe: log.target_rpe ? parseFloat(log.target_rpe.toString()) : null,
          }
          const st = calculateSetTarget(prev, phulPlanType, phulSettings, consecutiveUnderperformance, roundToLoadable)
          const status = evaluateSetPerformance(prev.weight, prev.reps, prev.rpe, prev.targetWeight, prev.targetReps, prev.targetRpe)
          const expl = getTargetExplanation(status, phulPlanType, consecutiveUnderperformance, 'default')
          return {
            setNumber: idx + 1,
            setType: 'working' as SetType,
            weight: logWeight(log),
            reps: logReps(log),
            rpe: logRpe(log),
            targetWeight: applyTargetWeight(st.targetWeight),
            targetReps: st.targetReps,
            targetRpe: st.targetRpe,
            targetExplanation: expl,
          }
        })
      } else if (useGzclpStrategy && gzclpTier) {
        const numSets = gzclpTier === 1 ? 5 : 3
        const explGzclp = getTargetExplanation('met_target', planType, consecutiveUnderperformance, 'gzclp')
        sets = sortedLogs.slice(0, numSets).map((log, idx) => {
          const prev = {
            weight: parseFloat(log.weight.toString()),
            reps: log.reps,
            rpe: parseFloat(log.rpe.toString()),
            targetWeight: log.target_weight ? parseFloat(log.target_weight.toString()) : null,
            targetReps: log.target_reps,
            targetRpe: log.target_rpe ? parseFloat(log.target_rpe.toString()) : null,
          }
          const t = calculateGZCLPSetTarget(gzclpTier, idx, prev, exerciseForTargetComputation, consecutiveUnderperformance, roundToLoadable)
          return {
            setNumber: idx + 1,
            setType: 'working' as SetType,
            weight: logWeight(log),
            reps: logReps(log),
            rpe: logRpe(log),
            targetWeight: applyTargetWeight(t.targetWeight),
            targetReps: t.targetReps,
            targetRpe: t.targetRpe,
            targetExplanation: explGzclp,
          }
        })
        while (sets.length < numSets) {
          const lastLog = sortedLogs[Math.min(sets.length, sortedLogs.length) - 1]
          const prev = lastLog
            ? {
                weight: parseFloat(lastLog.weight.toString()),
                reps: lastLog.reps,
                targetWeight: lastLog.target_weight ? parseFloat(lastLog.target_weight.toString()) : null,
                targetReps: lastLog.target_reps,
              }
            : { weight: 0, reps: 0, targetWeight: null, targetReps: null }
          const t = calculateGZCLPSetTarget(gzclpTier, sets.length, prev, exerciseForTargetComputation, consecutiveUnderperformance, roundToLoadable)
          sets.push({
            ...emptySet(sets.length + 1),
            weight: lastLog ? logWeight(lastLog) : 0,
            reps: lastLog ? logReps(lastLog) : 0,
            rpe: lastLog ? logRpe(lastLog) : 5,
            targetWeight: applyTargetWeight(t.targetWeight),
            targetReps: t.targetReps,
            targetRpe: t.targetRpe,
            targetExplanation: explGzclp,
          })
        }
      } else if (useTexasMethodStrategy && texasDayType) {
        const numSets = texasDayType === 'volume' ? 5 : texasDayType === 'recovery' ? 2 : 1
        const explTexas = getTargetExplanation('met_target', planType, consecutiveUnderperformance, 'texas', { weekLabel: texasDayType })
        sets = sortedLogs.slice(0, numSets).map((log, idx) => {
          const prev = {
            weight: parseFloat(log.weight.toString()),
            reps: log.reps,
            rpe: parseFloat(log.rpe.toString()),
            targetWeight: log.target_weight ? parseFloat(log.target_weight.toString()) : null,
            targetReps: log.target_reps,
            targetRpe: log.target_rpe ? parseFloat(log.target_rpe.toString()) : null,
          }
          const t = calculateTexasMethodSetTarget(texasDayType, idx, prev, exerciseForTargetComputation, consecutiveUnderperformance, roundToLoadable)
          return {
            setNumber: idx + 1,
            setType: 'working' as SetType,
            weight: logWeight(log),
            reps: logReps(log),
            rpe: logRpe(log),
            targetWeight: applyTargetWeight(t.targetWeight),
            targetReps: t.targetReps,
            targetRpe: t.targetRpe,
            targetExplanation: explTexas,
          }
        })
        while (sets.length < numSets) {
          const lastLog = sortedLogs[Math.min(sets.length, sortedLogs.length) - 1]
          const prev = lastLog
            ? {
                weight: parseFloat(lastLog.weight.toString()),
                reps: lastLog.reps,
                targetWeight: lastLog.target_weight ? parseFloat(lastLog.target_weight.toString()) : null,
                targetReps: lastLog.target_reps,
              }
            : { weight: 0, reps: 0, targetWeight: null, targetReps: null }
          const t = calculateTexasMethodSetTarget(texasDayType, sets.length, prev, exerciseForTargetComputation, consecutiveUnderperformance, roundToLoadable)
          sets.push({
            ...emptySet(sets.length + 1),
            weight: lastLog ? logWeight(lastLog) : 0,
            reps: lastLog ? logReps(lastLog) : 0,
            rpe: lastLog ? logRpe(lastLog) : 5,
            targetWeight: applyTargetWeight(t.targetWeight),
            targetReps: t.targetReps,
            targetRpe: t.targetRpe,
            targetExplanation: explTexas,
          })
        }
      } else {
        sets = sortedLogs.map((log, idx) => {
          const prev = {
            weight: parseFloat(log.weight.toString()),
            reps: log.reps,
            rpe: parseFloat(log.rpe.toString()),
            targetWeight: log.target_weight ? parseFloat(log.target_weight.toString()) : null,
            targetReps: log.target_reps,
            targetRpe: log.target_rpe ? parseFloat(log.target_rpe.toString()) : null,
          }
          const st = calculateSetTarget(prev, planType, planSettings, consecutiveUnderperformance, roundToLoadable)
          const status = evaluateSetPerformance(prev.weight, prev.reps, prev.rpe, prev.targetWeight, prev.targetReps, prev.targetRpe)
          const expl = getTargetExplanation(status, planType, consecutiveUnderperformance, 'default')
          return {
            setNumber: idx + 1,
            setType: 'working' as SetType,
            weight: logWeight(log),
            reps: logReps(log),
            rpe: logRpe(log),
            targetWeight: applyTargetWeight(st.targetWeight),
            targetReps: st.targetReps,
            targetRpe: st.targetRpe,
            targetExplanation: expl,
          }
        })
      }
    } else {
      if (is531MainLift) sets = [1, 2, 3].map(emptySet)
      else if (useLinearStrategy) {
        const deadlift1x5 = newExerciseName.toLowerCase().includes('deadlift')
        const numSets = deadlift1x5 ? 1 : linearSetsPerExercise
        sets = Array.from({ length: numSets }, (_, i) => emptySet(i + 1))
      } else if (useGzclpStrategy && gzclpTier) {
        const numSets = gzclpTier === 1 ? 5 : 3
        sets = Array.from({ length: numSets }, (_, i) => emptySet(i + 1))
      } else if (useTexasMethodStrategy && texasDayType) {
        const numSets = texasDayType === 'volume' ? 5 : texasDayType === 'recovery' ? 2 : 1
        sets = Array.from({ length: numSets }, (_, i) => emptySet(i + 1))
      } else sets = [emptySet(1)]
    }

    setExerciseData((prev) => {
      const next = [...prev]
      next[exIdx] = {
        ...next[exIdx],
        exerciseName: newExerciseName,
        sets,
        exerciseFeedback: null,
        exerciseRating: null,
      }
      return next
    })
    setExerciseInfoModal(null)
    setConfirmedSets((prev) => {
      const next = new Set(prev)
      next.forEach((key) => {
        if (key.startsWith(`${exIdx}-`)) next.delete(key)
      })
      return next
    })
  }

  // Helper function to get sort order for set types
  const getSetTypeOrder = (setType: SetType): number => {
    if (setType === 'warmup') return 0
    if (setType === 'working') return 1
    return 2 // cooldown
  }

  const addSet = (exerciseIndex: number, setType: SetType) => {
    const newData = [...exerciseData]
    const exercise = newData[exerciseIndex]
    const lastSet = exercise.sets[exercise.sets.length - 1]
    const lastWorking = [...exercise.sets].reverse().find((s) => s.setType === 'working')
    
    // Only copy data from previous sets when adding working sets
    // For warmup/cooldown, start with blank values
    const template = setType === 'working' ? (lastWorking ?? lastSet) : null
    
    const newSet: SetData = {
      setNumber: exercise.sets.length + 1,
      setType,
      weight: setType === 'working' ? (template?.weight ?? 0) : 0,
      reps: setType === 'working' ? (template?.reps ?? 0) : 0,
      rpe: 0,
      targetWeight: setType === 'working' ? (template?.targetWeight ?? null) : null,
      targetReps: setType === 'working' ? (template?.targetReps ?? null) : null,
      targetRpe: null,
      targetExplanation: setType === 'working' ? (template?.targetExplanation ?? null) : null,
    }

    // Insert set in the correct position based on type
    const setTypeOrder = getSetTypeOrder(setType)
    let insertIndex = exercise.sets.length
    
    if (setType === 'warmup') {
      // Insert after the last warmup set, or at the beginning if no warmup sets exist
      let lastWarmupIndex = -1
      for (let i = exercise.sets.length - 1; i >= 0; i--) {
        if (exercise.sets[i].setType === 'warmup') {
          lastWarmupIndex = i
          break
        }
      }
      insertIndex = lastWarmupIndex === -1 ? 0 : lastWarmupIndex + 1
    } else if (setType === 'working') {
      // Insert after warm-up sets, before cool-down sets
      insertIndex = exercise.sets.findIndex((s) => getSetTypeOrder(s.setType) > setTypeOrder)
      if (insertIndex === -1) insertIndex = exercise.sets.length
    } else {
      // Cool-down: insert at the end (after all working sets)
      insertIndex = exercise.sets.length
    }

    exercise.sets.splice(insertIndex, 0, newSet)
    
    // Renumber all sets after insertion
    exercise.sets.forEach((set, index) => {
      set.setNumber = index + 1
    })
    
    setExerciseData(newData)
  }

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetData,
    value: number
  ) => {
    // Bodyweight exercises: weight is from user's weight log, not editable
    if (field === 'weight' && isBodyweightExercise(exerciseData[exerciseIndex].exerciseName)) return

    // Validate and clamp values on input
    let validated = value
    if (field === 'weight') validated = Math.max(0, value)
    else if (field === 'reps') validated = Math.max(0, Math.floor(value))
    else if (field === 'rpe') validated = value > 0 ? Math.max(1, Math.min(10, value)) : value

    const newData = [...exerciseData]
    const set = newData[exerciseIndex].sets[setIndex]
    ;(set as any)[field] = validated
    setExerciseData(newData)
    setSetValidationError(null) // Clear validation error when user edits
    
    // Unconfirm the set if it was previously confirmed
    const key = `${exerciseIndex}-${setIndex}`
    if (confirmedSets.has(key)) {
      const newConfirmed = new Set(confirmedSets)
      newConfirmed.delete(key)
      setConfirmedSets(newConfirmed)
      console.log('🔄 Set unconfirmed due to edit:', { exerciseIndex, setIndex, field, value })
    }
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

  // Discard draft workout
  const discardDraft = async () => {
    if (!draftSessionId) return

    try {
      await deleteWorkoutSession(draftSessionId)
      setDraftSessionId(null)
      setIsResumedDraft(false)
      // Redirect to workout selection instead of reloading
      router.push('/workout/log')
    } catch (err) {
      console.error('Failed to discard draft:', err)
      setError('Failed to discard draft workout')
    }
  }

  // Auto-save workout as draft
  const autoSaveWorkout = async () => {
    console.log('🔵 Auto-save triggered', { 
      isEditMode, 
      workoutComplete, 
      autoSaving, 
      confirmedSetsCount: confirmedSets.size,
      draftSessionId 
    })

    // Skip auto-save in edit mode or if workout is complete
    if (isEditMode || workoutComplete || autoSaving) {
      console.log('🔴 Auto-save skipped - early return', { isEditMode, workoutComplete, autoSaving })
      return
    }

    // Only auto-save if at least one set has been confirmed
    if (confirmedSets.size === 0) {
      console.log('🔴 Auto-save skipped - no confirmed sets')
      return
    }

    try {
      setAutoSaving(true)
      console.log('🟢 Saving draft...', { 
        draftSessionId, 
        dayId, 
        workoutDate,
        exerciseCount: exerciseData.length 
      })

      const savedSessionId = await saveDraftWorkoutSession(
        {
          templateDayId: dayId,
          workoutDate,
          exercises: exerciseData.map((exercise) => ({
            exerciseName: exercise.exerciseName,
            sets: exercise.sets.map((set) => ({
              setNumber: set.setNumber,
              setType: set.setType,
              weight: getEffectiveWeight(exercise.exerciseName, set),
              reps: set.reps,
              rpe: set.rpe,
              targetWeight: set.targetWeight ?? null,
              targetReps: set.targetReps ?? null,
              targetRpe: set.targetRpe ?? null,
              performanceStatus: null, // Draft workouts don't have performance status
              exerciseFeedback: null,
            })),
          })),
        },
        draftSessionId || undefined
      )

      console.log('✅ Draft saved successfully', { savedSessionId })

      // Set draft session ID if this is the first save
      if (!draftSessionId) {
        setDraftSessionId(savedSessionId)
        console.log('✅ Draft session ID set for first time', { savedSessionId })
      }
    } catch (err) {
      console.error('❌ Auto-save failed:', err)
      // Don't show error to user for auto-save failures
    } finally {
      setAutoSaving(false)
    }
  }

  const confirmSet = async (exerciseIndex: number, setIndex: number) => {
    const key = `${exerciseIndex}-${setIndex}`
    const exercise = exerciseData[exerciseIndex]
    const set = exercise.sets[setIndex]

    // Validate set data before confirming
    const weight = getEffectiveWeight(exercise.exerciseName, set)
    const reps = set.reps ?? 0
    const rpe = set.rpe ?? 0
    if (weight <= 0 || !Number.isFinite(weight)) {
      setSetValidationError({
        key,
        message: isBodyweightExercise(exercise.exerciseName)
          ? 'Log your weight in Profile > Weight to track bodyweight exercises'
          : 'Weight must be a positive number',
      })
      return
    }
    if (reps <= 0 || !Number.isInteger(reps)) {
      setSetValidationError({ key, message: 'Reps must be a positive whole number' })
      return
    }
    if (rpe > 0 && (rpe < 1 || rpe > 10 || !Number.isFinite(rpe))) {
      setSetValidationError({ key, message: 'RPE must be between 1 and 10' })
      return
    }

    setSetValidationError(null)
    console.log('🔵 Confirming set', { exerciseIndex, setIndex, key })
    const newConfirmed = new Set(confirmedSets)
    newConfirmed.add(key)
    setConfirmedSets(newConfirmed)

    const effectiveWeight = getEffectiveWeight(exercise.exerciseName, set)
    if (set.setType === 'working' && effectiveWeight > 0 && set.reps > 0) {
      try {
        // Collect all confirmed working sets for this exercise
        const confirmedEntries: { key: string; weight: number; reps: number; e1rm: number }[] = []
        exercise.sets.forEach((s, i) => {
          const w = getEffectiveWeight(exercise.exerciseName, s)
          if (s.setType !== 'working' || w <= 0 || s.reps <= 0) return
          const setKey = `${exerciseIndex}-${i}`
          if (!newConfirmed.has(setKey)) return
          confirmedEntries.push({
            key: setKey,
            weight: w,
            reps: s.reps,
            e1rm: estimated1RM(w, s.reps),
          })
        })

        if (confirmedEntries.length === 0) {
          if (restTimerEnabled) {
            setShowRestTimer(true)
            setRestTimerAfterSetKey(key)
          }
          return
        }

        // Single set with max weight and single set with max e1RM (may be same set)
        const maxWeightEntry = confirmedEntries.reduce((a, b) => (b.weight > a.weight ? b : a))
        const maxE1RMEntry = confirmedEntries.reduce((a, b) => (b.e1rm > a.e1rm ? b : a))

        const otherSetsFor = (excludeKey: string) =>
          confirmedEntries.filter((e) => e.key !== excludeKey).map((e) => ({ weight: e.weight, reps: e.reps }))

        const [heaviestStatus, e1rmStatus] = await Promise.all([
          checkSetPR(
            dayId,
            exercise.exerciseName,
            maxWeightEntry.weight,
            maxWeightEntry.reps,
            otherSetsFor(maxWeightEntry.key)
          ),
          checkSetPR(
            dayId,
            exercise.exerciseName,
            maxE1RMEntry.weight,
            maxE1RMEntry.reps,
            otherSetsFor(maxE1RMEntry.key)
          ),
        ])

        setPrBadges((prev) => {
          const next = new Map(prev)
          for (const k of next.keys()) {
            if (k.startsWith(`${exerciseIndex}-`)) next.delete(k)
          }
          next.set(maxWeightEntry.key, {
            heaviestSetPR: heaviestStatus.isHeaviestSetPR,
            e1RMPR: maxWeightEntry.key === maxE1RMEntry.key ? e1rmStatus.isE1RMPR : false,
          })
          if (maxE1RMEntry.key !== maxWeightEntry.key) {
            next.set(maxE1RMEntry.key, {
              heaviestSetPR: false,
              e1RMPR: e1rmStatus.isE1RMPR,
            })
          }
          return next
        })
      } catch {
        // Ignore PR check errors
      }
    }

    // Show rest timer after confirming a set (if enabled)
    if (restTimerEnabled) {
      setShowRestTimer(true)
      setRestTimerAfterSetKey(key)
    }

    // Auto-save after confirming a set
    autoSaveWorkout().catch(err => {
      console.error('❌ Auto-save error in confirmSet:', err)
      setError('Failed to auto-save workout. Your progress may not be saved.')
    })

    // If exercise was already completed, recalculate rating and feedback with updated data
    if (exercise.exerciseFeedback) {
      console.log('🔄 Recalculating exercise rating after set re-confirmation', { exerciseIndex })
      const { feedback, exerciseRating } = calculateExerciseRatingAndFeedback(exerciseIndex)
      
      const newData = [...exerciseData]
      newData[exerciseIndex].exerciseFeedback = feedback
      newData[exerciseIndex].exerciseRating = exerciseRating
      setExerciseData(newData)
    }
  }

  const calculateExerciseRatingAndFeedback = (exerciseIndex: number) => {
    const exercise = exerciseData[exerciseIndex]
    const workingSets = exercise.sets.filter((s) => s.setType === 'working')
    
    // Evaluate performance for working sets only (warmup/cooldown don't count)
    const performanceStatuses = workingSets.map((set) =>
      evaluateSetPerformance(
        getEffectiveWeight(exercise.exerciseName, set),
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
          weight: getEffectiveWeight(exercise.exerciseName, set),
          reps: set.reps,
          rpe: set.rpe,
          targetWeight: set.targetWeight ?? null,
          targetReps: set.targetReps ?? null,
          targetRpe: set.targetRpe ?? null,
        })),
      },
      planType,
      {
        underperformanceMap: feedbackContext.underperformanceMap,
        lastSessionRpeMap: feedbackContext.lastSessionRpeMap,
        targetStrategy: feedbackContext.targetStrategy ?? getPresetTargetStrategy(presetId ?? undefined),
      }
    )

    return { feedback, exerciseRating }
  }

  const completeExercise = (exerciseIndex: number) => {
    const { feedback, exerciseRating } = calculateExerciseRatingAndFeedback(exerciseIndex)
    
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
      // If completing a draft workout, handle it separately
      if (draftSessionId && !isEditMode) {
        // Calculate overall rating and feedback from working sets only
        const workoutPerformance = {
          exercises: exerciseData.map((exercise) => {
            const workingSets = exercise.sets.filter((s) => s.setType === 'working')
            const statuses = workingSets.map((set) =>
              evaluateSetPerformance(
                getEffectiveWeight(exercise.exerciseName, set),
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
                weight: getEffectiveWeight(exercise.exerciseName, set),
                reps: set.reps,
                rpe: set.rpe,
                targetWeight: set.targetWeight ?? null,
                targetReps: set.targetReps ?? null,
                targetRpe: set.targetRpe ?? null,
              })),
            }
          }),
          overallRating: 0,
        }

        const rating = calculateWorkoutRating(workoutPerformance)
        workoutPerformance.overallRating = rating
        let feedback = generateWorkoutFeedback(workoutPerformance, planType, {
          underperformanceMap: feedbackContext.underperformanceMap,
          lastSessionRpeMap: feedbackContext.lastSessionRpeMap,
          targetStrategy: feedbackContext.targetStrategy ?? getPresetTargetStrategy(presetId ?? undefined),
        })

        const draftPrs = await getPRsForSession(
          dayId,
          exerciseData.map((e) => ({
            exerciseName: e.exerciseName,
            sets: e.sets.map((s) => ({ setType: s.setType, weight: getEffectiveWeight(e.exerciseName, s), reps: s.reps })),
          })),
          draftSessionId
        )
        if (draftPrs.length > 0) {
          setWorkoutCompletePRs(draftPrs)
        }

        // Update the draft session with performance data and mark as complete
        await updateWorkoutSession(draftSessionId, {
          templateDayId: dayId,
          workoutDate,
          overallRating: rating,
          overallFeedback: feedback,
          isComplete: true,
          exercises: exerciseData.map((exercise) => ({
            exerciseName: exercise.exerciseName,
            sets: exercise.sets.map((set) => {
              const weight = getEffectiveWeight(exercise.exerciseName, set)
              const performanceStatus =
                set.setType === 'working'
                  ? evaluateSetPerformance(
                      weight,
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
                weight,
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
        checkAndUnlockAchievements().catch(() => {})
        return
      }

      if (isEditMode && sessionId) {
        // Edit mode: Update existing session (only working sets count for rating/feedback)
        const workoutPerformance = {
          exercises: exerciseData.map((exercise) => {
            const workingSets = exercise.sets.filter((s) => s.setType === 'working')
            const statuses = workingSets.map((set) =>
              evaluateSetPerformance(
                getEffectiveWeight(exercise.exerciseName, set),
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
                weight: getEffectiveWeight(exercise.exerciseName, set),
                reps: set.reps,
                rpe: set.rpe,
                targetWeight: set.targetWeight ?? null,
                targetReps: set.targetReps ?? null,
                targetRpe: set.targetRpe ?? null,
              })),
            }
          }),
          overallRating: 0,
        }

        const rating = calculateWorkoutRating(workoutPerformance)
        workoutPerformance.overallRating = rating
        let feedback = generateWorkoutFeedback(workoutPerformance, planType, {
          underperformanceMap: feedbackContext.underperformanceMap,
          lastSessionRpeMap: feedbackContext.lastSessionRpeMap,
          targetStrategy: feedbackContext.targetStrategy ?? getPresetTargetStrategy(presetId ?? undefined),
        })

        const editPrs = await getPRsForSession(
          dayId,
          exerciseData.map((e) => ({
            exerciseName: e.exerciseName,
            sets: e.sets.map((s) => ({ setType: s.setType, weight: getEffectiveWeight(e.exerciseName, s), reps: s.reps })),
          })),
          sessionId
        )
        if (editPrs.length > 0) {
          setWorkoutCompletePRs(editPrs)
        }

        // Update workout session (all sets saved; performanceStatus only for working sets)
        await updateWorkoutSession(sessionId, {
          templateDayId: dayId,
          workoutDate,
          overallRating: rating,
          overallFeedback: feedback,
          exercises: exerciseData.map((exercise) => ({
            exerciseName: exercise.exerciseName,
            sets: exercise.sets.map((set) => {
              const weight = getEffectiveWeight(exercise.exerciseName, set)
              const performanceStatus =
                set.setType === 'working'
                  ? evaluateSetPerformance(
                      weight,
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
                weight,
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

      // Baseline workout: skip rating and feedback calculation (but can show PRs)
      if (isBaselineWorkout) {
        const baselinePrs = await getPRsForSession(dayId, exerciseData.map((e) => ({
          exerciseName: e.exerciseName,
          sets: e.sets.map((s) => ({ setType: s.setType, weight: getEffectiveWeight(e.exerciseName, s), reps: s.reps })),
        })))

        // Save workout session without rating/feedback (baseline week)
        await saveWorkoutSession({
          templateDayId: dayId,
          workoutDate,
          exercises: exerciseData.map((exercise) => ({
            exerciseName: exercise.exerciseName,
            sets: exercise.sets.map((set) => {
              // Baseline workouts have no targets, so no performance status
              return {
                setNumber: set.setNumber,
                setType: set.setType,
                weight: getEffectiveWeight(exercise.exerciseName, set),
                reps: set.reps,
                rpe: set.rpe,
                targetWeight: set.targetWeight ?? null,
                targetReps: set.targetReps ?? null,
                targetRpe: set.targetRpe ?? null,
                performanceStatus: null,
                exerciseFeedback: exercise.exerciseFeedback || null,
              }
            }),
          })),
        })

        setOverallRating(null)
        setOverallFeedback(null) // PRs shown as bullet list when present
        setWorkoutCompletePRs(baselinePrs.length > 0 ? baselinePrs : null)
        setWorkoutComplete(true)
        checkAndUnlockAchievements().catch(() => {})
        return
      }

      // Calculate overall rating and feedback from working sets only
      const workoutPerformance = {
        exercises: exerciseData.map((exercise) => {
          const workingSets = exercise.sets.filter((s) => s.setType === 'working')
          const statuses = workingSets.map((set) =>
            evaluateSetPerformance(
              getEffectiveWeight(exercise.exerciseName, set),
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
                weight: getEffectiveWeight(exercise.exerciseName, set),
                reps: set.reps,
                rpe: set.rpe,
                targetWeight: set.targetWeight ?? null,
                targetReps: set.targetReps ?? null,
                targetRpe: set.targetRpe ?? null,
              })),
            }
          }),
          overallRating: 0,
        }

      const rating = calculateWorkoutRating(workoutPerformance)
      workoutPerformance.overallRating = rating
      let feedback = generateWorkoutFeedback(workoutPerformance, planType, {
        underperformanceMap: feedbackContext.underperformanceMap,
        lastSessionRpeMap: feedbackContext.lastSessionRpeMap,
        targetStrategy: feedbackContext.targetStrategy ?? getPresetTargetStrategy(presetId ?? undefined),
      })

      const prs = await getPRsForSession(dayId, exerciseData.map((e) => ({
        exerciseName: e.exerciseName,
        sets: e.sets.map((s) => ({ setType: s.setType, weight: getEffectiveWeight(e.exerciseName, s), reps: s.reps })),
      })))
      if (prs.length > 0) setWorkoutCompletePRs(prs)

      // Save workout session (all sets; performanceStatus only for working sets)
      await saveWorkoutSession({
        templateDayId: dayId,
        workoutDate,
        overallRating: rating,
        overallFeedback: feedback,
        exercises: exerciseData.map((exercise) => ({
          exerciseName: exercise.exerciseName,
          sets: exercise.sets.map((set) => {
            const weight = getEffectiveWeight(exercise.exerciseName, set)
            const performanceStatus =
              set.setType === 'working'
                ? evaluateSetPerformance(
                    weight,
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
              weight,
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

      checkAndUnlockAchievements().catch(() => {})
      setOverallRating(rating)
      setOverallFeedback(feedback) // PRs shown as bullet list below, not in paragraph
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
          {overallRating === null ? (
            <div className="mb-6">
              <p className="text-lg font-semibold text-white mb-2">Baseline Recorded</p>
              <p className="text-[#a1a1a1] mb-4">This was your first workout for this day. Targets and a rating will appear from your next workout for this day.</p>
              {workoutCompletePRs && workoutCompletePRs.length > 0 && (
                <div className="text-amber-300 text-sm font-medium">
                  <p className="mb-2">You hit {workoutCompletePRs.length} PR(s) today:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {workoutCompletePRs.map((p, i) => (
                      <li key={i}>
                        {p.prType === 'heaviestSet'
                          ? `${p.exerciseName} (heaviest set: ${p.value} lbs)`
                          : `${p.exerciseName} (estimated 1RM: ${p.value} lbs)`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-lg font-semibold text-white">Overall Rating: <span className="text-white font-bold">{overallRating}/10</span></p>
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 text-white">Overall Feedback:</h3>
                <p className="text-[#a1a1a1] whitespace-pre-line">{overallFeedback}</p>
                {workoutCompletePRs && workoutCompletePRs.length > 0 && (
                  <div className="mt-4 text-amber-300 text-sm font-medium">
                    <p className="mb-2">You hit {workoutCompletePRs.length} PR(s) today:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {workoutCompletePRs.map((p, i) => (
                        <li key={i}>
                          {p.prType === 'heaviestSet'
                            ? `${p.exerciseName} (heaviest set: ${p.value} lbs)`
                            : `${p.exerciseName} (estimated 1RM: ${p.value} lbs)`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
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
            className="px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base bg-[#1a1a1a] text-white rounded-md hover:bg-[#2a2a2a] border border-[#2a2a2a] transition-colors flex items-center gap-1.5 sm:gap-2"
          >
            <span>Select Exercise</span>
            <svg 
              className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${showExerciseSelector ? 'rotate-180' : ''}`}
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
              const today = getTodayLocalYYYYMMDD()
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
            max={getTodayLocalYYYYMMDD()} // Prevent future dates
            className="px-3 py-2 border border-[#2a2a2a] bg-[#1a1a1a] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
            style={{ colorScheme: 'dark' }}
          />
          <p className="text-xs text-[#888888] mt-1">
            {workoutDate === getTodayLocalYYYYMMDD() 
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

      {isResumedDraft && !workoutComplete && (
        <div className="mb-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-white font-medium flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Resuming in-progress workout
            </p>
            <button 
              onClick={discardDraft} 
              className="text-red-400 hover:text-red-300 font-medium px-3 py-1 rounded transition-colors hover:bg-red-500/10"
            >
              Discard & Start Over
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-semibold text-white">{currentExercise.exerciseName}</h2>
              {(() => {
                const entry = getExerciseByName(currentExercise.exerciseName)
                if (!entry) return null
                return (
                  <button
                    type="button"
                    onClick={() => setExerciseInfoModal(entry)}
                    className="shrink-0 p-1 -m-1 rounded-full text-white/70 hover:text-white/90 hover:bg-[#2a2a2a] transition-colors"
                    title="Exercise info"
                    aria-label="Exercise info"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 10v7" />
                      <circle cx="12" cy="6.5" r="1.25" fill="currentColor" stroke="none" />
                    </svg>
                  </button>
                )
              })()}
            </div>
            {(() => {
              const entry = getExerciseByName(currentExercise.exerciseName)
              if (!entry) return null
              return (
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#888888]">Primary</span>
                    <span className={`inline-block font-medium px-1.5 py-0.5 rounded border ${getMuscleGroupStyle(entry.muscleGroup)}`}>
                      {entry.muscleGroup}
                    </span>
                  </div>
                  {(entry.secondaryMuscleGroups ?? []).length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[#888888]">Secondary</span>
                      {(entry.secondaryMuscleGroups ?? []).map((mg) => (
                        <span key={mg} className={`inline-block font-medium px-1.5 py-0.5 rounded border ${getMuscleGroupStyle(mg, true)}`}>
                          {mg}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#888888]">Equipment</span>
                    <span className={`inline-block font-medium px-1.5 py-0.5 rounded border ${getEquipmentStyle(entry.equipment)}`}>
                      {entry.equipment}
                    </span>
                  </div>
                </div>
              )
            })()}
          </div>
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            {isEditMode && (
              <span className="px-3 py-1 bg-yellow-600/20 text-yellow-400 rounded-md text-sm">
                Editing Workout
              </span>
            )}
            {/* Rest Timer Toggle - below exercise name on mobile portrait */}
            <button
              onClick={() => {
                const newValue = !restTimerEnabled
                setRestTimerEnabled(newValue)
                localStorage.setItem('workout_rest_timer_enabled', String(newValue))
                if (!newValue) {
                  setShowRestTimer(false)
                  setRestTimerAfterSetKey(null)
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                restTimerEnabled
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                  : 'bg-[#2a2a2a] text-[#888888] border border-[#3a3a3a]'
              }`}
              title={restTimerEnabled ? 'Rest timer enabled' : 'Rest timer disabled'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="inline">Timer {restTimerEnabled ? 'On' : 'Off'}</span>
            </button>
          </div>
        </div>

        {presetId && (() => {
          const note = getPresetExerciseNotes(presetId, dayLabel, currentExercise.exerciseName)
          return note ? (
            <div className="mb-4 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-wide mb-1.5">Program notes</p>
              <p className="text-sm text-[#a1a1a1]">{note}</p>
            </div>
          ) : null
        })()}

        <div className="space-y-1.5">
          {currentExercise.sets
            .slice()
            .sort((a, b) => {
              const orderDiff = getSetTypeOrder(a.setType) - getSetTypeOrder(b.setType)
              // If same type, maintain original order (by setNumber)
              return orderDiff !== 0 ? orderDiff : a.setNumber - b.setNumber
            })
            .map((set, displayIndex) => {
            // Find original index in unsorted array for setKey
            const originalIndex = currentExercise.sets.findIndex((s) => s === set)
            const setKey = `${currentExerciseIndex}-${originalIndex}`
            const isConfirmed = confirmedSets.has(setKey)
            return (
            <Fragment key={setKey}>
            <div 
              className={`relative bg-[#1a1a1a] rounded-lg p-2.5 ${
                isConfirmed 
                  ? 'border-2 border-green-500' 
                  : 'border border-[#2a2a2a]'
              }`}
            >
              {currentExercise.sets.length > 1 && (
                <div className="absolute top-2 right-2">
                  <button
                    type="button"
                    onClick={() => removeSet(currentExerciseIndex, originalIndex)}
                    className="p-1.5 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-colors"
                    title="Remove set"
                    aria-label="Remove set"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
              <div className="mb-1.5 pr-9 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-y-0.5 gap-x-2 text-sm">
                <div className="flex items-center gap-x-2 gap-y-0.5">
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
                  <span className="text-[#888888]">
                    Target: {set.targetWeight} lbs × {set.targetReps} reps
                    {set.targetExplanation && (
                      <span className="ml-1.5 text-[#666666]" title={set.targetExplanation}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 inline-block cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-white mb-0.5">
                    Weight (lbs)
                  </label>
                  {isBodyweightExercise(currentExercise.exerciseName) ? (
                    <div
                      className="w-full px-2.5 py-1 text-sm border border-[#2a2a2a] bg-[#1a1a1a] rounded-md text-[#888888]"
                      title="Bodyweight exercises use your logged weight from Profile > Weight"
                    >
                      {userBodyweightForDate
                        ? `Bodyweight (${Math.round(userBodyweightForDate.weight)} lbs)`
                        : 'Log weight in Profile > Weight'}
                    </div>
                  ) : (
                    <>
                      <input
                        type="number"
                        min="0"
                        step="2.5"
                        value={set.weight || ''}
                        onChange={(e) =>
                          updateSet(currentExerciseIndex, originalIndex, 'weight', parseFloat(e.target.value) || 0)
                        }
                        className={`w-full px-2.5 py-1 text-sm border border-[#2a2a2a] bg-[#111111] rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white ${
                          (() => {
                            const key = `${currentExerciseIndex}-${originalIndex}`
                            const prePop = prePopulatedValues.get(key)
                            return prePop && set.weight === prePop.weight 
                              ? 'text-[#888888]' 
                              : 'text-white'
                          })()
                        }`}
                      />
                      {isBarbellExercise(currentExercise.exerciseName) && (set.weight > 0 || (set.targetWeight ?? 0) > 0) && (() => {
                        const total = set.weight > 0 ? set.weight : (set.targetWeight ?? 0)
                        const pc = getPlateConfig(userId)
                        const breakdown = getPlateBreakdown(total, pc.barWeight, pc.plates)
                        return breakdown ? (
                          <p className="mt-1 text-[10px] text-[#666666]" title={breakdown.display}>
                            Plates: {breakdown.display}
                          </p>
                        ) : null
                      })()}
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-white mb-0.5">
                    Reps
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={set.reps || ''}
                    onChange={(e) =>
                      updateSet(currentExerciseIndex, originalIndex, 'reps', parseInt(e.target.value) || 0)
                    }
                    className={`w-full px-2.5 py-1 text-sm border border-[#2a2a2a] bg-[#111111] rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white ${
                      (() => {
                        const key = `${currentExerciseIndex}-${originalIndex}`
                        const prePop = prePopulatedValues.get(key)
                        return prePop && set.reps === prePop.reps 
                          ? 'text-[#888888]' 
                          : 'text-white'
                      })()
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-white mb-0.5">
                    RPE
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    value={set.rpe || ''}
                    onChange={(e) =>
                      updateSet(currentExerciseIndex, originalIndex, 'rpe', parseFloat(e.target.value) || 0)
                    }
                    className={`w-full px-2.5 py-1 text-sm border border-[#2a2a2a] bg-[#111111] rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white ${
                      (() => {
                        const key = `${currentExerciseIndex}-${originalIndex}`
                        const prePop = prePopulatedValues.get(key)
                        return prePop && set.rpe === prePop.rpe 
                          ? 'text-[#888888]' 
                          : 'text-white'
                      })()
                    }`}
                  />
                </div>
              </div>
              {setValidationError?.key === setKey && (
                <p className="mt-1.5 text-sm text-red-400">{setValidationError.message}</p>
              )}
              <div className="mt-2 flex items-center justify-between">
                {!isConfirmed ? (
                  <button
                    onClick={() => confirmSet(currentExerciseIndex, originalIndex)}
                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-500 text-sm font-medium"
                  >
                    Confirm Set
                  </button>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-green-500 text-sm font-medium flex items-center gap-1">
                      ✓ Set Confirmed
                    </span>
                    {prBadges.get(setKey) && (prBadges.get(setKey)!.heaviestSetPR || prBadges.get(setKey)!.e1RMPR) && (
                      <span className="flex items-center gap-1.5 flex-wrap">
                        {prBadges.get(setKey)!.heaviestSetPR && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-600/40 text-amber-300 border border-amber-500/50">
                            Heaviest PR
                          </span>
                        )}
                        {prBadges.get(setKey)!.e1RMPR && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-600/40 text-amber-300 border border-amber-500/50">
                            Est. 1RM PR
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {showRestTimer && restTimerAfterSetKey === setKey && (
              <div className="mt-2">
                <RestTimer
                  initialSeconds={defaultRestSeconds}
                  onDismiss={() => {
                    setShowRestTimer(false)
                    setRestTimerAfterSetKey(null)
                  }}
                  autoStart={true}
                />
              </div>
            )}
            </Fragment>
          )})}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => addSet(currentExerciseIndex, 'warmup')}
            className="px-4 py-2 bg-amber-600/20 text-amber-400 rounded-md hover:bg-amber-600/30 border border-amber-600/50 transition-colors text-sm font-medium"
          >
            Add Warm Up Set
          </button>
          <button
            onClick={() => addSet(currentExerciseIndex, 'working')}
            className="px-4 py-2 bg-green-600/20 text-green-400 rounded-md hover:bg-green-600/30 border border-green-600/50 transition-colors text-sm font-medium"
          >
            Add Working Set
          </button>
          <button
            onClick={() => addSet(currentExerciseIndex, 'cooldown')}
            className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-md hover:bg-blue-600/30 border border-blue-600/50 transition-colors text-sm font-medium"
          >
            Add Cool Down Set
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

      {exerciseInfoModal && (
        <ExerciseDetailModal
          exercise={exerciseInfoModal}
          onClose={() => setExerciseInfoModal(null)}
          onSelectAlternative={handleSelectAlternative}
        />
      )}
    </div>
  )
}
