export type PlanType = 'hypertrophy' | 'strength'

export type PerformanceStatus = 'overperformed' | 'met_target' | 'underperformed'

export interface WorkoutTemplate {
  id: string
  user_id: string
  plan_type: PlanType
  name: string
  preset_id?: string | null
  created_at: string
  updated_at: string
}

export interface TemplateDay {
  id: string
  template_id: string
  day_label: string
  day_order: number
  created_at: string
}

export interface TemplateExercise {
  id: string
  template_day_id: string
  exercise_name: string
  exercise_order: number
  /** Per-exercise focus override. Null = use template plan_type. */
  focus?: PlanType | null
  created_at: string
}

export interface WorkoutSession {
  id: string
  user_id: string
  template_day_id: string
  workout_date: string
  overall_performance_rating: number | null
  overall_feedback: string | null
  is_complete: boolean
  created_at: string
  duration_seconds?: number | null
  session_notes?: string | null
  note_tags?: string[] | null
}

export type SetType = 'warmup' | 'working' | 'cooldown'

export interface ExerciseLog {
  id: string
  session_id: string
  exercise_name: string
  set_number: number
  set_type?: SetType
  weight: number
  reps: number
  rpe: number
  target_weight: number | null
  target_reps: number | null
  target_rpe: number | null
  performance_status: PerformanceStatus | null
  exercise_feedback: string | null
  exercise_notes?: string | null
  created_at: string
  /** For cardio: duration in seconds. Null for resistance. */
  duration_seconds?: number | null
  /** For cardio: distance (e.g. miles or km). Null for resistance. */
  distance?: number | null
  /** For cardio: mi or km. Null for resistance. */
  distance_unit?: string | null
}

export interface ProgressiveOverloadSettings {
  id: string
  user_id: string
  plan_type: PlanType
  settings_json: {
    hypertrophy?: {
      rep_range_min: number
      rep_range_max: number
      target_rpe_min: number
      target_rpe_max: number
      weight_increase_percent: number
      rep_increase: number
    }
    strength?: {
      rep_range_min: number
      rep_range_max: number
      target_rpe_min: number
      target_rpe_max: number
      weight_increase_percent: number
      rep_increase: number
    }
  }
  created_at: string
  updated_at: string
}

export interface SetData {
  setNumber: number
  setType: SetType
  weight: number
  reps: number
  rpe: number
  targetWeight?: number | null
  targetReps?: number | null
  targetRpe?: number | null
  targetExplanation?: string | null
  /** For cardio: duration in seconds. */
  durationSeconds?: number | null
  /** For cardio: distance (e.g. miles or km). */
  distance?: number | null
  /** For cardio: mi or km. */
  distanceUnit?: string | null
}

export interface ExerciseData {
  exerciseName: string
  sets: SetData[]
  exerciseFeedback?: string | null
  exerciseRating?: number | null
}
