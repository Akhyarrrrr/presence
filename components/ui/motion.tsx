'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
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
  const pathname = usePathname()
  const shouldReduceMotion = useReducedMotion()
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const smoothX = useSpring(x, { stiffness: 680, damping: 48, mass: 0.45 })
  const smoothY = useSpring(y, { stiffness: 680, damping: 48, mass: 0.45 })
  const [enabled, setEnabled] = useState(false)
  const [visible, setVisible] = useState(false)
  const [interactive, setInteractive] = useState(false)
  const interactiveRef = useRef(false)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const root = document.documentElement

    if (shouldReduceMotion || !('IntersectionObserver' in window)) {
      root.removeAttribute('data-scroll-reveal')
      return
    }

    const selector = '.reveal-up, .reveal-left, .reveal-right, .reveal-scale'
    const observedElements = new WeakSet<Element>()
    const pendingElements = new Set<Element>()
    let revealFrame: number | null = null

    function revealElement(element: Element) {
      element.setAttribute('data-scroll-visible', 'true')
      pendingElements.delete(element)
      revealObserver.unobserve(element)
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          revealElement(entry.target)
        })
      },
      { rootMargin: '0px 0px -20% 0px', threshold: 0.08 }
    )

    function observeElement(element: Element) {
      if (observedElements.has(element)) return
      observedElements.add(element)

      if (element.getBoundingClientRect().top <= window.innerHeight * 0.82) {
        element.setAttribute('data-scroll-visible', 'true')
        return
      }

      pendingElements.add(element)
      revealObserver.observe(element)
    }

    function scanForRevealElements(scope: ParentNode = document) {
      if (scope instanceof Element && scope.matches(selector)) observeElement(scope)
      scope.querySelectorAll(selector).forEach(observeElement)
    }

    function revealVisibleElements() {
      revealFrame = null
      pendingElements.forEach((element) => {
        const rect = element.getBoundingClientRect()
        if (rect.top <= window.innerHeight * 0.82 && rect.bottom >= 0) revealElement(element)
      })
    }

    function scheduleRevealCheck() {
      if (revealFrame !== null) return
      revealFrame = requestAnimationFrame(revealVisibleElements)
    }

    scanForRevealElements()
    root.setAttribute('data-scroll-reveal', 'ready')
    scheduleRevealCheck()

    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) scanForRevealElements(node)
        })
      })
      scheduleRevealCheck()
    })
    mutationObserver.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('scroll', scheduleRevealCheck, { passive: true })
    window.addEventListener('resize', scheduleRevealCheck)

    return () => {
      if (revealFrame !== null) cancelAnimationFrame(revealFrame)
      mutationObserver.disconnect()
      revealObserver.disconnect()
      window.removeEventListener('scroll', scheduleRevealCheck)
      window.removeEventListener('resize', scheduleRevealCheck)
      root.removeAttribute('data-scroll-reveal')
    }
  }, [pathname, shouldReduceMotion])

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)')

    function syncEnabled() {
      setEnabled(finePointer.matches && !shouldReduceMotion)
    }

    function updatePointer(event: PointerEvent) {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)

      frameRef.current = requestAnimationFrame(() => {
        x.set(event.clientX)
        y.set(event.clientY)
        setVisible(true)

        const target = event.target instanceof HTMLElement ? event.target : null
        const nextInteractive = Boolean(
          target?.closest('a, button, input, select, textarea, [data-cursor="interactive"]')
        )

        if (nextInteractive !== interactiveRef.current) {
          interactiveRef.current = nextInteractive
          setInteractive(nextInteractive)
        }
      })
    }

    function hidePointer() {
      setVisible(false)
    }

    syncEnabled()
    finePointer.addEventListener('change', syncEnabled)
    window.addEventListener('pointermove', updatePointer, { passive: true })
    document.documentElement.addEventListener('mouseleave', hidePointer)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      finePointer.removeEventListener('change', syncEnabled)
      window.removeEventListener('pointermove', updatePointer)
      document.documentElement.removeEventListener('mouseleave', hidePointer)
    }
  }, [shouldReduceMotion, x, y])

  if (!enabled) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[120] hidden md:block">
      <motion.span
        className="absolute left-0 top-0 h-8 w-8 rounded-full border border-[var(--presence-action)]/45 bg-[var(--presence-action)]/[0.035]"
        style={{ x: smoothX, y: smoothY, marginLeft: -16, marginTop: -16 }}
        animate={{
          opacity: visible ? 1 : 0,
          scale: interactive ? 1.65 : 1,
        }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.span
        className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-[var(--presence-accent)]"
        style={{ x, y, marginLeft: -3, marginTop: -3 }}
        animate={{ opacity: visible ? 0.92 : 0 }}
        transition={{ duration: 0.16 }}
      />
    </div>
  )
}
