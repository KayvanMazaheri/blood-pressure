// src/components/shells/BottomNav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ClipboardList, Settings } from 'lucide-react'
import { haptic } from '@/lib/telegram/haptics'

const TABS = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/history', icon: ClipboardList, label: 'History' },
  { href: '/settings', icon: Settings, label: 'Settings' },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background"
      style={{ paddingBottom: 'var(--tg-safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex">
        {TABS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors"
              style={{ color: isActive ? 'var(--primary)' : 'var(--muted-foreground)' }}
              onClick={() => haptic('selection')}
              aria-label={label}
            >
              <span className="mb-0.5 flex h-1 w-full justify-center">
                {isActive && <span className="h-1 w-1 rounded-full bg-primary" />}
              </span>
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
