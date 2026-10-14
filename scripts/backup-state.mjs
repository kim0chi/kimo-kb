import Database from 'better-sqlite3'
import { chmodSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const source = resolve(process.env.KB_STATE_DB || 'data/kb.sqlite')
const target = process.argv[2] ? resolve(process.argv[2]) : ''
if (!target) {
  console.error('Usage: npm run backup-state -- /absolute/path/to/kb-backup.sqlite')
  process.exit(2)
}
if (source === target || !existsSync(source) || existsSync(target)) {
  console.error('Source must exist; destination must be new and different from source.')
  process.exit(2)
}
process.umask(0o077)
mkdirSync(dirname(target), { recursive: true })
const db = new Database(source, { readonly: true })
try {
  await db.backup(target)
  chmodSync(target, 0o600)
  console.log('SQLite backup written to ' + target)
} finally {
  db.close()
}
