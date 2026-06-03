'use client'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isTelegram } from '@/lib/telegram/context'

interface EmptyStateProps {
  onAddReading: () => void
}

export function EmptyState({ onAddReading }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Heart className="h-12 w-12 text-muted-foreground/40" />
      <h2 className="mt-4 text-xl font-semibold">Track your blood pressure</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Add readings to see your chart, trends, and health status here. Your data stays on your
        device.
      </p>
      {!isTelegram() && (
        <Button className="mt-6" onClick={onAddReading}>
          Add first reading
        </Button>
      )}
    </div>
  )
}
