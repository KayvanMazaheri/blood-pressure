'use client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageHeaderProps {
  title: string
  backHref?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, backHref, actions }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
      {backHref && (
        <Link href={backHref}>
          <Button variant="ghost" size="icon" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
      )}
      <h1 className="flex-1 text-lg font-semibold">{title}</h1>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </header>
  )
}
