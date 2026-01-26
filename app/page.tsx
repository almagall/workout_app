'use client'

import { useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'

export default function Home() {
  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      window.location.href = '/get-started'
      return
    }

    const settings = localStorage.getItem(`workout_settings_${user.id}`)
    if (!settings) {
      window.location.href = '/onboarding'
    } else {
      window.location.href = '/dashboard'
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <p className="text-[#888888]">Loading...</p>
      </div>
    </div>
  )
}
