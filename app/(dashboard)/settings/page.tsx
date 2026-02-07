'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-simple'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types/profile'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('')
  const [heightCm, setHeightCm] = useState('')
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('ft')
  const [heightFeet, setHeightFeet] = useState('')
  const [heightInches, setHeightInches] = useState('')
  const [bodyweight, setBodyweight] = useState('')
  const [bodyweightUnit, setBodyweightUnit] = useState<'lbs' | 'kg'>('lbs')
  const [trainingExperience, setTrainingExperience] = useState<'beginner' | 'intermediate' | 'advanced' | ''>('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')

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

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-[#888888]">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-[#888888] mt-2">Manage your profile and preferences</p>
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
        <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Personal Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-2 border border-[#2a2a2a] bg-[#1a1a1a] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}
                className="w-full px-3 py-2 border border-[#2a2a2a] bg-[#1a1a1a] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Prefer not to say</option>
              </select>
              <p className="text-xs text-[#888888] mt-1">Used for strength standards comparison</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
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
                      ? 'bg-white text-black'
                      : 'bg-[#1a1a1a] text-[#888888] hover:text-white'
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
                      ? 'bg-white text-black'
                      : 'bg-[#1a1a1a] text-[#888888] hover:text-white'
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
                  className="w-full px-3 py-2 border border-[#2a2a2a] bg-[#1a1a1a] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
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
                      className="w-full px-3 py-2 border border-[#2a2a2a] bg-[#1a1a1a] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                    />
                    <p className="text-xs text-[#888888] mt-1 text-center">feet</p>
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
                      className="w-full px-3 py-2 border border-[#2a2a2a] bg-[#1a1a1a] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                    />
                    <p className="text-xs text-[#888888] mt-1 text-center">inches</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bodyweight */}
        <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Bodyweight</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Current Bodyweight
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={bodyweight}
                  onChange={(e) => setBodyweight(e.target.value)}
                  placeholder="165"
                  className="flex-1 px-3 py-2 border border-[#2a2a2a] bg-[#1a1a1a] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                />
                <select
                  value={bodyweightUnit}
                  onChange={(e) => setBodyweightUnit(e.target.value as 'lbs' | 'kg')}
                  className="px-3 py-2 border border-[#2a2a2a] bg-[#1a1a1a] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </select>
              </div>
              <p className="text-xs text-[#888888] mt-1">Used for strength standards comparison</p>
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
        <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Training Profile</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Training Experience
              </label>
              <select
                value={trainingExperience}
                onChange={(e) => setTrainingExperience(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
                className="w-full px-3 py-2 border border-[#2a2a2a] bg-[#1a1a1a] text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
              >
                <option value="">Select experience level</option>
                <option value="beginner">Beginner (less than 1 year)</option>
                <option value="intermediate">Intermediate (1-3 years)</option>
                <option value="advanced">Advanced (3+ years)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-[#111111] rounded-lg border border-[#2a2a2a] p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Account</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-3 py-2 border border-[#2a2a2a] bg-[#0a0a0a] text-[#888888] rounded-md cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                disabled
                className="w-full px-3 py-2 border border-[#2a2a2a] bg-[#0a0a0a] text-[#888888] rounded-md cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-6 py-3 bg-white text-black rounded-md font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-[#1a1a1a] text-white rounded-md font-medium hover:bg-[#2a2a2a] border border-[#2a2a2a] transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
