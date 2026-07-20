import type { GlossaryOverride } from './glossary'

// Per-term corrections for the structured glossary, keyed by slug.
//
// The parser derives {expansion, whatIs, howUsed} heuristically from §17. Where
// the split lands wrong for a specific term, correct just that term here — this
// keeps the corpus markdown untouched (still the source of truth) while letting
// the structured view be hand-tuned. Only override the fields you need.
//
// Example:
//   'case': { whatIs: 'A single reimbursement claim for one discrepancy on one store.',
//             howUsed: 'In code it is the `CaseSummary` entity (a database record type).' },
export const glossaryOverrides: Record<string, GlossaryOverride> = {}
