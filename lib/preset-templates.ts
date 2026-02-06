/**
 * Pre-created workout templates based on popular, proven programs.
 * Structure matches saveTemplate(): name, planType, days (dayLabel, dayOrder, exercises).
 */

import type { PlanType } from '@/types/workout'

/** When set, targets use preset-specific logic instead of default planType progression. */
export type PresetTargetStrategy = 'default' | '531' | 'startingStrength' | 'stronglifts' | 'phul' | 'gzclp' | 'texasMethod'

export interface PresetTemplate {
  id: string
  name: string
  planType: PlanType
  description: string
  /** If set, WorkoutLogger uses this strategy for target calculation instead of default planType logic. */
  targetStrategy?: PresetTargetStrategy
  days: Array<{
    dayLabel: string
    dayOrder: number
    exercises: string[]
    /** Optional notes per exercise (same order as exercises). Shown in workout logger for program guidance. */
    exerciseNotes?: string[]
  }>
}

export function getPresetTargetStrategy(presetId: string | null | undefined): PresetTargetStrategy | null {
  if (!presetId) return null
  const preset = PRESET_TEMPLATES.find((p) => p.id === presetId)
  return preset?.targetStrategy ?? null
}

export function getPresetExerciseNotes(
  presetId: string | null | undefined,
  dayLabel: string,
  exerciseName: string
): string | null {
  if (!presetId) return null
  const preset = PRESET_TEMPLATES.find((p) => p.id === presetId)
  if (!preset) return null
  const day = preset.days.find((d) => d.dayLabel.trim().toLowerCase() === dayLabel.trim().toLowerCase())
  if (!day) return null
  const index = day.exercises.findIndex((e) => e.trim().toLowerCase() === exerciseName.trim().toLowerCase())
  if (index === -1 || !day.exerciseNotes || index >= day.exerciseNotes.length) return null
  const note = day.exerciseNotes[index]
  return note && note.trim() ? note : null
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  // —— Hypertrophy ——
  {
    id: 'ppl-6day',
    name: 'Push / Pull / Legs (6-Day)',
    planType: 'hypertrophy',
    description:
      'Classic bodybuilding split. Train push (chest, shoulders, triceps), pull (back, biceps), and legs on separate days, each twice per week. High volume per muscle group with 8–15 rep ranges. Ideal for intermediate lifters with 6 days available.',
    days: [
      {
        dayOrder: 1,
        dayLabel: 'Push A',
        exercises: [
          'Barbell Bench Press',
          'Overhead Press',
          'Incline Dumbbell Press',
          'Cable Fly',
          'Lateral Raise',
          'Tricep Pushdown',
          'Overhead Tricep Extension',
        ],
        exerciseNotes: [
          'Primary horizontal push. 3–4 sets of 8–12. Control the eccentric; touch chest and press.',
          'Primary vertical push. 3–4 sets of 8–12. Strict form; lock out overhead.',
          'Upper-chest emphasis. 3–4 sets of 8–12. Full stretch at bottom.',
          'Chest isolation. 3–4 sets of 10–15. Squeeze at the center.',
          'Side delts. 3–4 sets of 10–15. Raise to shoulder height; control the negative.',
          'Tricep isolation. 3–4 sets of 10–15. Elbows tucked; full extension.',
          'Tricep stretch. 3–4 sets of 10–15. Lower with control behind head.',
        ],
      },
      {
        dayOrder: 2,
        dayLabel: 'Pull A',
        exercises: [
          'Barbell Row',
          'Lat Pulldown',
          'Face Pull',
          'Barbell Curl',
          'Hammer Curl',
        ],
        exerciseNotes: [
          'Primary horizontal pull. 3–4 sets of 8–12. Pull to hip; keep torso stable.',
          'Vertical pull. 3–4 sets of 8–12. Pull to upper chest; full stretch at top.',
          'Rear delts/upper back. 3–4 sets of 12–15. External rotation at end range.',
          'Bicep focus. 3–4 sets of 8–12. Full range; no swing.',
          'Brachialis and bicep. 3–4 sets of 8–12. Neutral grip; control the negative.',
        ],
      },
      {
        dayOrder: 3,
        dayLabel: 'Legs A',
        exercises: [
          'Barbell Squat',
          'Romanian Deadlift',
          'Leg Press',
          'Leg Curl',
          'Calf Raise',
        ],
        exerciseNotes: [
          'Primary quad/hip. 3–4 sets of 8–12. Depth to at least parallel; brace core.',
          'Hamstring emphasis. 3–4 sets of 8–12. Slight knee bend; feel the stretch.',
          'Quad volume. 3–4 sets of 10–15. Full range; do not lock knees at top.',
          'Hamstring isolation. 3–4 sets of 10–15. Squeeze at top; control descent.',
          'Calves. 3–4 sets of 10–15. Full stretch and pause at top.',
        ],
      },
      {
        dayOrder: 4,
        dayLabel: 'Push B',
        exercises: [
          'Overhead Press',
          'Incline Barbell Bench',
          'Dumbbell Fly',
          'Lateral Raise',
          'Close-Grip Bench',
          'Skull Crusher',
        ],
        exerciseNotes: [
          'Primary vertical push. 3–4 sets of 8–12. Strict press; no leg drive.',
          'Upper chest. 3–4 sets of 8–12. Touch upper chest; control the bar.',
          'Chest stretch. 3–4 sets of 10–15. Arc the weights; feel the stretch.',
          'Side delts. 3–4 sets of 10–15. Raise to shoulder level.',
          'Tricep compound. 3–4 sets of 8–12. Elbows in; touch lower chest.',
          'Tricep isolation. 3–4 sets of 8–12. Lower to forehead or nose; extend fully.',
        ],
      },
      {
        dayOrder: 5,
        dayLabel: 'Pull B',
        exercises: [
          'Deadlift',
          'Cable Row',
          'Pull-Up / Lat Pulldown',
          'Preacher Curl',
          'Incline Dumbbell Curl',
        ],
        exerciseNotes: [
          'Full posterior chain. 3–4 sets of 6–10. Set back flat; brace and pull.',
          'Horizontal pull. 3–4 sets of 8–12. Squeeze shoulder blades.',
          'Vertical pull. 3–4 sets of 8–12. Pull to chest; full hang at bottom.',
          'Bicep isolation. 3–4 sets of 8–12. Controlled; no swing.',
          'Bicep stretch. 3–4 sets of 8–12. Incline angle emphasizes long head.',
        ],
      },
      {
        dayOrder: 6,
        dayLabel: 'Legs B',
        exercises: [
          'Front Squat',
          'Leg Press',
          'Leg Curl',
          'Leg Extension',
          'Calf Raise',
        ],
        exerciseNotes: [
          'Quad emphasis. 3–4 sets of 8–12. Elbows high; upright torso.',
          'Quad volume. 3–4 sets of 10–15. Full range; controlled tempo.',
          'Hamstring isolation. 3–4 sets of 10–15. Squeeze at top.',
          'Quad isolation. 3–4 sets of 10–15. Extend fully; control the negative.',
          'Calves. 3–4 sets of 10–15. Full stretch and hold at top.',
        ],
      },
    ],
  },
  {
    id: 'upper-lower-4day',
    name: 'Upper / Lower (4-Day)',
    planType: 'hypertrophy',
    description:
      'Efficient 4-day split hitting upper and lower body twice per week. Balances volume and recovery. Good for building muscle on a moderate schedule. Focus on compounds plus targeted isolation in 8–12 rep ranges.',
    days: [
      {
        dayOrder: 1,
        dayLabel: 'Upper A',
        exercises: [
          'Barbell Bench Press',
          'Barbell Row',
          'Overhead Press',
          'Lat Pulldown',
          'Barbell Curl',
          'Tricep Pushdown',
        ],
        exerciseNotes: [
          'Primary horizontal push. 3–4 sets of 8–12. Touch chest; control eccentric.',
          'Primary horizontal pull. 3–4 sets of 8–12. Pull to hip; stable torso.',
          'Primary vertical push. 3–4 sets of 8–12. Strict press; lock out overhead.',
          'Vertical pull. 3–4 sets of 8–12. Pull to upper chest.',
          'Bicep. 3–4 sets of 8–12. Full range; no swing.',
          'Tricep. 3–4 sets of 8–12. Elbows in; full extension.',
        ],
      },
      {
        dayOrder: 2,
        dayLabel: 'Lower A',
        exercises: [
          'Barbell Squat',
          'Romanian Deadlift',
          'Leg Press',
          'Leg Curl',
          'Calf Raise',
        ],
        exerciseNotes: [
          'Primary lower. 3–4 sets of 8–12. At least parallel; brace core.',
          'Hamstring focus. 3–4 sets of 8–12. Slight knee bend; feel stretch.',
          'Quad volume. 3–4 sets of 10–15. Full range; no lock at top.',
          'Hamstring isolation. 3–4 sets of 10–15. Squeeze at top.',
          'Calves. 3–4 sets of 10–15. Full stretch and pause.',
        ],
      },
      {
        dayOrder: 3,
        dayLabel: 'Upper B',
        exercises: [
          'Incline Dumbbell Press',
          'Cable Row',
          'Lateral Raise',
          'Pull-Up / Assisted Pull-Up',
          'Hammer Curl',
          'Overhead Tricep Extension',
        ],
        exerciseNotes: [
          'Upper chest. 3–4 sets of 8–12. Full stretch; press to lockout.',
          'Horizontal pull. 3–4 sets of 8–12. Squeeze shoulder blades.',
          'Side delts. 3–4 sets of 10–15. Raise to shoulder height.',
          'Vertical pull. 3–4 sets of 8–12. Pull chest to bar if possible.',
          'Brachialis/bicep. 3–4 sets of 8–12. Neutral grip; control negative.',
          'Tricep stretch. 3–4 sets of 10–15. Lower behind head with control.',
        ],
      },
      {
        dayOrder: 4,
        dayLabel: 'Lower B',
        exercises: [
          'Front Squat',
          'Leg Press',
          'Leg Curl',
          'Leg Extension',
          'Calf Raise',
        ],
        exerciseNotes: [
          'Quad emphasis. 3–4 sets of 8–12. Elbows up; upright torso.',
          'Quad volume. 3–4 sets of 10–15. Full range; controlled.',
          'Hamstring isolation. 3–4 sets of 10–15. Squeeze at top.',
          'Quad isolation. 3–4 sets of 10–15. Full extension; control descent.',
          'Calves. 3–4 sets of 10–15. Full stretch and hold.',
        ],
      },
    ],
  },
  {
    id: 'phul-4day',
    name: 'PHUL (Power Hypertrophy Upper Lower)',
    planType: 'hypertrophy',
    targetStrategy: 'phul',
    description:
      '4-day program blending strength and hypertrophy. Two power days (heavy, lower reps) and two hypertrophy days (moderate weight, higher reps). Each muscle group trained twice per week. Great for intermediate lifters wanting size and strength.',
    days: [
      {
        dayOrder: 1,
        dayLabel: 'Power Upper',
        exercises: [
          'Barbell Bench Press',
          'Barbell Row',
          'Overhead Press',
          'Lat Pulldown',
          'Barbell Curl',
          'Tricep Pushdown',
        ],
        exerciseNotes: [
          'Power: heavy, 3–5 sets of 3–5 reps. Touch chest; explosive press.',
          'Power: heavy, 3–5 sets of 3–5 reps. Pull to hip; keep back flat.',
          'Power: heavy, 3–5 sets of 3–5 reps. Strict press; no leg drive.',
          'Power: 3–4 sets of 6–8. Pull to upper chest; control negative.',
          'Power: 3–4 sets of 6–8. Full range; controlled.',
          'Power: 3–4 sets of 6–8. Elbows in; full extension.',
        ],
      },
      {
        dayOrder: 2,
        dayLabel: 'Power Lower',
        exercises: [
          'Barbell Squat',
          'Romanian Deadlift',
          'Leg Press',
          'Leg Curl',
          'Calf Raise',
        ],
        exerciseNotes: [
          'Power: heavy, 3–5 sets of 3–5 reps. Depth to parallel; brace and drive.',
          'Power: heavy, 3–5 sets of 3–5 reps. Set back flat; feel hamstring stretch.',
          'Power: 3–4 sets of 6–8. Full range; controlled tempo.',
          'Hypertrophy: 3–4 sets of 8–12. Squeeze at top.',
          '3–4 sets of 10–15. Full stretch and pause at top.',
        ],
      },
      {
        dayOrder: 3,
        dayLabel: 'Hypertrophy Upper',
        exercises: [
          'Incline Dumbbell Press',
          'Cable Row',
          'Lateral Raise',
          'Cable Fly',
          'Cable Row (high)',
          'Preacher Curl',
          'Skull Crusher',
        ],
        exerciseNotes: [
          'Hypertrophy: 3–4 sets of 8–12. Upper chest; full stretch.',
          'Hypertrophy: 3–4 sets of 8–12. Squeeze shoulder blades.',
          'Side delts: 3–4 sets of 10–15. Raise to shoulder height.',
          'Chest isolation: 3–4 sets of 10–15. Squeeze at center.',
          'Upper back/rear delt: 3–4 sets of 10–15. Pull to face level.',
          'Bicep: 3–4 sets of 8–12. No swing; full range.',
          'Tricep: 3–4 sets of 8–12. Lower to forehead; extend fully.',
        ],
      },
      {
        dayOrder: 4,
        dayLabel: 'Hypertrophy Lower',
        exercises: [
          'Front Squat',
          'Leg Press',
          'Leg Curl',
          'Leg Extension',
          'Romanian Deadlift',
          'Calf Raise',
        ],
        exerciseNotes: [
          'Hypertrophy: 3–4 sets of 8–12. Elbows up; upright torso.',
          'Quad volume: 3–4 sets of 10–15. Full range; no lock.',
          'Hamstring: 3–4 sets of 10–15. Squeeze at top.',
          'Quad isolation: 3–4 sets of 10–15. Control the negative.',
          'Hamstring: 3–4 sets of 8–12. Stretch at bottom; hinge at hip.',
          'Calves: 3–4 sets of 10–15. Full stretch and hold.',
        ],
      },
    ],
  },
  {
    id: 'bro-split-5day',
    name: '5-Day Bro Split',
    planType: 'hypertrophy',
    description:
      'Classic body-part split: one main muscle group per day (Chest, Back, Shoulders, Arms, Legs). Allows high volume per session and plenty of recovery. Best for those who prefer training 5 days and like focused, pump-style workouts.',
    days: [
      {
        dayOrder: 1,
        dayLabel: 'Chest',
        exercises: [
          'Barbell Bench Press',
          'Incline Dumbbell Press',
          'Cable Fly',
          'Dumbbell Fly',
          'Push-Up',
        ],
        exerciseNotes: [
          'Primary chest. 4–5 sets of 8–12. Touch chest; control eccentric.',
          'Upper chest. 4–5 sets of 8–12. Full stretch at bottom.',
          'Chest isolation. 4–5 sets of 10–15. Squeeze at center.',
          'Chest stretch. 4–5 sets of 10–15. Arc the weights; feel stretch.',
          'Finisher or pump. 3–4 sets to near failure. Full range; controlled.',
        ],
      },
      {
        dayOrder: 2,
        dayLabel: 'Back',
        exercises: [
          'Barbell Row',
          'Lat Pulldown',
          'Deadlift',
          'Cable Row',
          'Face Pull',
        ],
        exerciseNotes: [
          'Primary horizontal pull. 4–5 sets of 8–12. Pull to hip; stable torso.',
          'Vertical pull. 4–5 sets of 8–12. Pull to upper chest.',
          'Posterior chain. 3–4 sets of 6–10. Set back flat; brace and pull.',
          'Horizontal pull. 4–5 sets of 8–12. Squeeze shoulder blades.',
          'Rear delts/upper back. 4–5 sets of 12–15. External rotation at end.',
        ],
      },
      {
        dayOrder: 3,
        dayLabel: 'Shoulders',
        exercises: [
          'Overhead Press',
          'Lateral Raise',
          'Front Raise',
          'Reverse Fly',
          'Shrug',
        ],
        exerciseNotes: [
          'Primary vertical push. 4–5 sets of 8–12. Strict; lock out overhead.',
          'Side delts. 4–5 sets of 10–15. Raise to shoulder height.',
          'Front delts. 3–4 sets of 10–15. Raise to eye level; control.',
          'Rear delts. 4–5 sets of 12–15. Slight bend; squeeze at top.',
          'Traps. 4–5 sets of 8–12. Elevate and squeeze at top.',
        ],
      },
      {
        dayOrder: 4,
        dayLabel: 'Arms',
        exercises: [
          'Barbell Curl',
          'Tricep Pushdown',
          'Hammer Curl',
          'Overhead Tricep Extension',
          'Preacher Curl',
          'Close-Grip Bench',
        ],
        exerciseNotes: [
          'Bicep. 4–5 sets of 8–12. Full range; no swing.',
          'Tricep. 4–5 sets of 8–12. Elbows in; full extension.',
          'Brachialis/bicep. 4–5 sets of 8–12. Neutral grip; control negative.',
          'Tricep stretch. 4–5 sets of 10–15. Lower behind head with control.',
          'Bicep isolation. 3–4 sets of 8–12. No swing; full range.',
          'Tricep compound. 3–4 sets of 8–12. Elbows in; touch lower chest.',
        ],
      },
      {
        dayOrder: 5,
        dayLabel: 'Legs',
        exercises: [
          'Barbell Squat',
          'Romanian Deadlift',
          'Leg Press',
          'Leg Curl',
          'Leg Extension',
          'Calf Raise',
        ],
        exerciseNotes: [
          'Primary lower. 4–5 sets of 8–12. At least parallel; brace core.',
          'Hamstring. 4–5 sets of 8–12. Hinge at hip; feel stretch.',
          'Quad volume. 4–5 sets of 10–15. Full range; no lock.',
          'Hamstring isolation. 4–5 sets of 10–15. Squeeze at top.',
          'Quad isolation. 4–5 sets of 10–15. Control the negative.',
          'Calves. 4–5 sets of 10–15. Full stretch and pause.',
        ],
      },
    ],
  },
  {
    id: 'ppl-3day',
    name: 'Push / Pull / Legs (3-Day)',
    planType: 'hypertrophy',
    description:
      'Condensed PPL for 3 days per week. Each muscle group trained once per week with higher volume per session. Suits busy schedules or beginners building consistency. Use 8–15 reps for most exercises.',
    days: [
      {
        dayOrder: 1,
        dayLabel: 'Push',
        exercises: [
          'Barbell Bench Press',
          'Overhead Press',
          'Incline Dumbbell Press',
          'Lateral Raise',
          'Tricep Pushdown',
          'Overhead Tricep Extension',
        ],
        exerciseNotes: [
          'Primary horizontal push. 4–5 sets of 8–15. Touch chest; control eccentric.',
          'Primary vertical push. 4–5 sets of 8–15. Strict; lock out overhead.',
          'Upper chest. 4–5 sets of 8–15. Full stretch at bottom.',
          'Side delts. 4–5 sets of 10–15. Raise to shoulder height.',
          'Tricep. 4–5 sets of 10–15. Elbows in; full extension.',
          'Tricep stretch. 4–5 sets of 10–15. Lower behind head with control.',
        ],
      },
      {
        dayOrder: 2,
        dayLabel: 'Pull',
        exercises: [
          'Barbell Row',
          'Lat Pulldown',
          'Face Pull',
          'Barbell Curl',
          'Hammer Curl',
        ],
        exerciseNotes: [
          'Primary horizontal pull. 4–5 sets of 8–15. Pull to hip; stable torso.',
          'Vertical pull. 4–5 sets of 8–15. Pull to upper chest.',
          'Rear delts/upper back. 4–5 sets of 12–15. External rotation at end.',
          'Bicep. 4–5 sets of 8–15. Full range; no swing.',
          'Brachialis/bicep. 4–5 sets of 8–15. Neutral grip; control negative.',
        ],
      },
      {
        dayOrder: 3,
        dayLabel: 'Legs',
        exercises: [
          'Barbell Squat',
          'Romanian Deadlift',
          'Leg Press',
          'Leg Curl',
          'Leg Extension',
          'Calf Raise',
        ],
        exerciseNotes: [
          'Primary lower. 4–5 sets of 8–15. At least parallel; brace core.',
          'Hamstring. 4–5 sets of 8–15. Hinge at hip; feel stretch.',
          'Quad volume. 4–5 sets of 10–15. Full range; controlled.',
          'Hamstring isolation. 4–5 sets of 10–15. Squeeze at top.',
          'Quad isolation. 4–5 sets of 10–15. Control the negative.',
          'Calves. 4–5 sets of 10–15. Full stretch and pause.',
        ],
      },
    ],
  },
  // —— Strength ——
  {
    id: '531-4day',
    name: '5/3/1 (4-Day)',
    planType: 'strength',
    targetStrategy: '531',
    description:
      'Jim Wendler’s proven strength program. One main lift per day (Bench, Squat, OHP, Deadlift) using 5/3/1 rep schemes, plus assistance work. Uses a training max and periodized cycles. Add 5 lb (upper) or 10 lb (lower) each cycle.',
    days: [
      {
        dayOrder: 1,
        dayLabel: 'Bench Day',
        exercises: [
          'Barbell Bench Press',
          'Barbell Row',
          'Dumbbell Bench Press',
          'Tricep Pushdown',
          'Face Pull',
        ],
        exerciseNotes: [
          'Main lift of the day. Use the 5/3/1 set/rep scheme (e.g. 5@65%, 5@75%, 5+@85% of training max). Aim for quality reps on the top set; control the eccentric.',
          'Assistance pull. Typically 3–5 sets of 8–12. Focus on full range and a controlled tempo.',
          'Assistance pressing. 3–5 sets of 8–12. Complements the main bench with a different angle.',
          'Assistance for triceps. 3–5 sets of 8–12. Keep elbows tucked and extend fully.',
          'Assistance for rear delts/upper back. 3–5 sets of 12–15. Great for shoulder health and posture.',
        ],
      },
      {
        dayOrder: 2,
        dayLabel: 'Squat Day',
        exercises: [
          'Barbell Squat',
          'Leg Press',
          'Leg Curl',
          'Calf Raise',
          'Ab work',
        ],
        exerciseNotes: [
          'Main lift of the day. Use the 5/3/1 scheme (e.g. 5@65%, 5@75%, 5+@85% of training max). Add 10 lb to training max each cycle for lower body.',
          'Assistance for quads. 3–5 sets of 8–12. Use a full range of motion; do not lock out at the top.',
          'Assistance for hamstrings. 3–5 sets of 8–12. Control the negative and squeeze at the top.',
          'Assistance for calves. 3–5 sets of 10–15. Full stretch at the bottom, pause at the top.',
          'Core work. 3–5 sets. Planks, ab wheel, or cable crunches; focus on bracing and control.',
        ],
      },
      {
        dayOrder: 3,
        dayLabel: 'Overhead Press Day',
        exercises: [
          'Overhead Press',
          'Lat Pulldown',
          'Lateral Raise',
          'Barbell Curl',
          'Tricep Pushdown',
        ],
        exerciseNotes: [
          'Main lift of the day. Use the 5/3/1 scheme. Strict press: no leg drive; lock out overhead.',
          'Assistance for lats. 3–5 sets of 8–12. Pull to upper chest; control the negative.',
          'Assistance for side delts. 3–5 sets of 10–15. Slight forward lean, raise to shoulder height.',
          'Assistance for biceps. 3–5 sets of 8–12. Full range; avoid swinging.',
          'Assistance for triceps. 3–5 sets of 8–12. Elbows tucked, full extension.',
        ],
      },
      {
        dayOrder: 4,
        dayLabel: 'Deadlift Day',
        exercises: [
          'Deadlift',
          'Leg Press',
          'Leg Curl',
          'Barbell Row',
          'Ab work',
        ],
        exerciseNotes: [
          'Main lift of the day. Use the 5/3/1 scheme. Add 10 lb per cycle. Set your back flat and brace before the pull.',
          'Assistance for quads. 3–5 sets of 8–12. Full range; control the descent.',
          'Assistance for hamstrings. 3–5 sets of 8–12. Good complement after deadlifts.',
          'Assistance for back. 3–5 sets of 8–12. Pull to the hip; keep the torso stable.',
          'Core work. 3–5 sets. Planks or ab wheel; brace and control throughout.',
        ],
      },
    ],
  },
  {
    id: 'starting-strength-3day',
    name: 'Starting Strength (3-Day)',
    planType: 'strength',
    targetStrategy: 'startingStrength',
    description:
      'Mark Rippetoe’s linear progression for beginners. Workout A: Squat, Bench, Deadlift. Workout B: Squat, Overhead Press, Barbell Row. 3 sets of 5 (1x5 deadlift). Add weight each session. Focus on form and consistent progression.',
    days: [
      {
        dayOrder: 1,
        dayLabel: 'Workout A',
        exercises: ['Barbell Squat', 'Barbell Bench Press', 'Deadlift'],
        exerciseNotes: [
          '3 sets of 5. Add weight each session. Depth to at least parallel; brace and drive up.',
          '3 sets of 5. Add weight each session. Touch chest; control the bar.',
          '1 set of 5. Add weight each session. Set back flat; one work set only.',
        ],
      },
      {
        dayOrder: 2,
        dayLabel: 'Workout B',
        exercises: ['Barbell Squat', 'Overhead Press', 'Barbell Row'],
        exerciseNotes: [
          '3 sets of 5. Same as Workout A; squat every session. Focus on form.',
          '3 sets of 5. Add weight each session. Strict press; no leg drive.',
          '3 sets of 5. Add weight each session. Pull to hip; keep torso stable.',
        ],
      },
    ],
  },
  {
    id: 'stronglifts-3day',
    name: 'StrongLifts 5x5 (3-Day)',
    planType: 'strength',
    targetStrategy: 'stronglifts',
    description:
      'Simple 5x5 program alternating two workouts. Workout A: Squat, Bench, Barbell Row. Workout B: Squat, Overhead Press, Deadlift. 5 sets of 5 (deadlift 1x5). Linear progression—add weight each session. Great for building a strength base.',
    days: [
      {
        dayOrder: 1,
        dayLabel: 'Workout A',
        exercises: ['Barbell Squat', 'Barbell Bench Press', 'Barbell Row'],
        exerciseNotes: [
          '5 sets of 5. Add weight each session. At least parallel; brace core.',
          '5 sets of 5. Add weight each session. Touch chest; control eccentric.',
          '5 sets of 5. Add weight each session. Pull to hip; keep back flat.',
        ],
      },
      {
        dayOrder: 2,
        dayLabel: 'Workout B',
        exercises: ['Barbell Squat', 'Overhead Press', 'Deadlift'],
        exerciseNotes: [
          '5 sets of 5. Same progression as Workout A. Squat every session.',
          '5 sets of 5. Add weight each session. Strict press; lock out overhead.',
          '1 set of 5. Add weight each session. Set back flat; one work set only.',
        ],
      },
    ],
  },
  {
    id: 'gzclp-4day',
    name: 'GZCLP (4-Day)',
    planType: 'strength',
    targetStrategy: 'gzclp',
    description:
      'GZCL method for linear progression. Tier 1 main lift (5x3+), Tier 2 secondary (3x10), Tier 3 assistance. Four days rotating Squat/Bench and Deadlift/OHP. Good for intermediates who’ve run LP and want structure with variety.',
    days: [
      {
        dayOrder: 1,
        dayLabel: 'Squat + Bench',
        exercises: [
          'Barbell Squat',
          'Barbell Bench Press',
          'Leg Press',
          'Lat Pulldown',
          'Tricep Pushdown',
        ],
        exerciseNotes: [
          'Tier 1: 5x3+. Main lift; last set AMRAP. Add weight when you hit 15+ total reps.',
          'Tier 2: 3x10. Secondary. Control the bar; touch chest.',
          'Tier 3: 3x15+. Assistance. Full range; do not lock at top.',
          'Tier 3: 3x15+. Pull to upper chest; control negative.',
          'Tier 3: 3x15+. Elbows in; full extension.',
        ],
      },
      {
        dayOrder: 2,
        dayLabel: 'Deadlift + OHP',
        exercises: [
          'Deadlift',
          'Overhead Press',
          'Leg Curl',
          'Barbell Row',
          'Barbell Curl',
        ],
        exerciseNotes: [
          'Tier 1: 5x3+. Main lift; last set AMRAP. Set back flat; brace and pull.',
          'Tier 2: 3x10. Secondary. Strict press; lock out overhead.',
          'Tier 3: 3x15+. Squeeze at top; control descent.',
          'Tier 3: 3x15+. Pull to hip; stable torso.',
          'Tier 3: 3x15+. Full range; no swing.',
        ],
      },
      {
        dayOrder: 3,
        dayLabel: 'Bench + Squat',
        exercises: [
          'Barbell Bench Press',
          'Barbell Squat',
          'Cable Fly',
          'Cable Row',
          'Lateral Raise',
        ],
        exerciseNotes: [
          'Tier 1: 5x3+. Main lift; last set AMRAP. Touch chest; control eccentric.',
          'Tier 2: 3x10. Secondary. At least parallel; brace core.',
          'Tier 3: 3x15+. Chest isolation. Squeeze at center.',
          'Tier 3: 3x15+. Horizontal pull. Squeeze shoulder blades.',
          'Tier 3: 3x15+. Side delts. Raise to shoulder height.',
        ],
      },
      {
        dayOrder: 4,
        dayLabel: 'OHP + Deadlift',
        exercises: [
          'Overhead Press',
          'Deadlift',
          'Face Pull',
          'Leg Curl',
          'Ab work',
        ],
        exerciseNotes: [
          'Tier 1: 5x3+. Main lift; last set AMRAP. No leg drive; lock out.',
          'Tier 2: 3x10. Secondary. Set back flat; brace before pull.',
          'Tier 3: 3x15+. Rear delts/upper back. External rotation at end.',
          'Tier 3: 3x15+. Hamstring. Squeeze at top.',
          'Tier 3: 3x15+. Core. Planks or ab wheel; brace and control.',
        ],
      },
    ],
  },
  {
    id: 'texas-method-style-3day',
    name: 'Texas Method Style (3-Day)',
    planType: 'strength',
    targetStrategy: 'texasMethod',
    description:
      'Intermediate strength template. Volume day (5x5), light/recovery day (2x5), intensity day (1x5 heavy). Rotate Squat/Bench/Deadlift and OHP across the week. For lifters who’ve exhausted linear progression.',
    days: [
      {
        dayOrder: 1,
        dayLabel: 'Volume Day',
        exercises: [
          'Barbell Squat',
          'Barbell Bench Press',
          'Barbell Row',
        ],
        exerciseNotes: [
          'Volume: 5 sets of 5. Moderate weight; focus on quality and bar speed.',
          'Volume: 5 sets of 5. Touch chest; control the bar.',
          'Volume: 5 sets of 5. Pull to hip; keep torso stable.',
        ],
      },
      {
        dayOrder: 2,
        dayLabel: 'Recovery Day',
        exercises: [
          'Front Squat',
          'Overhead Press',
          'Deadlift',
        ],
        exerciseNotes: [
          'Light/recovery: 2 sets of 5. Lighter than volume day; focus on form. Elbows up.',
          'Light/recovery: 2 sets of 5. Strict press; no leg drive.',
          'Light/recovery: 2 sets of 5. Lighter pull; set back flat and brace.',
        ],
      },
      {
        dayOrder: 3,
        dayLabel: 'Intensity Day',
        exercises: [
          'Barbell Squat',
          'Barbell Bench Press',
          'Deadlift',
        ],
        exerciseNotes: [
          'Intensity: 1 set of 5 heavy. Work up to a top set of 5. Depth to parallel; brace.',
          'Intensity: 1 set of 5 heavy. Work up to a top set of 5. Touch chest; control.',
          'Intensity: 1 set of 5 heavy. Work up to a top set of 5. Set back flat; brace and pull.',
        ],
      },
    ],
  },
]
