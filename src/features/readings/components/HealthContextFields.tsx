'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Reading } from '@/features/readings/types'

type ContextFields = Omit<
  Reading,
  'id' | 'timestamp' | 'systolic' | 'diastolic' | 'pulse' | 'source'
>

interface HealthContextFieldsProps {
  value: ContextFields
  onChange: (fields: ContextFields) => void
}

export function HealthContextFields({ value, onChange }: HealthContextFieldsProps) {
  const [open, setOpen] = useState(false)

  function set<K extends keyof ContextFields>(key: K, val: ContextFields[K]) {
    onChange({ ...value, [key]: val })
  }

  const filledCount = (Object.values(value) as unknown[]).filter((v) => v != null).length
  const toggleLabel =
    filledCount > 0
      ? `Health context · ${filledCount} field${filledCount !== 1 ? 's' : ''}`
      : 'Add health context'

  return (
    <div>
      <button
        type="button"
        className="flex min-h-[44px] w-full items-center justify-between rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={toggleLabel}
      >
        <span>{toggleLabel}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform motion-safe:duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="mt-3 grid gap-4">
          {/* Arm */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Arm used</Label>
              <Select
                value={value.armUsed ?? null}
                onValueChange={(v) => set('armUsed', (v as 'left' | 'right') || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Body position</Label>
              <Select
                value={value.bodyPosition ?? null}
                onValueChange={(v) =>
                  set('bodyPosition', (v as Reading['bodyPosition']) || undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sitting">Sitting</SelectItem>
                  <SelectItem value="standing">Standing</SelectItem>
                  <SelectItem value="lying">Lying</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stress */}
          <div>
            <Label className="text-xs">Stress level</Label>
            <div className="mt-1 flex gap-2">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set('stressLevel', value.stressLevel === n ? undefined : n)}
                  className={`h-9 w-9 rounded-full border text-sm font-medium transition-colors
                    ${
                      value.stressLevel === n
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-muted'
                    }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Sleep */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Sleep (hours)</Label>
              <Input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={value.sleepHours ?? ''}
                onChange={(e) =>
                  set('sleepHours', e.target.value ? Number(e.target.value) : undefined)
                }
              />
            </div>
            <div>
              <Label className="text-xs">Sleep quality</Label>
              <Select
                value={value.sleepQuality ?? null}
                onValueChange={(v) =>
                  set('sleepQuality', (v as Reading['sleepQuality']) || undefined)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Activity */}
          <div>
            <Label className="text-xs">Physical activity today</Label>
            <Select
              value={value.activityLevel ?? null}
              onValueChange={(v) =>
                set('activityLevel', (v as Reading['activityLevel']) || undefined)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="intense">Intense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Caffeine / Alcohol */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Caffeine (cups)</Label>
              <Input
                type="number"
                min={0}
                max={20}
                value={value.caffeineCount ?? ''}
                onChange={(e) =>
                  set('caffeineCount', e.target.value ? Number(e.target.value) : undefined)
                }
              />
            </div>
            <div>
              <Label className="text-xs">Alcohol (drinks/24h)</Label>
              <Input
                type="number"
                min={0}
                max={20}
                value={value.alcoholDrinks ?? ''}
                onChange={(e) =>
                  set('alcoholDrinks', e.target.value ? Number(e.target.value) : undefined)
                }
              />
            </div>
          </div>

          {/* Sodium */}
          <div>
            <Label className="text-xs">Sodium intake</Label>
            <Select
              value={value.sodiumIntake ?? null}
              onValueChange={(v) =>
                set('sodiumIntake', (v as Reading['sodiumIntake']) || undefined)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Medication / Weight */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Medication taken</Label>
              <div className="mt-1 flex gap-2">
                {(['Yes', 'No'] as const).map((opt) => {
                  const boolVal = opt === 'Yes'
                  const active = value.medicationTaken === boolVal
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => set('medicationTaken', active ? undefined : boolVal)}
                      className={`flex-1 rounded border py-2 text-sm transition-colors
                        ${active ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs">Weight (kg)</Label>
              <Input
                type="number"
                min={20}
                max={300}
                step={0.1}
                value={value.weightKg ?? ''}
                onChange={(e) =>
                  set('weightKg', e.target.value ? Number(e.target.value) : undefined)
                }
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Notes</Label>
            <textarea
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={2}
              placeholder="e.g. felt dizzy, measured after rest"
              value={value.notes ?? ''}
              onChange={(e) => set('notes', e.target.value || undefined)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
