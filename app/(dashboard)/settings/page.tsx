'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, signOut } from '@/lib/auth-simple'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types/profile'
import { getPlateConfig, savePlateConfig, STANDARD_PLATES } from '@/lib/plate-calculator'
import { getAllowFriendsSeePRs, setAllowFriendsSeePRs } from '@/lib/friends'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [heightCm, setHeightCm] = useState('')
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('ft')
  const [heightFeet, setHeightFeet] = useState('')
  const [heightInches, setHeightInches] = useState('')
  const [bodyweight, setBodyweight] = useState('')
  const [bodyweightUnit, setBodyweightUnit] = useState<'lbs' | 'kg'>('lbs')
  const [trainingExperience, setTrainingExperience] = useState<'beginner' | 'intermediate' | 'advanced' | ''>('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')

  // Plate calculator
  const [barWeight, setBarWeight] = useState('45')
  const [selectedPlates, setSelectedPlates] = useState<number[]>(STANDARD_PLATES)

  // Privacy: allow friends to see my PRs
  const [allowFriendsSeePRs, setAllowFriendsSeePRsState] = useState(true)

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      const user = getCurrentUser()
      if (!user) {
        window.location.href = '/get-started'
        return
      }

      const supabase = createClient()
      const { data: profile, error: profileError } = await supabase
        .from('simple_users')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileError || !profile) {
        setError('Failed to load profile')
        setLoading(false)
        return
      }

      // Set form values
      setEmail(profile.email || '')
      setUsername(profile.username || '')
      setDateOfBirth(profile.date_of_birth || '')
      setGender(profile.gender || '')
      setBodyweight(profile.bodyweight?.toString() || '')
      setBodyweightUnit(profile.bodyweight_unit || 'lbs')
      setTrainingExperience(profile.training_experience || '')

      // Convert height from cm to ft/in if needed
      if (profile.height_cm) {
        const cm = profile.height_cm
        setHeightCm(cm.toString())
        // Convert to feet and inches
        const totalInches = cm / 2.54
        const feet = Math.floor(totalInches / 12)
        const inches = Math.round(totalInches % 12)
        setHeightFeet(feet.toString())
        setHeightInches(inches.toString())
      }

      // Load plate config from localStorage
      const plateConfig = getPlateConfig(user.id)
      setBarWeight(plateConfig.barWeight.toString())
      setSelectedPlates(plateConfig.plates)

      const allowPRs = await getAllowFriendsSeePRs(user.id)
      setAllowFriendsSeePRsState(allowPRs)

      setLoading(false)
    }

    loadProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validation
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth)
      const today = new Date()
      const age = today.getFullYear() - dob.getFullYear()
      if (age < 13) {
        setError('You must be at least 13 years old')
        return
      }
    }

    // Calculate height in cm based on selected unit
    let finalHeightCm: number | null = null
    if (heightUnit === 'cm') {
      if (heightCm) {
        finalHeightCm = parseFloat(heightCm)
        if (finalHeightCm < 120 || finalHeightCm > 250) {
          setError('Height must be between 120-250 cm (4\'-8\')')
          return
        }
      }
    } else {
      // ft/in
      if (heightFeet || heightInches) {
        const feet = parseFloat(heightFeet || '0')
        const inches = parseFloat(heightInches || '0')
        
        if (feet < 0 || feet > 8 || inches < 0 || inches >= 12) {
          setError('Please enter valid height (feet: 0-8, inches: 0-11)')
          return
        }
        
        finalHeightCm = (feet * 12 + inches) * 2.54
        
        if (finalHeightCm < 120 || finalHeightCm > 250) {
          setError('Height must be between 4\'-8\'')
          return
        }
      }
    }

    if (bodyweight) {
      const weight = parseFloat(bodyweight)
      if (bodyweightUnit === 'lbs' && (weight < 50 || weight > 500)) {
        setError('Bodyweight must be between 50-500 lbs')
        return
      }
      if (bodyweightUnit === 'kg' && (weight < 25 || weight > 225)) {
        setError('Bodyweight must be between 25-225 kg')
        return
      }
    }

    setSaving(true)

    try {
      const user = getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const supabase = createClient()

      const updates: Partial<UserProfile> = {
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        height_cm: finalHeightCm,
        bodyweight: bodyweight ? parseFloat(bodyweight) : null,
        bodyweight_unit: bodyweightUnit,
        training_experience: trainingExperience || null,
      }

      const { error: updateError } = await supabase
        .from('simple_users')
        .update(updates)
        .eq('user_id', user.id)

      if (updateError) throw new Error(updateError.message)

      // Save plate config to localStorage
      const bw = parseFloat(barWeight)
      if (!isNaN(bw) && bw >= 0 && bw <= 100) {
        savePlateConfig(user.id, {
          barWeight: bw,
          plates: selectedPlates.length > 0 ? selectedPlates : STANDARD_PLATES,
        })
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    const user = getCurrentUser()
    if (!user || deleteConfirmText !== 'DELETE') return

    setDeleting(true)
    setError(null)

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete account')
      }

      // Clear all local data
      signOut()
      localStorage.removeItem('workout_app_users')
      localStorage.removeItem(`plate_config_${user.id}`)
      localStorage.removeItem(`deload_${user.id}`)
      localStorage.removeItem(`workout_settings_${user.id}`)
      localStorage.removeItem('deload_banner_dismissed')
      localStorage.removeItem('pr_celebration_dismissed')

      window.location.href = '/get-started'
    } catch (err: any) {
      setError(err.message || 'Failed to delete account')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-muted mt-2">Manage your profile and preferences</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-900/20 border border-green-800 text-green-300 px-4 py-3 rounded">
          Settings saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Information */}
        <div className="card-glass card-accent-top p-6">
          <div className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }} />
          <h2 className="relative text-xs font-semibold uppercase tracking-wider text-muted mb-4 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Personal Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-2 border border-white/[0.06] bg-white/[0.04] text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Sex
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                className="w-full px-3 py-2 border border-white/[0.06] bg-white/[0.04] text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
              >
                <option value="">Select sex</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <p className="text-xs text-muted mt-1">Used for strength standards comparison</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Height
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setHeightUnit('ft')
                    // Convert cm to ft/in when switching
                    if (heightCm) {
                      const cm = parseFloat(heightCm)
                      const totalInches = cm / 2.54
                      const feet = Math.floor(totalInches / 12)
                      const inches = Math.round(totalInches % 12)
                      setHeightFeet(feet.toString())
                      setHeightInches(inches.toString())
                    }
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    heightUnit === 'ft'
                      ? 'btn-primary'
                      : 'bg-white/[0.04] text-muted hover:text-foreground'
                  }`}
                >
                  ft / in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHeightUnit('cm')
                    // Convert ft/in to cm when switching
                    if (heightFeet || heightInches) {
                      const feet = parseFloat(heightFeet || '0')
                      const inches = parseFloat(heightInches || '0')
                      const cm = (feet * 12 + inches) * 2.54
                      setHeightCm(cm.toFixed(1))
                    }
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    heightUnit === 'cm'
                      ? 'btn-primary'
                      : 'bg-white/[0.04] text-muted hover:text-foreground'
                  }`}
                >
                  cm
                </button>
              </div>
              
              {heightUnit === 'cm' ? (
                <input
                  type="number"
                  step="0.1"
                  value={heightCm}
                  onChange={(e) => {
                    setHeightCm(e.target.value)
                    // Also update ft/in for when user switches
                    if (e.target.value) {
                      const cm = parseFloat(e.target.value)
                      const totalInches = cm / 2.54
                      const feet = Math.floor(totalInches / 12)
                      const inches = Math.round(totalInches % 12)
                      setHeightFeet(feet.toString())
                      setHeightInches(inches.toString())
                    }
                  }}
                  placeholder="170"
                  className="w-full px-3 py-2 border border-white/[0.06] bg-white/[0.04] text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
                />
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={heightFeet}
                      onChange={(e) => {
                        setHeightFeet(e.target.value)
                        // Also update cm for when user switches
                        const feet = parseFloat(e.target.value || '0')
                        const inches = parseFloat(heightInches || '0')
                        const cm = (feet * 12 + inches) * 2.54
                        setHeightCm(cm.toFixed(1))
                      }}
                      placeholder="5"
                      min="0"
                      max="8"
                      className="w-full px-3 py-2 border border-white/[0.06] bg-white/[0.04] text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
                    />
                    <p className="text-xs text-muted mt-1 text-center">feet</p>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={heightInches}
                      onChange={(e) => {
                        setHeightInches(e.target.value)
                        // Also update cm for when user switches
                        const feet = parseFloat(heightFeet || '0')
                        const inches = parseFloat(e.target.value || '0')
                        const cm = (feet * 12 + inches) * 2.54
                        setHeightCm(cm.toFixed(1))
                      }}
                      placeholder="10"
                      min="0"
                      max="11"
                      className="w-full px-3 py-2 border border-white/[0.06] bg-white/[0.04] text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
                    />
                    <p className="text-xs text-muted mt-1 text-center">inches</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bodyweight */}
        <div className="card-glass card-accent-top p-6">
          <div className="absolute -top-10 -left-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }} />
          <h2 className="relative text-xs font-semibold uppercase tracking-wider text-muted mb-4 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Bodyweight</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Current Bodyweight
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={bodyweight}
                  onChange={(e) => setBodyweight(e.target.value)}
                  placeholder="165"
                  className="flex-1 px-3 py-2 border border-white/[0.06] bg-white/[0.04] text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
                />
                <select
                  value={bodyweightUnit}
                  onChange={(e) => setBodyweightUnit(e.target.value as 'lbs' | 'kg')}
                  className="px-3 py-2 border border-white/[0.06] bg-white/[0.04] text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
                >
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </select>
              </div>
              <p className="text-xs text-muted mt-1">Used for strength standards comparison</p>
            </div>

            <button
              type="button"
              onClick={() => router.push('/weight')}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              → View Weight History
            </button>
          </div>
        </div>

        {/* Training Profile */}
        <div className="card-glass card-accent-top p-6">
          <div className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }} />
          <h2 className="relative text-xs font-semibold uppercase tracking-wider text-muted mb-4 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Training Profile</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Training Experience
              </label>
              <select
                value={trainingExperience}
                onChange={(e) => setTrainingExperience(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
                className="w-full px-3 py-2 border border-white/[0.06] bg-white/[0.04] text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
              >
                <option value="">Select experience level</option>
                <option value="beginner">Beginner (less than 1 year)</option>
                <option value="intermediate">Intermediate (1-3 years)</option>
                <option value="advanced">Advanced (3+ years)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="card-glass card-accent-top p-6">
          <div className="absolute -top-10 -left-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }} />
          <h2 className="relative text-xs font-semibold uppercase tracking-wider text-muted mb-4 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Privacy</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowFriendsSeePRs}
              onChange={async () => {
                const next = !allowFriendsSeePRs
                await setAllowFriendsSeePRs(next)
                setAllowFriendsSeePRsState(next)
              }}
              className="rounded border-white/[0.06] bg-white/[0.04] text-foreground focus:ring-accent/40"
            />
            <span className="text-foreground text-sm">Allow friends to see my recent PRs</span>
          </label>
        </div>

        {/* Plate Calculator */}
        <div className="card-glass card-accent-top p-6">
          <div className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }} />
          <h2 className="relative text-xs font-semibold uppercase tracking-wider text-muted mb-4 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Plate Calculator</h2>
          <p className="text-sm text-muted mb-4">
            Target weights and plate breakdowns will use only the plates you select. Choose which plates your gym has.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Bar weight (lbs)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={barWeight}
                onChange={(e) => setBarWeight(e.target.value)}
                className="w-24 px-3 py-2 border border-white/[0.06] bg-white/[0.04] text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Available plates (lbs)
              </label>
              <div className="flex flex-wrap gap-2">
                {STANDARD_PLATES.map((plate) => (
                  <label
                    key={plate}
                    className="flex items-center gap-2 px-3 py-2 rounded-md border border-white/[0.06] bg-white/[0.04] cursor-pointer hover:bg-white/[0.04]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPlates.includes(plate)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPlates([...selectedPlates, plate].sort((a, b) => b - a))
                        } else {
                          setSelectedPlates(selectedPlates.filter((p) => p !== plate))
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-foreground">{plate}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="card-glass card-accent-top p-6">
          <div className="absolute -top-10 -left-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }} />
          <h2 className="relative text-xs font-semibold uppercase tracking-wider text-muted mb-4 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Account</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-3 py-2 border border-white/[0.06] bg-background text-muted rounded-md cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                disabled
                className="w-full px-3 py-2 border border-white/[0.06] bg-background text-muted rounded-md cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-primary px-6 py-3 hover:shadow-glow transition-all duration-200"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="mt-12 rounded-xl border border-red-500/20 bg-red-500/[0.03] p-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.06), transparent 70%)' }} />
        <div className="relative">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-red-400/80 mb-1 flex items-center gap-2">
            <span className="w-0.5 h-3.5 rounded-full bg-red-500/40 flex-shrink-0" />Danger Zone
          </h2>
          <p className="text-sm text-muted mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-300">
                Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm account deletion:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full max-w-xs px-3 py-2 border border-red-500/30 bg-red-500/[0.05] text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/40"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Permanently Delete Account'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-white/[0.08] text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
