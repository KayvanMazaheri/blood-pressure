interface StatCardProps {
  label: string
  value: string | number | null
  unit?: string
  colorClass?: string
}

export function StatCard({ label, value, unit, colorClass = '' }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${colorClass}`}>
        {value ?? '—'}
        {value != null && unit && (
          <span className="ml-0.5 text-sm font-normal text-muted-foreground">{unit}</span>
        )}
      </p>
    </div>
  )
}
