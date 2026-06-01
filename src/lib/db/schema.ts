import Dexie, { type Table } from 'dexie'

export interface EncryptedRecord {
  id: string
  encryptedData: string
}

class BPDatabase extends Dexie {
  readings!: Table<EncryptedRecord>
  settings!: Table<EncryptedRecord>

  constructor() {
    super('BloodPressureDB')
    this.version(1).stores({
      readings: 'id',
      settings: 'id',
    })
  }
}

export const db = new BPDatabase()
