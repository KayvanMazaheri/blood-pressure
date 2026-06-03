'use client'
import Link from 'next/link'
import { classifyBP, ahaLabel, ahaMessage, ahaColor } from '@/lib/utils/aha'

interface HealthStatusHeroProps {
  avgSystolic: number
  avgDiastolic: number
  count: number
  trend?: 'up' | 'down' | 'stable'
}

export function HealthStatusHero({
  avgSystolic,
  avgDiastolic,
  count,
  trend,
}: HealthStatusHeroProps) {
  const sys = Math.round(avgSystolic)
  const dia = Math.round(avgDiastolic)
  const cls = classifyBP(sys, dia)
  const color = ahaColor(cls)

  const trendLabel = trend === 'up' ? '↑ Rising' : trend === 'down' ? '↓ Improving' : '→ Stable'

  const trendColor =
    trend === 'up'
      ? 'text-rose-400'
      : trend === 'down'
        ? 'text-emerald-400'
        : 'text-muted-foreground'

  return (
    <Link
      href="/history"
      className="block rounded-2xl overflow-hidden"
      style={{ borderLeft: `4px solid ${color}`, backgroundColor: `${color}1f` }}
      aria-label="View blood pressure history"
    >
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold tracking-widest" style={{ color }}>
              {ahaLabel(cls)}
            </p>
            <p className="mt-0.5 text-base font-semibold text-foreground">{ahaMessage(cls)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Avg {sys}/{dia} · Based on last {count} reading{count !== 1 ? 's' : ''}
            </p>
          </div>
          {trend != null && (
            <span className={`mt-0.5 shrink-0 text-xs font-medium ${trendColor}`}>
              {trendLabel}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
