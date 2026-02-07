export interface UserProfile {
  user_id: string
  username: string
  email: string
  date_of_birth: string | null
  gender: 'male' | 'female' | 'other' | null
  height_cm: number | null
  bodyweight: number | null
  bodyweight_unit: 'lbs' | 'kg'
  training_experience: 'beginner' | 'intermediate' | 'advanced' | null
  created_at: string
  updated_at: string
}

export interface BodyweightEntry {
  id: string
  user_id: string
  weight: number
  weight_unit: 'lbs' | 'kg'
  log_date: string
  notes: string | null
  created_at: string
}

export interface StrengthStandard {
  exercise: string
  currentWeight: number
  tier: 'beginner' | 'novice' | 'intermediate' | 'advanced' | 'elite'
  percentile: number
  nextTierWeight: number
  nextTierName: string
}

export interface ProgressionTrend {
  exerciseName: string
  trend: 'accelerating' | 'progressing' | 'maintaining' | 'plateaued' | 'regressing'
  percentChange: number
  icon: string
  color: string
  message: string
}

export interface ConsistencyMetrics {
  score: number
  weeklyHitRates: number[]
  variance: number
  trend: 'improving' | 'stable' | 'declining'
  insights: string[]
}
