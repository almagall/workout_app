'use client'

import { motion, useInView, useSpring, useMotionValue, useTransform } from 'framer-motion'
import { useRef, useEffect, ReactNode } from 'react'

const EASE_PREMIUM = [0.25, 0.1, 0.25, 1] as const

export function FadeIn({
  children,
  delay = 0,
  duration = 0.5,
  className = '',
}: {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: EASE_PREMIUM }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function FadeInWhenVisible({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.6, delay, ease: EASE_PREMIUM }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerChildren({
  children,
  staggerDelay = 0.07,
  className = '',
}: {
  children: ReactNode
  staggerDelay?: number
  className?: string
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_PREMIUM } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedNumber({
  value,
  duration = 1,
  className = '',
  formatFn,
}: {
  value: number
  duration?: number
  className?: string
  formatFn?: (v: number) => string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, { duration: duration * 1000 })
  const display = useTransform(springValue, (v: number) =>
    formatFn ? formatFn(Math.round(v)) : Math.round(v).toString()
  )

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  useEffect(() => {
    const unsubscribe = display.on('change', (v: string) => {
      if (ref.current) ref.current.textContent = v
    })
    return unsubscribe
  }, [display])

  return <span ref={ref} className={className} />
}

export function ScaleOnTap({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15, ease: EASE_PREMIUM }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export { motion }
