import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Presence', template: '%s - Presence' },
  description: 'Smart attendance system powered by face recognition',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} bg-gray-950 font-sans text-gray-100 antialiased`}
      >
        {children}
        <Toaster position="bottom-right" theme="dark" richColors />
      </body>
    </html>
  )
}
