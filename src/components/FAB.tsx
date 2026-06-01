'use client'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FABProps {
  onClick: () => void
  label?: string
}

export function FAB({ onClick, label = 'Add reading' }: FABProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg shadow-primary/30 z-40"
      aria-label={label}
    >
      <Plus className="h-6 w-6" />
    </Button>
  )
}
