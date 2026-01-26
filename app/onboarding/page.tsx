'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import type { PlanType } from '@/types/workout'

export default function OnboardingPage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  // Check if user already has a plan selected
  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      window.location.href = '/get-started'
      return
    }

    const settings = localStorage.getItem(`workout_settings_${user.id}`)
    if (settings) {
      // User already has a plan, redirect to dashboard
      window.location.href = '/dashboard'
    } else {
      setChecking(false)
    }
  }, [])

  const handlePlanSelection = async (planType: PlanType) => {
    setSelectedPlan(planType)
    setLoading(true)
    setError(null)

    try {
      const user = getCurrentUser()
      if (!user) {
        setError('Session expired. Please sign in again.')
        setTimeout(() => {
          window.location.href = '/get-started'
        }, 2000)
        return
      }

      // Set default progressive overload settings based on plan type
      const defaultSettings = {
        hypertrophy: {
          rep_range_min: 8,
          rep_range_max: 15,
          target_rpe_min: 6,
          target_rpe_max: 8,
          weight_increase_percent: 2.5,
          rep_increase: 1,
        },
        strength: {
          rep_range_min: 3,
          rep_range_max: 6,
          target_rpe_min: 7,
          target_rpe_max: 9,
          weight_increase_percent: 5,
          rep_increase: 0,
        },
      }

      // Store settings in localStorage
      const settingsData = {
        plan_type: planType,
        settings_json: { [planType]: defaultSettings[planType] },
        user_id: user.id,
      }

      localStorage.setItem(`workout_settings_${user.id}`, JSON.stringify(settingsData))

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 200))

      // Redirect to template creation
      window.location.href = '/workout/template/create'
    } catch (err: any) {
      setError(err.message || 'Failed to save plan selection. Please try again.')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="max-w-4xl w-full p-8">
        <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-8">
          <h1 className="text-3xl font-bold text-center mb-2 text-slate-100">
            Choose Your Workout Plan
          </h1>
          <p className="text-center text-slate-300 mb-8">
            Select the plan that matches your fitness goals
          </p>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Hypertrophy Plan */}
            <div
              className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                selectedPlan === 'hypertrophy'
                  ? 'border-indigo-500 bg-indigo-900/30'
                  : 'border-slate-600 bg-slate-700 hover:border-indigo-500/50'
              }`}
              onClick={() => handlePlanSelection('hypertrophy')}
            >
              <h2 className="text-2xl font-bold mb-4 text-slate-100">Hypertrophy Training</h2>
              <ul className="space-y-2 text-slate-200">
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2 font-bold">✓</span>
                  <span>Higher rep range (8-15 reps)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2 font-bold">✓</span>
                  <span>Focus on volume progression</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2 font-bold">✓</span>
                  <span>Moderate intensity (RPE 6-8)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2 font-bold">✓</span>
                  <span>Build muscle size and endurance</span>
                </li>
              </ul>
              {loading && selectedPlan === 'hypertrophy' && (
                <p className="mt-4 text-indigo-400">Loading...</p>
              )}
            </div>

            {/* Strength Plan */}
            <div
              className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                selectedPlan === 'strength'
                  ? 'border-indigo-500 bg-indigo-900/30'
                  : 'border-slate-600 bg-slate-700 hover:border-indigo-500/50'
              }`}
              onClick={() => handlePlanSelection('strength')}
            >
              <h2 className="text-2xl font-bold mb-4 text-slate-100">Strength Training</h2>
              <ul className="space-y-2 text-slate-200">
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2 font-bold">✓</span>
                  <span>Lower rep range (3-6 reps)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2 font-bold">✓</span>
                  <span>Focus on weight progression</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2 font-bold">✓</span>
                  <span>Higher intensity (RPE 7-9)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2 font-bold">✓</span>
                  <span>Build maximum strength</span>
                </li>
              </ul>
              {loading && selectedPlan === 'strength' && (
                <p className="mt-4 text-indigo-400">Loading...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
