/**
 * Audio utilities for workout app notifications
 */

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (e) {
      console.warn('Web Audio API not supported:', e)
      return null
    }
  }
  return audioContext
}

/**
 * Play a beep sound using Web Audio API
 * @param frequency - Frequency in Hz (default 800)
 * @param duration - Duration in milliseconds (default 200)
 * @param volume - Volume from 0 to 1 (default 0.5)
 */
export function playBeep(
  frequency: number = 800,
  duration: number = 200,
  volume: number = 0.5
): void {
  const ctx = getAudioContext()
  if (!ctx) return

  // Resume context if suspended (required for autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume()
  }

  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.frequency.value = frequency
  oscillator.type = 'sine'

  // Set volume
  gainNode.gain.value = volume

  // Fade out to avoid click
  const now = ctx.currentTime
  gainNode.gain.setValueAtTime(volume, now)
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration / 1000)

  oscillator.start(now)
  oscillator.stop(now + duration / 1000)
}

/** One cycle of the timer completion chime (3 ascending beeps). */
function playTimerCompleteChime(): void {
  playBeep(600, 150, 0.4)
  setTimeout(() => playBeep(800, 150, 0.5), 200)
  setTimeout(() => playBeep(1000, 200, 0.6), 400)
}

/**
 * Play the timer completion sound 3 times consecutively
 * Creates a very noticeable alert pattern
 */
export function playTimerCompleteSound(): void {
  playTimerCompleteChime()
  setTimeout(() => playTimerCompleteChime(), 800)
  setTimeout(() => playTimerCompleteChime(), 1600)
}

/**
 * Play a single click sound for UI feedback
 */
export function playClickSound(): void {
  playBeep(1200, 50, 0.2)
}
