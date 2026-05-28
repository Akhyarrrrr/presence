import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
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
        className={`${plusJakarta.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
        <Toaster position="bottom-right" theme="light" richColors />
      </body>
    </html>
  )
}
