'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BottomSheet } from '@/components/BottomSheet'
import { HealthContextFields } from './HealthContextFields'
import { VALIDATION } from '@/features/readings/types'
import type { Reading } from '@/features/readings/types'

type NewReadingData = Omit<Reading, 'id' | 'source'>

interface ReadingFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: NewReadingData) => Promise<void>
}

type Errors = Partial<Record<'systolic' | 'diastolic' | 'pulse', string>>

type ContextFields = Omit<NewReadingData, 'timestamp' | 'systolic' | 'diastolic' | 'pulse'>

export function ReadingForm({ open, onOpenChange, onSave }: ReadingFormProps) {
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [pulse, setPulse] = useState('')
  const [timestamp, setTimestamp] = useState<number>(0)
  const [editingTime, setEditingTime] = useState(false)
  const [context, setContext] = useState<ContextFields>({})
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimestamp(Date.now())
  }, [])

  function validate(): Errors {
    const e: Errors = {}
    const sys = Number(systolic)
    const dia = Number(diastolic)
    const pul = pulse ? Number(pulse) : null
    if (!systolic || sys < VALIDATION.systolic.min || sys > VALIDATION.systolic.max)
      e.systolic = `Must be ${VALIDATION.systolic.min}–${VALIDATION.systolic.max}`
    if (!diastolic || dia < VALIDATION.diastolic.min || dia > VALIDATION.diastolic.max)
      e.diastolic = `Must be ${VALIDATION.diastolic.min}–${VALIDATION.diastolic.max}`
    if (pul !== null && (pul < VALIDATION.pulse.min || pul > VALIDATION.pulse.max))
      e.pulse = `Must be ${VALIDATION.pulse.min}–${VALIDATION.pulse.max}`
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }
    setSaving(true)
    try {
      await onSave({
        timestamp,
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        pulse: pulse ? Number(pulse) : undefined,
        ...context,
      })
      // reset
      setSystolic('')
      setDiastolic('')
      setPulse('')
      setTimestamp(Date.now())
      setContext({})
      setErrors({})
      setEditingTime(false)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const nowLabel = new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const fields: Array<{
    label: string
    value: string
    set: (v: string) => void
    error: string | undefined
    color: string
    autoFocus: boolean
  }> = [
    {
      label: 'Systolic',
      value: systolic,
      set: setSystolic,
      error: errors.systolic,
      color: 'text-red-400',
      autoFocus: true,
    },
    {
      label: 'Diastolic',
      value: diastolic,
      set: setDiastolic,
      error: errors.diastolic,
      color: 'text-blue-400',
      autoFocus: false,
    },
    {
      label: 'Pulse',
      value: pulse,
      set: setPulse,
      error: errors.pulse,
      color: '',
      autoFocus: false,
    },
  ]

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="New Reading">
      <div className="grid gap-4 pb-4">
        {/* Primary fields */}
        <div className="grid grid-cols-3 gap-3">
          {fields.map(({ label, value, set, error, color, autoFocus }) => (
            <div key={label}>
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={value}
                onChange={(e) => {
                  set(e.target.value)
                  setErrors((prev) => ({ ...prev, [label.toLowerCase()]: undefined }))
                }}
                className={`mt-1 text-center text-2xl font-bold tabular-nums ${color} ${error ? 'border-destructive' : ''}`}
                placeholder="—"
                autoFocus={autoFocus}
              />
              {error && <p className="mt-0.5 text-xs text-destructive">{error}</p>}
            </div>
          ))}
        </div>

        {/* Timestamp */}
        <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
          {editingTime ? (
            <input
              type="datetime-local"
              className="flex-1 bg-transparent text-sm outline-none"
              defaultValue={new Date(timestamp).toISOString().slice(0, 16)}
              onChange={(e) => e.target.value && setTimestamp(new Date(e.target.value).getTime())}
            />
          ) : (
            <span className="text-muted-foreground">📅 {nowLabel}</span>
          )}
          <button
            type="button"
            className="ml-2 text-xs text-primary underline"
            onClick={() => setEditingTime((v) => !v)}
          >
            {editingTime ? 'Done' : 'Edit'}
          </button>
        </div>

        <HealthContextFields value={context} onChange={setContext} />

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving…' : 'Save Reading'}
        </Button>
      </div>
    </BottomSheet>
  )
}
