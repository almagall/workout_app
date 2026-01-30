/**
 * Pre-created workout templates based on popular, proven programs.
 * Structure matches saveTemplate(): name, planType, days (dayLabel, dayOrder, exercises).
 */

import type { PlanType } from '@/types/workout'

/** When set, targets use preset-specific logic (e.g. 5/3/1 percentages) instead of default planType progression. */
export type PresetTargetStrategy = 'default' | '531'

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
  }>
}

export function getPresetTargetStrategy(presetId: string | null | undefined): PresetTargetStrategy | null {
  if (!presetId) return null
  const preset = PRESET_TEMPLATES.find((p) => p.id === presetId)
  return preset?.targetStrategy ?? null
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
      },
    ],
  },
  {
    id: 'phul-4day',
    name: 'PHUL (Power Hypertrophy Upper Lower)',
    planType: 'hypertrophy',
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
      },
    ],
  },
  {
    id: 'starting-strength-3day',
    name: 'Starting Strength (3-Day)',
    planType: 'strength',
    description:
      'Mark Rippetoe’s linear progression for beginners. Workout A: Squat, Bench, Deadlift. Workout B: Squat, Overhead Press, Barbell Row. 3 sets of 5 (1x5 deadlift). Add weight each session. Focus on form and consistent progression.',
    days: [
      {
        dayOrder: 1,
        dayLabel: 'Workout A',
        exercises: ['Barbell Squat', 'Barbell Bench Press', 'Deadlift'],
      },
      {
        dayOrder: 2,
        dayLabel: 'Workout B',
        exercises: ['Barbell Squat', 'Overhead Press', 'Barbell Row'],
      },
    ],
  },
  {
    id: 'stronglifts-3day',
    name: 'StrongLifts 5x5 (3-Day)',
    planType: 'strength',
    description:
      'Simple 5x5 program alternating two workouts. Workout A: Squat, Bench, Barbell Row. Workout B: Squat, Overhead Press, Deadlift. 5 sets of 5 (deadlift 1x5). Linear progression—add weight each session. Great for building a strength base.',
    days: [
      {
        dayOrder: 1,
        dayLabel: 'Workout A',
        exercises: ['Barbell Squat', 'Barbell Bench Press', 'Barbell Row'],
      },
      {
        dayOrder: 2,
        dayLabel: 'Workout B',
        exercises: ['Barbell Squat', 'Overhead Press', 'Deadlift'],
      },
    ],
  },
  {
    id: 'gzclp-4day',
    name: 'GZCLP (4-Day)',
    planType: 'strength',
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
      },
    ],
  },
  {
    id: 'texas-method-style-3day',
    name: 'Texas Method Style (3-Day)',
    planType: 'strength',
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
      },
      {
        dayOrder: 2,
        dayLabel: 'Recovery Day',
        exercises: [
          'Front Squat (light)',
          'Overhead Press',
          'Deadlift (light)',
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
      },
    ],
  },
]
