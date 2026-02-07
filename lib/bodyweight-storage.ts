import { createClient } from './supabase/client'
import { getCurrentUser } from './auth-simple'
import type { BodyweightEntry } from '@/types/profile'

/**
 * Log new bodyweight entry
 */
export async function logBodyweight(
  weight: number,
  unit: 'lbs' | 'kg',
  date: string,
  notes?: string
): Promise<void> {
  const user = getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const supabase = createClient()

  const { error } = await supabase
    .from('bodyweight_history')
    .insert({
      user_id: user.id,
      weight,
      weight_unit: unit,
      log_date: date,
      notes: notes || null,
    })

  if (error) {
    throw new Error(`Failed to log bodyweight: ${error.message}`)
  }
}

/**
 * Get bodyweight history for chart
 */
export async function getBodyweightHistory(
  startDate: string,
  endDate: string
): Promise<BodyweightEntry[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()

  const { data, error } = await supabase
    .from('bodyweight_history')
    .select('*')
    .eq('user_id', user.id)
    .gte('log_date', startDate)
    .lte('log_date', endDate)
    .order('log_date', { ascending: true })

  if (error) {
    console.error('Error fetching bodyweight history:', error)
    return []
  }

  return data || []
}

/**
 * Get all bodyweight history (no date filter)
 */
export async function getAllBodyweightHistory(): Promise<BodyweightEntry[]> {
  const user = getCurrentUser()
  if (!user) return []

  const supabase = createClient()

  const { data, error} = await supabase
    .from('bodyweight_history')
    .select('*')
    .eq('user_id', user.id)
    .order('log_date', { ascending: true })

  if (error) {
    console.error('Error fetching bodyweight history:', error)
    return []
  }

  return data || []
}

/**
 * Update current bodyweight in profile (manual update without history entry)
 */
export async function updateCurrentBodyweight(weight: number, unit: 'lbs' | 'kg'): Promise<void> {
  const user = getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const supabase = createClient()

  const { error } = await supabase
    .from('simple_users')
    .update({
      bodyweight: weight,
      bodyweight_unit: unit,
    })
    .eq('user_id', user.id)

  if (error) {
    throw new Error(`Failed to update bodyweight: ${error.message}`)
  }
}

/**
 * Get user's bodyweight for a specific date.
 * Uses the most recent bodyweight_history entry on or before the date.
 * Falls back to profile bodyweight if no history entries exist.
 * Returns weight in lbs for consistency with workout logging.
 */
export async function getBodyweightForDate(date: string): Promise<{ weight: number; unit: 'lbs' } | null> {
  const user = getCurrentUser()
  if (!user) return null

  const supabase = createClient()

  // Get most recent bodyweight entry on or before the date
  const { data: historyEntry, error: historyError } = await supabase
    .from('bodyweight_history')
    .select('weight, weight_unit')
    .eq('user_id', user.id)
    .lte('log_date', date)
    .order('log_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!historyError && historyEntry && historyEntry.weight != null) {
    const weight = Number(historyEntry.weight)
    const unit = (historyEntry.weight_unit || 'lbs') as 'lbs' | 'kg'
    const weightLbs = unit === 'kg' ? weight * 2.20462 : weight
    return { weight: weightLbs, unit: 'lbs' }
  }

  // Fall back to profile bodyweight
  const profile = await getCurrentBodyweight()
  if (!profile) return null

  const weightLbs = profile.unit === 'kg' ? profile.weight * 2.20462 : profile.weight
  return { weight: weightLbs, unit: 'lbs' }
}

/**
 * Get current bodyweight from profile
 */
export async function getCurrentBodyweight(): Promise<{ weight: number; unit: string } | null> {
  const user = getCurrentUser()
  if (!user) return null

  const supabase = createClient()

  const { data, error } = await supabase
    .from('simple_users')
    .select('bodyweight, bodyweight_unit')
    .eq('user_id', user.id)
    .single()

  if (error || !data || !data.bodyweight) {
    return null
  }

  return {
    weight: data.bodyweight,
    unit: data.bodyweight_unit || 'lbs',
  }
}

/**
 * Delete a bodyweight entry
 */
export async function deleteBodyweightEntry(entryId: string): Promise<void> {
  const user = getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const supabase = createClient()

  const { error } = await supabase
    .from('bodyweight_history')
    .delete()
    .eq('id', entryId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(`Failed to delete bodyweight entry: ${error.message}`)
  }
}

/**
 * Update a bodyweight entry
 */
export async function updateBodyweightEntry(
  entryId: string,
  weight: number,
  unit: 'lbs' | 'kg',
  date: string,
  notes?: string
): Promise<void> {
  const user = getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const supabase = createClient()

  const { error } = await supabase
    .from('bodyweight_history')
    .update({
      weight,
      weight_unit: unit,
      log_date: date,
      notes: notes || null,
    })
    .eq('id', entryId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(`Failed to update bodyweight entry: ${error.message}`)
  }
}
