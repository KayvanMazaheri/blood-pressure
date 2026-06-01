'use client'
import { Button } from '@/components/ui/button'

interface UnitToggleProps {
  value: 'kg' | 'lbs'
  onChange: (unit: 'kg' | 'lbs') => void
}

export function UnitToggle({ value, onChange }: UnitToggleProps) {
  return (
    <div className="flex gap-2">
      {(['kg', 'lbs'] as const).map((u) => (
        <Button
          key={u}
          variant={value === u ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(u)}
        >
          {u}
        </Button>
      ))}
    </div>
  )
}
