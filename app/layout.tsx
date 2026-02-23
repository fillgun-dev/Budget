import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '가계부',
  description: '다중 통화 가계부',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="h-full bg-slate-50 dark:bg-slate-900" suppressHydrationWarning>
      <body className={`${inter.className} h-full text-slate-900 dark:text-slate-100`}>
        <Header />
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}
