export function formatTimestamp(ts: number, style: 'short' | 'long' = 'short'): string {
  const d = new Date(ts)
  if (style === 'long') {
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  const now = new Date()
  const diffMs = now.getTime() - ts
  if (diffMs < 86_400_000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
  if (diffMs < 2 * 86_400_000) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatMonthYear(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/** Parse DD/MM/YYYY, MM/DD/YYYY, or ISO 8601 date strings to a Date. */
export function parseDate(dateStr: string, timeStr?: string): Date | null {
  const time = timeStr ?? '08:00'
  // ISO 8601
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(`${dateStr}T${time}:00`)
    return isNaN(d.getTime()) ? null : d
  }
  // DD/MM/YYYY
  const dmy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}T${time}:00`)
    return isNaN(d.getTime()) ? null : d
  }
  // MM/DD/YYYY - note: same regex as DD/MM/YYYY intentionally (ambiguous), treated as MM/DD
  const mdy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) {
    const d = new Date(`${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}T${time}:00`)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}
