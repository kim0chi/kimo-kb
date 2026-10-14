import { randomUUID } from 'node:crypto'
import { MAX_MONEY_CENTS, nextMonth, validEntryDate, validMonth } from '../../lib/money'
import { useDb } from './db'

export type MoneyKind = 'income' | 'expense'
export interface MoneyEntry {
  id: string
  kind: MoneyKind
  amountCents: number
  category: string
  note: string
  date: string
  createdAt: string
  updatedAt: string
}
export interface MoneyMonth {
  month: string
  limitCents: number | null
  incomeCents: number
  spentCents: number
  entries: MoneyEntry[]
}

interface EntryRow {
  id: string; kind: MoneyKind; amount_cents: number; category: string; note: string
  entry_date: string; created_at: string; updated_at: string
}

function fromRow(row: EntryRow): MoneyEntry {
  return { id: row.id, kind: row.kind, amountCents: row.amount_cents, category: row.category,
    note: row.note, date: row.entry_date, createdAt: row.created_at, updatedAt: row.updated_at }
}

export function readMoneyMonth(month: string): MoneyMonth {
  if (!validMonth(month)) throw createError({ statusCode: 400, statusMessage: 'Choose a valid month' })
  const d = useDb()
  const entries = (d.prepare(
    'SELECT * FROM money_entries WHERE entry_date >= ? AND entry_date < ? ORDER BY entry_date DESC, created_at DESC',
  ).all(`${month}-01`, `${nextMonth(month)}-01`) as EntryRow[]).map(fromRow)
  const budget = d.prepare('SELECT limit_cents FROM money_budgets WHERE month = ?').get(month) as { limit_cents: number } | undefined
  return {
    month, limitCents: budget?.limit_cents ?? null, entries,
    incomeCents: entries.reduce((sum, entry) => sum + (entry.kind === 'income' ? entry.amountCents : 0), 0),
    spentCents: entries.reduce((sum, entry) => sum + (entry.kind === 'expense' ? entry.amountCents : 0), 0),
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw createError({ statusCode: 400, statusMessage: 'Enter the transaction details' })
  return value as Record<string, unknown>
}

export function saveMoneyEntry(value: unknown, id?: string): MoneyEntry {
  const input = object(value)
  const d = useDb()
  const previous = id ? d.prepare('SELECT * FROM money_entries WHERE id = ?').get(id) as EntryRow | undefined : undefined
  if (id && !previous) throw createError({ statusCode: 404, statusMessage: 'Entry not found' })
  const kind = input.kind ?? previous?.kind
  const amountCents = input.amountCents ?? previous?.amount_cents
  const category = input.category ?? previous?.category
  const note = input.note ?? previous?.note ?? ''
  const date = input.date ?? previous?.entry_date
  if (kind !== 'income' && kind !== 'expense') throw createError({ statusCode: 400, statusMessage: 'Choose income or expense' })
  if (!Number.isSafeInteger(amountCents) || (amountCents as number) <= 0 || (amountCents as number) > MAX_MONEY_CENTS)
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid amount greater than zero' })
  if (typeof category !== 'string' || !category.trim() || category.trim().length > 60)
    throw createError({ statusCode: 400, statusMessage: 'Add a category (up to 60 characters)' })
  if (typeof note !== 'string' || note.length > 500)
    throw createError({ statusCode: 400, statusMessage: 'Keep the note under 500 characters' })
  if (typeof date !== 'string' || !validEntryDate(date))
    throw createError({ statusCode: 400, statusMessage: 'Choose a valid date' })
  const now = new Date().toISOString()
  const entry: MoneyEntry = {
    id: previous?.id ?? randomUUID(), kind, amountCents: amountCents as number,
    category: category.trim(), note: note.trim(), date,
    createdAt: previous?.created_at ?? now, updatedAt: now,
  }
  d.prepare(`INSERT INTO money_entries (id,kind,amount_cents,category,note,entry_date,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
    kind=excluded.kind,amount_cents=excluded.amount_cents,category=excluded.category,
    note=excluded.note,entry_date=excluded.entry_date,updated_at=excluded.updated_at`)
    .run(entry.id, entry.kind, entry.amountCents, entry.category, entry.note, entry.date, entry.createdAt, entry.updatedAt)
  return entry
}

export function deleteMoneyEntry(id: string): void {
  const result = useDb().prepare('DELETE FROM money_entries WHERE id = ?').run(id)
  if (!result.changes) throw createError({ statusCode: 404, statusMessage: 'Entry not found' })
}

export function saveMoneyBudget(value: unknown): { month: string; limitCents: number | null } {
  const input = object(value)
  const { month, limitCents } = input
  if (typeof month !== 'string' || !validMonth(month))
    throw createError({ statusCode: 400, statusMessage: 'Choose a valid month' })
  if (limitCents !== null && (!Number.isSafeInteger(limitCents) || (limitCents as number) < 0 || (limitCents as number) > MAX_MONEY_CENTS))
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid monthly limit' })
  const d = useDb()
  if (limitCents === null) d.prepare('DELETE FROM money_budgets WHERE month = ?').run(month)
  else d.prepare(`INSERT INTO money_budgets (month,limit_cents,updated_at) VALUES (?,?,?)
    ON CONFLICT(month) DO UPDATE SET limit_cents=excluded.limit_cents,updated_at=excluded.updated_at`)
    .run(month, limitCents, new Date().toISOString())
  return { month, limitCents: limitCents as number | null }
}
