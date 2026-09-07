'use client'

import { type ReactNode } from 'react'
import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from 'framer-motion'
import { cn } from '@/lib/utils'

const entranceTransition = {
  duration: 0.52,
  ease: [0.22, 1, 0.36, 1],
} as const

export function MotionPage({
  children,
  className,
  routeKey,
}: Readonly<{
  children: ReactNode
  className?: string
  routeKey?: string
}>) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      key={routeKey}
      initial={shouldReduceMotion ? false : { opacity: 0.96, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={entranceTransition}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  ...props
}: HTMLMotionProps<'div'> & Readonly<{ delay?: number }>) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -20% 0px' }}
      transition={{ ...entranceTransition, delay }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function MotionEffects() {
  return null
}
