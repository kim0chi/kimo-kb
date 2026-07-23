/**
 * Stable id for a reviewable item, from a namespace + the item's question text.
 *
 * Derived from the QUESTION only, deliberately: editing an answer keeps the review
 * history attached to the item, while rewording the question starts a new one (it is
 * a different question). djb2 — short, stable across processes, no dependency.
 *
 * Shared by flashcards and exercises so the two can never drift apart; changing this
 * function orphans every schedule already in the database.
 */
export function hashId(ns: string, text: string): string {
  let h = 5381
  const s = `${ns}::${text.trim().toLowerCase()}`
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}
