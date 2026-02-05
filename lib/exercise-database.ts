/**
 * Exercise database for autocomplete when creating/editing custom templates.
 * Existing templates keep their free-text exercise names; no migration needed.
 */

export interface ExerciseEntry {
  id: string
  name: string
  muscleGroup: string
  equipment: string
}

const EXERCISES: ExerciseEntry[] = [
  // Chest
  { id: 'bb-bench', name: 'Barbell Bench Press', muscleGroup: 'Chest', equipment: 'Barbell' },
  { id: 'incline-bb-bench', name: 'Incline Barbell Bench', muscleGroup: 'Chest', equipment: 'Barbell' },
  { id: 'incline-db-press', name: 'Incline Dumbbell Press', muscleGroup: 'Chest', equipment: 'Dumbbell' },
  { id: 'db-bench', name: 'Dumbbell Bench Press', muscleGroup: 'Chest', equipment: 'Dumbbell' },
  { id: 'cable-fly', name: 'Cable Fly', muscleGroup: 'Chest', equipment: 'Cable' },
  { id: 'db-fly', name: 'Dumbbell Fly', muscleGroup: 'Chest', equipment: 'Dumbbell' },
  { id: 'push-up', name: 'Push-Up', muscleGroup: 'Chest', equipment: 'Bodyweight' },
  { id: 'dips', name: 'Dips', muscleGroup: 'Chest', equipment: 'Bodyweight' },
  { id: 'dips-chest', name: 'Chest Dips', muscleGroup: 'Chest', equipment: 'Bodyweight' },
  { id: 'diamond-push-up', name: 'Diamond Push-Up', muscleGroup: 'Chest', equipment: 'Bodyweight' },
  { id: 'incline-push-up', name: 'Incline Push-Up', muscleGroup: 'Chest', equipment: 'Bodyweight' },
  { id: 'decline-push-up', name: 'Decline Push-Up', muscleGroup: 'Chest', equipment: 'Bodyweight' },
  // Back
  { id: 'bb-row', name: 'Barbell Row', muscleGroup: 'Back', equipment: 'Barbell' },
  { id: 'cable-row', name: 'Cable Row', muscleGroup: 'Back', equipment: 'Cable' },
  { id: 'cable-row-high', name: 'Cable Row (high)', muscleGroup: 'Back', equipment: 'Cable' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'Back', equipment: 'Cable' },
  { id: 'pull-up', name: 'Pull-Up / Lat Pulldown', muscleGroup: 'Back', equipment: 'Bodyweight' },
  { id: 'pull-up-assisted', name: 'Pull-Up / Assisted Pull-Up', muscleGroup: 'Back', equipment: 'Bodyweight' },
  { id: 'chin-up', name: 'Chin-Up', muscleGroup: 'Back', equipment: 'Bodyweight' },
  { id: 'inverted-row', name: 'Inverted Row', muscleGroup: 'Back', equipment: 'Bodyweight' },
  { id: 'australian-pull-up', name: 'Australian Pull-Up', muscleGroup: 'Back', equipment: 'Bodyweight' },
  { id: 'deadlift', name: 'Deadlift', muscleGroup: 'Back', equipment: 'Barbell' },
  { id: 'face-pull', name: 'Face Pull', muscleGroup: 'Back', equipment: 'Cable' },
  // Shoulders
  { id: 'ohp', name: 'Overhead Press', muscleGroup: 'Shoulders', equipment: 'Barbell' },
  { id: 'lateral-raise', name: 'Lateral Raise', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'front-raise', name: 'Front Raise', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'reverse-fly', name: 'Reverse Fly', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'shrug', name: 'Shrug', muscleGroup: 'Shoulders', equipment: 'Barbell' },
  { id: 'pike-push-up', name: 'Pike Push-Up', muscleGroup: 'Shoulders', equipment: 'Bodyweight' },
  { id: 'handstand-push-up', name: 'Handstand Push-Up', muscleGroup: 'Shoulders', equipment: 'Bodyweight' },
  // Arms - Biceps
  { id: 'bb-curl', name: 'Barbell Curl', muscleGroup: 'Biceps', equipment: 'Barbell' },
  { id: 'hammer-curl', name: 'Hammer Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell' },
  { id: 'preacher-curl', name: 'Preacher Curl', muscleGroup: 'Biceps', equipment: 'Barbell' },
  { id: 'incline-db-curl', name: 'Incline Dumbbell Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell' },
  // Arms - Triceps
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', muscleGroup: 'Triceps', equipment: 'Cable' },
  { id: 'overhead-tricep', name: 'Overhead Tricep Extension', muscleGroup: 'Triceps', equipment: 'Dumbbell' },
  { id: 'skull-crusher', name: 'Skull Crusher', muscleGroup: 'Triceps', equipment: 'Barbell' },
  { id: 'close-grip-bench', name: 'Close-Grip Bench', muscleGroup: 'Triceps', equipment: 'Barbell' },
  { id: 'tricep-dips', name: 'Tricep Dips', muscleGroup: 'Triceps', equipment: 'Bodyweight' },
  { id: 'bench-dips', name: 'Bench Dips', muscleGroup: 'Triceps', equipment: 'Bodyweight' },
  // Legs
  { id: 'bb-squat', name: 'Barbell Squat', muscleGroup: 'Legs', equipment: 'Barbell' },
  { id: 'front-squat', name: 'Front Squat', muscleGroup: 'Legs', equipment: 'Barbell' },
  { id: 'rdl', name: 'Romanian Deadlift', muscleGroup: 'Legs', equipment: 'Barbell' },
  { id: 'leg-press', name: 'Leg Press', muscleGroup: 'Legs', equipment: 'Machine' },
  { id: 'leg-curl', name: 'Leg Curl', muscleGroup: 'Legs', equipment: 'Machine' },
  { id: 'leg-extension', name: 'Leg Extension', muscleGroup: 'Legs', equipment: 'Machine' },
  { id: 'calf-raise', name: 'Calf Raise', muscleGroup: 'Calves', equipment: 'Machine' },
  // Legs - Bodyweight
  { id: 'bodyweight-squat', name: 'Bodyweight Squat', muscleGroup: 'Legs', equipment: 'Bodyweight' },
  { id: 'lunges', name: 'Lunges', muscleGroup: 'Legs', equipment: 'Bodyweight' },
  { id: 'walking-lunge', name: 'Walking Lunge', muscleGroup: 'Legs', equipment: 'Bodyweight' },
  { id: 'reverse-lunge', name: 'Reverse Lunge', muscleGroup: 'Legs', equipment: 'Bodyweight' },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', muscleGroup: 'Legs', equipment: 'Bodyweight' },
  { id: 'glute-bridge', name: 'Glute Bridge', muscleGroup: 'Legs', equipment: 'Bodyweight' },
  { id: 'single-leg-glute-bridge', name: 'Single-Leg Glute Bridge', muscleGroup: 'Legs', equipment: 'Bodyweight' },
  { id: 'step-up', name: 'Step-Up', muscleGroup: 'Legs', equipment: 'Bodyweight' },
  { id: 'calf-raise-bw', name: 'Calf Raise (Bodyweight)', muscleGroup: 'Calves', equipment: 'Bodyweight' },
  // Core / Other
  { id: 'ab-work', name: 'Ab work', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'plank', name: 'Plank', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'side-plank', name: 'Side Plank', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'crunch', name: 'Crunch', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'bicycle-crunch', name: 'Bicycle Crunch', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'leg-raise', name: 'Leg Raise', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'mountain-climber', name: 'Mountain Climber', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'dead-bug', name: 'Dead Bug', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'l-sit', name: 'L-Sit', muscleGroup: 'Core', equipment: 'Bodyweight' },
]

/** Search exercises by name (case-insensitive, substring). */
export function searchExercises(query: string, limit = 15): ExerciseEntry[] {
  if (!query.trim()) return EXERCISES.slice(0, limit)
  const q = query.trim().toLowerCase()
  return EXERCISES.filter((e) => e.name.toLowerCase().includes(q)).slice(0, limit)
}

/** Get exercise by exact name (case-insensitive). */
export function getExerciseByName(name: string): ExerciseEntry | null {
  if (!name.trim()) return null
  const n = name.trim().toLowerCase()
  return EXERCISES.find((e) => e.name.toLowerCase() === n) ?? null
}

/** All exercises for dropdown when query is empty. */
export function getExerciseList(): ExerciseEntry[] {
  return [...EXERCISES]
}
