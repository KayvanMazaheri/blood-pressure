export type AHAClass = 'normal' | 'elevated' | 'stage1' | 'stage2'

export function classifyBP(systolic: number, diastolic: number): AHAClass {
  if (systolic >= 140 || diastolic >= 90) return 'stage2'
  if (systolic >= 130 || diastolic >= 80) return 'stage1'
  if (systolic >= 120) return 'elevated'
  return 'normal'
}

export function ahaLabel(cls: AHAClass): string {
  switch (cls) {
    case 'normal': return 'NORMAL'
    case 'elevated': return 'ELEVATED'
    case 'stage1': return 'HYPERTENSION · STAGE 1'
    case 'stage2': return 'HYPERTENSION · STAGE 2'
  }
}

export function ahaMessage(cls: AHAClass): string {
  switch (cls) {
    case 'normal': return 'Your pressure looks great'
    case 'elevated': return 'Worth keeping an eye on'
    case 'stage1': return 'Consider talking to your doctor'
    case 'stage2': return 'Please consult your doctor'
  }
}

export function ahaColor(cls: AHAClass): string {
  switch (cls) {
    case 'normal': return '#34d399'
    case 'elevated': return '#fbbf24'
    case 'stage1': return '#f97316'
    case 'stage2': return '#fb7185'
  }
}
