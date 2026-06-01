'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Settings } from '@/features/readings/types'

interface TargetFormProps {
  settings: Settings | null
  onSave: (target: { systolic: number; diastolic: number }) => Promise<void>
}

export function TargetForm({ settings, onSave }: TargetFormProps) {
  const [sys, setSys] = useState(String(settings?.target.systolic ?? 120))
  const [dia, setDia] = useState(String(settings?.target.diastolic ?? 80))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setSys(String(settings.target.systolic))
      setDia(String(settings.target.diastolic))
    }
  }, [settings])

  async function handleSave() {
    const s = Number(sys), d = Number(dia)
    if (isNaN(s) || isNaN(d) || s < 60 || s > 250 || d < 40 || d > 150) return
    setSaving(true)
    await onSave({ systolic: s, diastolic: d })
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Target Systolic</Label>
          <Input type="number" value={sys} onChange={(e) => setSys(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Target Diastolic</Label>
          <Input type="number" value={dia} onChange={(e) => setDia(e.target.value)} className="mt-1" />
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Saving…' : 'Save Targets'}
      </Button>
    </div>
  )
}
