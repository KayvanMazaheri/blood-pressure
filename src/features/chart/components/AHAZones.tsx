import { ReferenceArea, ReferenceLine } from 'recharts'

interface AHAZonesProps {
  yMin: number
  yMax: number
}

export function AHAZones({ yMin, yMax }: AHAZonesProps) {
  return (
    <>
      {/* Stage 2: ≥ 140 */}
      <ReferenceArea y1={140} y2={yMax} fill="rgba(239,68,68,0.08)" ifOverflow="extendDomain" />
      {/* Stage 1: 130–139 */}
      <ReferenceArea y1={130} y2={140} fill="rgba(251,146,60,0.07)" />
      {/* Elevated: 120–129 */}
      <ReferenceArea y1={120} y2={130} fill="rgba(250,204,21,0.06)" />
      {/* Normal: below 120 */}
      <ReferenceArea y1={yMin} y2={120} fill="rgba(34,197,94,0.05)" />
      {/* Diastolic threshold tick marks */}
      <ReferenceLine y={90} stroke="rgba(255,255,255,0.1)" strokeDasharray="2 4" />
      <ReferenceLine y={80} stroke="rgba(255,255,255,0.1)" strokeDasharray="2 4" />
    </>
  )
}
