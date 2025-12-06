import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Modisa Camera Trap',
  description: 'Wildlife monitoring for the Kalahari',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
