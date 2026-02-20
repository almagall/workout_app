'use client'

import { useCallback } from 'react'
import { toPng, toBlob } from 'html-to-image'
import type { WorkoutSummary } from '@/app/api/share/workout/[sessionId]/route'

interface WorkoutShareCardProps {
  summary: WorkoutSummary
  /** When provided, download/share use a screenshot of this element so the export matches the workout summary UI. */
  contentRef?: React.RefObject<HTMLDivElement | null>
}

function formatVolume(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toLocaleString()
}

function formatDuration(seconds: number): string {
  const totalMins = Math.floor(seconds / 60)
  if (totalMins < 60) return `${totalMins}m`
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return m > 0 ? `${h}hr ${m}m` : `${h}hr`
}

const EXPORT_OPTIONS = {
  backgroundColor: '#0a0a0b',
  pixelRatio: 2,
  cacheBust: true,
}

export default function WorkoutShareCard({ summary, contentRef }: WorkoutShareCardProps) {
  const getImageDataUrl = useCallback(async (): Promise<string | null> => {
    if (contentRef?.current) {
      try {
        return await toPng(contentRef.current, EXPORT_OPTIONS)
      } catch {
        return null
      }
    }
    return null
  }, [contentRef])

  const getImageBlob = useCallback(async (): Promise<Blob | null> => {
    if (contentRef?.current) {
      try {
        return await toBlob(contentRef.current, { ...EXPORT_OPTIONS, type: 'image/png' })
      } catch {
        return null
      }
    }
    return null
  }, [contentRef])

  const handleDownload = async () => {
    const dataUrl = await getImageDataUrl()
    if (!dataUrl) return

    const link = document.createElement('a')
    link.download = `workout_${summary.day_label.replace(/\s/g, '_')}_${summary.workout_date}.png`
    link.href = dataUrl
    link.click()
  }

  const handleShare = async () => {
    const blob = await getImageBlob()
    if (!blob) return

    const file = new File([blob], 'workout.png', { type: 'image/png' })

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: `${summary.day_label} - ${summary.template_name}`,
          text: `Check out my workout: ${summary.exercises.length} exercises, ${summary.total_sets} sets, ${formatVolume(summary.total_volume)} lbs volume`,
          files: [file],
        })
      } catch { /* cancelled */ }
    } else {
      handleDownload()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={handleDownload} className="flex-1 py-2.5 px-4 rounded-lg border border-white/[0.08] text-foreground text-sm hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Download Card
        </button>
        <button onClick={handleShare} className="flex-1 py-2.5 px-4 btn-primary rounded-lg text-sm flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          Share
        </button>
      </div>
    </div>
  )
}
