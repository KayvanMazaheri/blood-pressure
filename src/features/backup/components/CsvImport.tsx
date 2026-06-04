'use client'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { parseCSV } from '@/lib/utils/csv'
import { dbAddReading } from '@/lib/db/readings'

interface CsvImportProps {
  onImported: () => void
}

export function CsvImport({ onImported }: CsvImportProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const text = await file.text()
      const { readings, errors } = parseCSV(text)
      await Promise.all(readings.map((r) => dbAddReading(r)))
      setResult({ imported: readings.length, errors })
      if (readings.length > 0) onImported()
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      <Button
        variant="outline"
        className="w-full"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? 'Importing…' : 'Import CSV'}
      </Button>
      {result && (
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium text-emerald-500">{result.imported} readings imported</p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.errors.map((e, i) => (
                <li key={i} className="text-destructive">
                  {e}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
