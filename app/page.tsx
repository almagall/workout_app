'use client'

import { useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import { getTemplates } from '@/lib/storage'

export default function Home() {
  useEffect(() => {
    async function redirect() {
      const user = getCurrentUser()
      if (!user) {
        window.location.href = '/get-started'
        return
      }

      const templates = await getTemplates()
      if (templates.length === 0) {
        window.location.href = '/workout/template/create'
      } else {
        window.location.href = '/dashboard'
      }
    }
    redirect()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <p className="text-[#888888]">Loading...</p>
      </div>
    </div>
  )
}
