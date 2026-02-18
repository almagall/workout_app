'use client'

import { useRouter } from 'next/navigation'

interface DraftConflictModalProps {
  draftDayLabel: string
  draftDayId: string
  onDiscard: () => void
  onClose: () => void
}

export default function DraftConflictModal({ 
  draftDayLabel, 
  draftDayId, 
  onDiscard,
  onClose 
}: DraftConflictModalProps) {
  const router = useRouter()

  const handleGoToDraft = () => {
    router.push(`/workout/log/${draftDayId}`)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-card max-w-md w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground mb-2">In-Progress Workout Detected</h2>
            <p className="text-muted text-sm">
              You have an incomplete workout for <span className="text-foreground font-medium">{draftDayLabel}</span>. 
              You can only have one workout in progress at a time.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoToDraft}
            className="w-full px-4 py-3 bg-white text-black rounded-md font-medium hover:bg-gray-200 transition-colors"
          >
            Continue Previous Workout
          </button>
          
          <button
            onClick={onDiscard}
            className="w-full px-4 py-3 bg-red-600/20 text-red-400 border border-red-600/50 rounded-md font-medium hover:bg-red-600/30 transition-colors"
          >
            Discard & Start New Workout
          </button>

          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-accent text-background rounded-lg font-medium hover:shadow-glow transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
