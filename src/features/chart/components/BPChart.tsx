'use client'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Customized,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { ChartPoint } from '../hooks/useChartData'
import { AHAZones } from './AHAZones'
import { PulsePressureBand } from './PulsePressureBand'
import { useChartData } from '../hooks/useChartData'
import { formatTimestamp } from '@/lib/utils/date'
import type { Reading, TimeRange } from '@/features/readings/types'

interface BPChartProps {
  readings: Reading[]
  range: TimeRange
  targetSystolic?: number
  targetDiastolic?: number
}

function CustomDot(props: { cx?: number; cy?: number; payload?: { isTrend?: boolean } }) {
  if (!props.cx || !props.cy || props.payload?.isTrend) return null
  return <circle cx={props.cx} cy={props.cy} r={4} fill="currentColor" stroke="none" />
}

export function BPChart({ readings, range: _range, targetSystolic, targetDiastolic }: BPChartProps) {
  const { data, domain } = useChartData(readings)

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed">
        <p className="text-sm text-muted-foreground">No readings in this range</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 48, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />

        <XAxis
          dataKey="timestamp"
          tickFormatter={(v: number) => formatTimestamp(v, 'short')}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[domain.yMin, domain.yMax]}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={36}
        />

        <AHAZones yMin={domain.yMin} yMax={domain.yMax} />

        <Customized
          component={(props: object) => (
            <PulsePressureBand
              {...(props as Parameters<typeof PulsePressureBand>[0])}
              data={data}
            />
          )}
        />

        {targetSystolic != null && (
          <ReferenceLine
            y={targetSystolic}
            stroke="#a78bfa"
            strokeDasharray="6 4"
            strokeWidth={1.5}
          />
        )}
        {targetDiastolic != null && (
          <ReferenceLine
            y={targetDiastolic}
            stroke="#a78bfa"
            strokeDasharray="6 4"
            strokeWidth={1}
            opacity={0.7}
          />
        )}

        <Line
          dataKey="systolic"
          stroke="#f87171"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 5 }}
          connectNulls
        />
        <Line
          dataKey="diastolic"
          stroke="#60a5fa"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 5 }}
          connectNulls
        />

        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as ChartPoint
            const sys = d.systolic
            const dia = d.diastolic
            const zone =
              sys == null
                ? ''
                : sys >= 140
                  ? 'Stage 2'
                  : sys >= 130
                    ? 'Stage 1'
                    : sys >= 120
                      ? 'Elevated'
                      : 'Normal'
            return (
              <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                <p className="font-medium">{formatTimestamp(d.timestamp, 'long')}</p>
                {sys != null && <p className="text-red-400">{sys} mmHg sys</p>}
                {dia != null && <p className="text-blue-400">{dia} mmHg dia</p>}
                {zone && (
                  <p className="text-muted-foreground">{d.isTrend ? 'Projected' : zone}</p>
                )}
              </div>
            )
          }}
        />

        <Legend
          iconType="line"
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value) => (value === 'systolic' ? 'Systolic' : 'Diastolic')}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
