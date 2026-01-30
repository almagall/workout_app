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
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <p className="text-[#888888]">Loading...</p>
      </div>
    </div>
  )
}
