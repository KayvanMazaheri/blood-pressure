import { classifyBP, ahaLabel, ahaColor } from '@/lib/utils/aha'
import { VALIDATION } from '@/features/readings/types'

interface AHABadgeProps {
  systolic: string
  diastolic: string
}

function isValid(val: string, min: number, max: number): boolean {
  const n = Number(val)
  return val !== '' && !isNaN(n) && n >= min && n <= max
}

export function AHABadge({ systolic, diastolic }: AHABadgeProps) {
  const sysValid = isValid(systolic, VALIDATION.systolic.min, VALIDATION.systolic.max)
  const diaValid = isValid(diastolic, VALIDATION.diastolic.min, VALIDATION.diastolic.max)

  if (!sysValid || !diaValid) return null

  const cls = classifyBP(Number(systolic), Number(diastolic))
  const color = ahaColor(cls)

  return (
    <div className="flex justify-center">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
        style={{ backgroundColor: `${color}26`, color }}
        aria-live="polite"
        aria-label={`Blood pressure classification: ${ahaLabel(cls)}`}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {ahaLabel(cls)}
      </span>
    </div>
  )
}
