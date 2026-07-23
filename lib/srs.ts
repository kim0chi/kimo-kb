// A small SM-2-style spaced-repetition scheduler (pure). Grades: 0 Again, 1 Hard,
// 2 Good, 3 Easy. Intervals are in days; `due` is a YYYY-MM-DD date string.
export interface CardSched {
  ease: number
  interval: number
  reps: number
  due: string
}

export const GRADES = ['Again', 'Hard', 'Good', 'Easy'] as const

/**
 * Exercise self-assessment. Same 0–3 scale and the same scheduling maths — only the
 * wording differs, because you're judging an explanation you just wrote rather than
 * whether a word came back to you.
 */
export const CONFIDENCE = ['Missed it', 'Shaky', 'Solid', 'Nailed it'] as const

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + Math.round(days))
  return d
}

export function schedule(prev: Partial<CardSched> | null, grade: number, today: Date): CardSched {
  let ease = prev?.ease ?? 2.5
  let interval = prev?.interval ?? 0
  let reps = prev?.reps ?? 0

  if (grade <= 0) {
    reps = 0
    interval = 0 // due again today
    ease = Math.max(1.3, ease - 0.2)
  } else {
    reps += 1
    if (grade === 1) {
      ease = Math.max(1.3, ease - 0.15)
      interval = Math.max(1, Math.round((interval || 1) * 1.2))
    } else if (grade === 2) {
      interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(interval * ease)
    } else {
      ease = ease + 0.15
      interval = reps === 1 ? 3 : Math.round((interval || 3) * ease * 1.3)
    }
  }
  return { ease: Math.round(ease * 100) / 100, interval, reps, due: iso(addDays(today, interval)) }
}

/** A card with no schedule, or due on/before today, is due for review. */
export function isDue(sched: { due?: string } | undefined, today: string): boolean {
  return !sched?.due || sched.due <= today
}
