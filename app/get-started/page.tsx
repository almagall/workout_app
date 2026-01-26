'use client'

import { useState } from 'react'
import { createUser, signIn, getCurrentUser } from '@/lib/auth-simple'

export default function GetStartedPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Check if already logged in
  if (typeof window !== 'undefined') {
    const user = getCurrentUser()
    if (user) {
      // Check if user has selected a plan
      const settings = localStorage.getItem(`workout_settings_${user.id}`)
      if (!settings) {
        window.location.href = '/onboarding'
      } else {
        window.location.href = '/dashboard'
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      // First try to sign in
      let user = signIn(username, password)

      // If sign in failed, create new account
      if (!user) {
        user = createUser(username, password)
      }

      if (user) {
        // Check if user has selected a plan
        const settings = localStorage.getItem(`workout_settings_${user.id}`)
        
        // Small delay for UI
        await new Promise(resolve => setTimeout(resolve, 200))
        
        if (!settings) {
          window.location.href = '/onboarding'
        } else {
          window.location.href = '/dashboard'
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-slate-800 rounded-lg shadow-xl border border-slate-700">
        <div>
          <h1 className="text-center text-4xl font-extrabold text-indigo-400 mb-2">
            Workout Planner
          </h1>
          <h2 className="mt-6 text-center text-2xl font-bold text-slate-100">
            Sign In
          </h2>
          <p className="mt-2 text-center text-sm text-slate-300">
            Enter your username and password. We'll create an account if you don't have one.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 placeholder-slate-400 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 placeholder-slate-400 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
