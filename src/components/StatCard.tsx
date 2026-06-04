interface StatCardProps {
  label: string
  value: string | number | null
  unit?: string
  colorClass?: string
  trend?: 'up' | 'down' | 'stable'
  delta?: number
  neutralTrend?: boolean
}

export function StatCard({
  label,
  value,
  unit,
  colorClass = '',
  trend,
  delta,
  neutralTrend = false,
}: StatCardProps) {
  let trendColor = 'text-muted-foreground'
  if (!neutralTrend && trend === 'up') trendColor = 'text-destructive'
  else if (!neutralTrend && trend === 'down') trendColor = 'text-emerald-400'

  const trendSymbol = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'
  const trendText = trend === 'stable' || delta == null ? trendSymbol : `${trendSymbol} ${delta}`

  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${colorClass}`}>
        {value ?? '—'}
        {value != null && unit && (
          <span className="ml-0.5 text-sm font-normal text-muted-foreground">{unit}</span>
        )}
      </p>
      {trend != null && value != null && (
        <p className={`mt-0.5 text-xs ${trendColor}`}>{trendText}</p>
      )}
    </div>
  )
}
