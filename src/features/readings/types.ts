export interface Reading {
  id: string
  timestamp: number
  systolic: number
  diastolic: number
  pulse?: number
  source?: 'manual' | 'import'
}

export interface Settings {
  id: 'profile'
  units: { weight: 'kg' | 'lbs' }
  target: { systolic: number; diastolic: number }
  createdAt: number
}
