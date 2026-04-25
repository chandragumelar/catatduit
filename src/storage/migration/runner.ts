// =============================================================================
// storage/migration/runner.ts
// Jalankan runMigrations() di App.tsx sebelum render apapun.
// Setiap migration harus idempotent (aman dijalankan berkali-kali).
// =============================================================================

import { getData, setData } from '../storage.base'
import { STORAGE_KEYS, CURRENT_SCHEMA_VERSION } from '@/constants'
import { migrateV3 } from './migration.v3'
import { migrateV4 } from './migration.v4'
import { migrateV5 } from './migration.v5'
import { migrateV6 } from './migration.v6'

const MIGRATIONS: Array<{ version: number; run: () => void }> = [
  { version: 3, run: migrateV3 },
  { version: 4, run: migrateV4 },
  { version: 5, run: migrateV5 },
  { version: 6, run: migrateV6 },
]

export function runMigrations(): void {
  const current = getData<number>(STORAGE_KEYS.SCHEMA_VERSION, 0)

  if (current >= CURRENT_SCHEMA_VERSION) return

  for (const migration of MIGRATIONS) {
    if (migration.version > current) {
      migration.run()
    }
  }

  setData(STORAGE_KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION)
}
