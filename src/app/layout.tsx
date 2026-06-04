// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { ShellProvider } from '@/components/shells/ShellProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'Blood Pressure Tracker',
  description: 'Private, local-first blood pressure tracking',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0f0f0f' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Runs synchronously before first paint. Telegram injects window.Telegram
            natively before any JS, so colorScheme is readable here.
            suppressHydrationWarning on <html> prevents React from undoing these. */}
        <Script id="tg-theme-init" strategy="beforeInteractive">{`
          (function(){try{
            var twa=window.Telegram&&window.Telegram.WebApp;
            if(twa&&typeof twa.colorScheme==='string'){
              var h=document.documentElement;
              h.dataset.shell='telegram';
              h.classList.remove('dark');
              h.dataset.colorScheme=twa.colorScheme;
            }
          }catch(e){}}())
        `}</Script>
      </head>
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
        <ShellProvider>{children}</ShellProvider>
        <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
      </body>
    </html>
  )
}
