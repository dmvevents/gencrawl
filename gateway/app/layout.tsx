import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'GenCrawl Ingestion Gateway',
  description: 'Document ingestion and IDP control center',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="gc-body">
        <main className="min-h-screen px-6 py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </body>
    </html>
  )
}
