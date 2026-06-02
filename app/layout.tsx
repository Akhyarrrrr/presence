import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import { Manrope, Newsreader } from 'next/font/google'
import { Toaster } from 'sonner'
import { MotionEffects } from '@/components/ui/motion'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'Presence', template: '%s - Presence' },
  description: 'Identity-first attendance operations powered by browser face recognition',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${newsreader.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
        <MotionEffects />
        <Toaster position="bottom-right" theme="light" richColors />
      </body>
    </html>
  )
}
