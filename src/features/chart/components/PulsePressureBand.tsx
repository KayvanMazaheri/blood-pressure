'use client'

interface DataPoint {
  timestamp: number
  systolic?: number
  diastolic?: number
  isTrend?: boolean
}

// Receives Recharts internal props via the <Customized> component
interface PulsePressureBandProps {
  xAxisMap?: Record<string, { scale: (v: number) => number; width: number; left: number }>
  yAxisMap?: Record<string, { scale: (v: number) => number }>
  data?: DataPoint[]
}

function getCSSVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

export function PulsePressureBand({ xAxisMap, yAxisMap, data }: PulsePressureBandProps) {
  if (!xAxisMap || !yAxisMap || !data) return null
  const systolicColor = getCSSVar('--bp-systolic', '#f87171')
  const diastolicColor = getCSSVar('--bp-diastolic', '#60a5fa')

  const xAxis = Object.values(xAxisMap)[0]
  const yAxis = Object.values(yAxisMap)[0]
  if (!xAxis || !yAxis) return null

  const realPoints = data.filter((d) => !d.isTrend && d.systolic != null && d.diastolic != null)
  if (realPoints.length < 2) return null

  const topCoords = realPoints.map((d) => `${xAxis.scale(d.timestamp)},${yAxis.scale(d.systolic!)}`)
  const botCoords = [...realPoints]
    .reverse()
    .map((d) => `${xAxis.scale(d.timestamp)},${yAxis.scale(d.diastolic!)}`)

  const points = [...topCoords, ...botCoords].join(' ')

  return (
    <g>
      <defs>
        <linearGradient id="ppGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={systolicColor} stopOpacity={0.3} />
          <stop offset="100%" stopColor={diastolicColor} stopOpacity={0.2} />
        </linearGradient>
      </defs>
      <polygon points={points} fill="url(#ppGrad)" />
    </g>
  )
}
