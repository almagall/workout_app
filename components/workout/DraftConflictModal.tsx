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
    <div className="fixed inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="modal-glass max-w-md w-full overflow-hidden">
        <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #2563eb, #06b6d4, #2563eb)' }} />
        <div className="p-5 border-b border-white/[0.06] flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/15 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground">In-Progress Workout Detected</h2>
            <p className="text-xs text-muted">
              Incomplete workout for <span className="text-foreground font-medium">{draftDayLabel}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-muted mb-5">You can only have one workout in progress at a time. Would you like to continue or start fresh?</p>
          <div className="space-y-2.5">
            <button
              onClick={handleGoToDraft}
              className="w-full px-4 py-2.5 btn-primary transition-colors"
            >
              Continue Previous Workout
            </button>
            
            <button
              onClick={onDiscard}
              className="w-full px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/15 rounded-lg font-medium hover:bg-red-500/15 transition-colors text-sm"
            >
              Discard &amp; Start New Workout
            </button>

            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 rounded-lg border border-white/[0.06] text-foreground text-sm hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
