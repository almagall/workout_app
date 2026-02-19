'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { playTimerCompleteSound } from '@/lib/audio-utils'

interface RestTimerProps {
  initialSeconds?: number
  onDismiss: () => void
  onComplete?: () => void
  autoStart?: boolean
}

const PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
]

export default function RestTimer({
  initialSeconds = 90,
  onDismiss,
  onComplete,
  autoStart = true,
}: RestTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds)
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(autoStart)
  const [isComplete, setIsComplete] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate progress percentage (0 to 100)
  const progress = totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 0

  // Timer logic
  useEffect(() => {
    if (isRunning && secondsRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            setIsComplete(true)
            playTimerCompleteSound()
            onComplete?.()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, secondsRemaining, onComplete])

  const handleStart = useCallback(() => {
    if (secondsRemaining === 0) {
      setSecondsRemaining(totalSeconds)
      setIsComplete(false)
    }
    setIsRunning(true)
  }, [secondsRemaining, totalSeconds])

  const handlePause = useCallback(() => {
    setIsRunning(false)
  }, [])

  const handleReset = useCallback(() => {
    setIsRunning(false)
    setSecondsRemaining(totalSeconds)
    setIsComplete(false)
  }, [totalSeconds])

  const handlePreset = useCallback((seconds: number) => {
    setTotalSeconds(seconds)
    setSecondsRemaining(seconds)
    setIsRunning(true)
    setIsComplete(false)
  }, [])

  // SVG circle parameters
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div
      className={`bg-white/[0.04] border border-white/[0.06] rounded-xl shadow-card p-4 transition-all ${
        isComplete
          ? 'border-green-500 shadow-lg shadow-green-500/20 animate-pulse'
          : 'border-border'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted uppercase tracking-wide">Rest Timer</h3>
        <button
          onClick={onDismiss}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors"
          aria-label="Dismiss timer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Timer Display */}
      <div className="flex justify-center mb-4">
        <div className="relative w-32 h-32">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke={isComplete ? '#22c55e' : '#f59e0b'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          {/* Time text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`text-3xl font-bold ${
                isComplete ? 'text-green-400' : secondsRemaining <= 10 ? 'text-amber-400' : 'text-foreground'
              }`}
            >
              {formatTime(secondsRemaining)}
            </span>
          </div>
        </div>
      </div>

      {/* Complete message */}
      {isComplete && (
        <div className="text-center mb-3">
          <p className="text-green-400 font-medium">Rest complete! Ready for next set.</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center gap-2 mb-4">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 transition-colors font-medium text-sm flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            {secondsRemaining === 0 ? 'Restart' : 'Start'}
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-500 transition-colors font-medium text-sm flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Pause
          </button>
        )}
        <button
          onClick={handleReset}
          className="px-4 py-2 btn-primary text-sm flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset
        </button>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap justify-center gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.seconds}
            onClick={() => handlePreset(preset.seconds)}
            className={`min-h-[44px] px-4 py-2.5 rounded text-xs sm:text-sm font-medium transition-colors ${
              totalSeconds === preset.seconds && !isComplete
                ? 'bg-amber-500 text-black'
                : 'bg-white/[0.04] text-muted hover:bg-white/[0.04] hover:text-foreground'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )
}
