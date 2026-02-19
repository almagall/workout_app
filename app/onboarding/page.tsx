'use client'

import { useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'

export default function OnboardingPage() {
  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      window.location.href = '/get-started'
      return
    }

    // Plan type is now selected per template when creating/editing a template.
    // Redirect to template creation so the user can create their first template (and choose plan type there).
    window.location.href = '/workout/template/create'
  }, [])

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background">
      <div className="absolute inset-0 bg-radial-hero pointer-events-none" />
      <div className="relative text-center">
        <p className="text-muted">Loading...</p>
      </div>
    </div>
  )
}
