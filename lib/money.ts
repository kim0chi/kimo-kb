export const MAX_MONEY_CENTS = 99_999_999_999

export function parseAmountCents(value: string, allowZero = false): number | null {
  const trimmed = value.trim()
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(trimmed)) return null
  const [dollars, cents = ''] = trimmed.split('.')
  const amount = Number(dollars) * 100 + Number(cents.padEnd(2, '0'))
  return amount <= MAX_MONEY_CENTS && (allowZero || amount > 0) ? amount : null
}

export function formatSgd(cents: number): string {
  const amount = new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(cents) / 100)
  return `${cents < 0 ? '−' : ''}S$${amount}`
}

export function validMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function validEntryDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function nextMonth(month: string): string {
  const [year, part] = month.split('-').map(Number)
  return part === 12 ? `${year + 1}-01` : `${year}-${String(part + 1).padStart(2, '0')}`
}
