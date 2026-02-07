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
  { id: 'incline-bb-bench', name: 'Incline Barbell Bench Press', muscleGroup: 'Chest', equipment: 'Barbell' },
  { id: 'decline-bb-bench', name: 'Decline Barbell Bench Press', muscleGroup: 'Chest', equipment: 'Barbell' },
  { id: 'db-bench', name: 'Dumbbell Bench Press', muscleGroup: 'Chest', equipment: 'Dumbbell' },
  { id: 'incline-db-press', name: 'Incline Dumbbell Press', muscleGroup: 'Chest', equipment: 'Dumbbell' },
  { id: 'decline-db-press', name: 'Decline Dumbbell Press', muscleGroup: 'Chest', equipment: 'Dumbbell' },
  { id: 'db-fly', name: 'Dumbbell Fly', muscleGroup: 'Chest', equipment: 'Dumbbell' },
  { id: 'incline-db-fly', name: 'Incline Dumbbell Fly', muscleGroup: 'Chest', equipment: 'Dumbbell' },
  { id: 'chest-fly', name: 'Chest Fly', muscleGroup: 'Chest', equipment: 'Dumbbell' },
  { id: 'cable-fly', name: 'Cable Fly', muscleGroup: 'Chest', equipment: 'Cable' },
  { id: 'cable-crossover', name: 'Cable Crossover', muscleGroup: 'Chest', equipment: 'Cable' },
  { id: 'low-cable-fly', name: 'Low Cable Fly', muscleGroup: 'Chest', equipment: 'Cable' },
  { id: 'high-cable-fly', name: 'High Cable Fly', muscleGroup: 'Chest', equipment: 'Cable' },
  { id: 'pec-deck', name: 'Pec Deck', muscleGroup: 'Chest', equipment: 'Machine' },
  { id: 'chest-press-machine', name: 'Chest Press Machine', muscleGroup: 'Chest', equipment: 'Machine' },
  { id: 'push-up', name: 'Push-Up', muscleGroup: 'Chest', equipment: 'Bodyweight' },
  { id: 'dips', name: 'Dips', muscleGroup: 'Chest', equipment: 'Bodyweight' },
  { id: 'dips-chest', name: 'Chest Dips', muscleGroup: 'Chest', equipment: 'Bodyweight' },
  { id: 'diamond-push-up', name: 'Diamond Push-Up', muscleGroup: 'Chest', equipment: 'Bodyweight' },
  { id: 'incline-push-up', name: 'Incline Push-Up', muscleGroup: 'Chest', equipment: 'Bodyweight' },
  { id: 'decline-push-up', name: 'Decline Push-Up', muscleGroup: 'Chest', equipment: 'Bodyweight' },
  // Back
  { id: 'deadlift', name: 'Deadlift', muscleGroup: 'Back', equipment: 'Barbell' },
  { id: 'bb-row', name: 'Barbell Row', muscleGroup: 'Back', equipment: 'Barbell' },
  { id: 'pendlay-row', name: 'Pendlay Row', muscleGroup: 'Back', equipment: 'Barbell' },
  { id: 't-bar-row', name: 'T-Bar Row', muscleGroup: 'Back', equipment: 'Barbell' },
  { id: 'db-row', name: 'Dumbbell Row', muscleGroup: 'Back', equipment: 'Dumbbell' },
  { id: 'single-arm-db-row', name: 'Single Arm Dumbbell Row', muscleGroup: 'Back', equipment: 'Dumbbell' },
  { id: 'cable-row', name: 'Cable Row', muscleGroup: 'Back', equipment: 'Cable' },
  { id: 'seated-cable-row', name: 'Seated Cable Row', muscleGroup: 'Back', equipment: 'Cable' },
  { id: 'cable-row-high', name: 'Cable Row (High)', muscleGroup: 'Back', equipment: 'Cable' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'Back', equipment: 'Cable' },
  { id: 'wide-grip-pulldown', name: 'Wide Grip Lat Pulldown', muscleGroup: 'Back', equipment: 'Cable' },
  { id: 'close-grip-pulldown', name: 'Close Grip Lat Pulldown', muscleGroup: 'Back', equipment: 'Cable' },
  { id: 'straight-arm-pulldown', name: 'Straight Arm Pulldown', muscleGroup: 'Back', equipment: 'Cable' },
  { id: 'face-pull', name: 'Face Pull', muscleGroup: 'Back', equipment: 'Cable' },
  { id: 'pull-up', name: 'Pull-Up', muscleGroup: 'Back', equipment: 'Bodyweight' },
  { id: 'pull-up-assisted', name: 'Assisted Pull-Up', muscleGroup: 'Back', equipment: 'Machine' },
  { id: 'chin-up', name: 'Chin-Up', muscleGroup: 'Back', equipment: 'Bodyweight' },
  { id: 'wide-grip-pull-up', name: 'Wide Grip Pull-Up', muscleGroup: 'Back', equipment: 'Bodyweight' },
  { id: 'inverted-row', name: 'Inverted Row', muscleGroup: 'Back', equipment: 'Bodyweight' },
  { id: 'australian-pull-up', name: 'Australian Pull-Up', muscleGroup: 'Back', equipment: 'Bodyweight' },
  { id: 'rack-pull', name: 'Rack Pull', muscleGroup: 'Back', equipment: 'Barbell' },
  { id: 'machine-row', name: 'Machine Row', muscleGroup: 'Back', equipment: 'Machine' },
  // Shoulders
  { id: 'ohp', name: 'Overhead Press', muscleGroup: 'Shoulders', equipment: 'Barbell' },
  { id: 'military-press', name: 'Military Press', muscleGroup: 'Shoulders', equipment: 'Barbell' },
  { id: 'push-press', name: 'Push Press', muscleGroup: 'Shoulders', equipment: 'Barbell' },
  { id: 'db-shoulder-press', name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'seated-db-press', name: 'Seated Dumbbell Press', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'arnold-press', name: 'Arnold Press', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'lateral-raise', name: 'Lateral Raise', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', muscleGroup: 'Shoulders', equipment: 'Cable' },
  { id: 'front-raise', name: 'Front Raise', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'rear-delt-fly', name: 'Rear Delt Fly', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'reverse-fly', name: 'Reverse Fly', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'reverse-pec-deck', name: 'Reverse Pec Deck', muscleGroup: 'Shoulders', equipment: 'Machine' },
  { id: 'upright-row', name: 'Upright Row', muscleGroup: 'Shoulders', equipment: 'Barbell' },
  { id: 'shrug', name: 'Shrug', muscleGroup: 'Shoulders', equipment: 'Barbell' },
  { id: 'db-shrug', name: 'Dumbbell Shrug', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'shoulder-press-machine', name: 'Shoulder Press Machine', muscleGroup: 'Shoulders', equipment: 'Machine' },
  { id: 'pike-push-up', name: 'Pike Push-Up', muscleGroup: 'Shoulders', equipment: 'Bodyweight' },
  { id: 'handstand-push-up', name: 'Handstand Push-Up', muscleGroup: 'Shoulders', equipment: 'Bodyweight' },
  // Arms - Biceps
  { id: 'bb-curl', name: 'Barbell Curl', muscleGroup: 'Biceps', equipment: 'Barbell' },
  { id: 'ez-bar-curl', name: 'EZ Bar Curl', muscleGroup: 'Biceps', equipment: 'Barbell' },
  { id: 'db-curl', name: 'Dumbbell Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell' },
  { id: 'alternating-db-curl', name: 'Alternating Dumbbell Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell' },
  { id: 'hammer-curl', name: 'Hammer Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell' },
  { id: 'concentration-curl', name: 'Concentration Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell' },
  { id: 'preacher-curl', name: 'Preacher Curl', muscleGroup: 'Biceps', equipment: 'Barbell' },
  { id: 'incline-db-curl', name: 'Incline Dumbbell Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell' },
  { id: 'cable-curl', name: 'Cable Curl', muscleGroup: 'Biceps', equipment: 'Cable' },
  { id: 'cable-hammer-curl', name: 'Cable Hammer Curl', muscleGroup: 'Biceps', equipment: 'Cable' },
  { id: 'spider-curl', name: 'Spider Curl', muscleGroup: 'Biceps', equipment: 'Barbell' },
  { id: '21s', name: '21s (Bicep)', muscleGroup: 'Biceps', equipment: 'Barbell' },
  // Arms - Triceps
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', muscleGroup: 'Triceps', equipment: 'Cable' },
  { id: 'rope-pushdown', name: 'Rope Pushdown', muscleGroup: 'Triceps', equipment: 'Cable' },
  { id: 'overhead-tricep', name: 'Overhead Tricep Extension', muscleGroup: 'Triceps', equipment: 'Dumbbell' },
  { id: 'cable-overhead-extension', name: 'Cable Overhead Extension', muscleGroup: 'Triceps', equipment: 'Cable' },
  { id: 'skull-crusher', name: 'Skull Crusher', muscleGroup: 'Triceps', equipment: 'Barbell' },
  { id: 'ez-skull-crusher', name: 'EZ Bar Skull Crusher', muscleGroup: 'Triceps', equipment: 'Barbell' },
  { id: 'close-grip-bench', name: 'Close-Grip Bench Press', muscleGroup: 'Triceps', equipment: 'Barbell' },
  { id: 'db-kickback', name: 'Dumbbell Kickback', muscleGroup: 'Triceps', equipment: 'Dumbbell' },
  { id: 'french-press', name: 'French Press', muscleGroup: 'Triceps', equipment: 'Barbell' },
  { id: 'tricep-dips', name: 'Tricep Dips', muscleGroup: 'Triceps', equipment: 'Bodyweight' },
  { id: 'bench-dips', name: 'Bench Dips', muscleGroup: 'Triceps', equipment: 'Bodyweight' },
  { id: 'diamond-pushup-tricep', name: 'Diamond Push-Up (Tricep)', muscleGroup: 'Triceps', equipment: 'Bodyweight' },
  // Legs - Quads/General
  { id: 'bb-squat', name: 'Barbell Squat', muscleGroup: 'Legs', equipment: 'Barbell' },
  { id: 'back-squat', name: 'Back Squat', muscleGroup: 'Legs', equipment: 'Barbell' },
  { id: 'front-squat', name: 'Front Squat', muscleGroup: 'Legs', equipment: 'Barbell' },
  { id: 'goblet-squat', name: 'Goblet Squat', muscleGroup: 'Legs', equipment: 'Dumbbell' },
  { id: 'hack-squat', name: 'Hack Squat', muscleGroup: 'Legs', equipment: 'Machine' },
  { id: 'leg-press', name: 'Leg Press', muscleGroup: 'Legs', equipment: 'Machine' },
  { id: 'leg-extension', name: 'Leg Extension', muscleGroup: 'Legs', equipment: 'Machine' },
  { id: 'lunges', name: 'Lunges', muscleGroup: 'Legs', equipment: 'Dumbbell' },
  { id: 'walking-lunge', name: 'Walking Lunge', muscleGroup: 'Legs', equipment: 'Dumbbell' },
  { id: 'reverse-lunge', name: 'Reverse Lunge', muscleGroup: 'Legs', equipment: 'Dumbbell' },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', muscleGroup: 'Legs', equipment: 'Dumbbell' },
  { id: 'step-up', name: 'Step-Up', muscleGroup: 'Legs', equipment: 'Dumbbell' },
  { id: 'bodyweight-squat', name: 'Bodyweight Squat', muscleGroup: 'Legs', equipment: 'Bodyweight' },
  // Legs - Hamstrings/Glutes
  { id: 'rdl', name: 'Romanian Deadlift', muscleGroup: 'Legs', equipment: 'Barbell' },
  { id: 'stiff-leg-deadlift', name: 'Stiff Leg Deadlift', muscleGroup: 'Legs', equipment: 'Barbell' },
  { id: 'db-rdl', name: 'Dumbbell Romanian Deadlift', muscleGroup: 'Legs', equipment: 'Dumbbell' },
  { id: 'good-morning', name: 'Good Morning', muscleGroup: 'Legs', equipment: 'Barbell' },
  { id: 'leg-curl', name: 'Leg Curl', muscleGroup: 'Legs', equipment: 'Machine' },
  { id: 'seated-leg-curl', name: 'Seated Leg Curl', muscleGroup: 'Legs', equipment: 'Machine' },
  { id: 'lying-leg-curl', name: 'Lying Leg Curl', muscleGroup: 'Legs', equipment: 'Machine' },
  { id: 'glute-bridge', name: 'Glute Bridge', muscleGroup: 'Legs', equipment: 'Bodyweight' },
  { id: 'hip-thrust-bb', name: 'Hip Thrust', muscleGroup: 'Legs', equipment: 'Barbell' },
  { id: 'hip-thrust-db', name: 'Hip Thrust', muscleGroup: 'Legs', equipment: 'Dumbbell' },
  { id: 'hip-thrust-machine', name: 'Hip Thrust', muscleGroup: 'Legs', equipment: 'Machine' },
  { id: 'hip-thrust-bw', name: 'Hip Thrust', muscleGroup: 'Legs', equipment: 'Bodyweight' },
  { id: 'single-leg-glute-bridge', name: 'Single-Leg Glute Bridge', muscleGroup: 'Legs', equipment: 'Bodyweight' },
  { id: 'cable-pull-through', name: 'Cable Pull Through', muscleGroup: 'Legs', equipment: 'Cable' },
  // Calves
  { id: 'calf-raise', name: 'Calf Raise', muscleGroup: 'Calves', equipment: 'Machine' },
  { id: 'standing-calf-raise', name: 'Standing Calf Raise', muscleGroup: 'Calves', equipment: 'Machine' },
  { id: 'seated-calf-raise', name: 'Seated Calf Raise', muscleGroup: 'Calves', equipment: 'Machine' },
  { id: 'calf-raise-bw', name: 'Calf Raise (Bodyweight)', muscleGroup: 'Calves', equipment: 'Bodyweight' },
  // Core
  { id: 'ab-work', name: 'Ab Work', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'plank', name: 'Plank', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'side-plank', name: 'Side Plank', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'crunch', name: 'Crunch', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'bicycle-crunch', name: 'Bicycle Crunch', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'russian-twist', name: 'Russian Twist', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'leg-raise', name: 'Leg Raise', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'hanging-knee-raise', name: 'Hanging Knee Raise', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'ab-wheel', name: 'Ab Wheel Rollout', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'cable-crunch', name: 'Cable Crunch', muscleGroup: 'Core', equipment: 'Cable' },
  { id: 'wood-chop', name: 'Wood Chop', muscleGroup: 'Core', equipment: 'Cable' },
  { id: 'pallof-press', name: 'Pallof Press', muscleGroup: 'Core', equipment: 'Cable' },
  { id: 'mountain-climber', name: 'Mountain Climber', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'dead-bug', name: 'Dead Bug', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'bird-dog', name: 'Bird Dog', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'l-sit', name: 'L-Sit', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'sit-up', name: 'Sit-Up', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'v-up', name: 'V-Up', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'toe-touch', name: 'Toe Touch', muscleGroup: 'Core', equipment: 'Bodyweight' },
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
