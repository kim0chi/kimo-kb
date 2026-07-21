import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'

// The curriculum manifest (roadmap.yaml at the library root). It holds no content —
// steps reference notebook docs by content path. See the file's own header.

export interface RawStep {
  id: string
  title: string
  objective?: string
  learn?: string[]
  apply?: string[]
}
export interface RawModule {
  id: string
  title: string
  prereqs?: string[]
  steps?: RawStep[]
}
export interface RawTrack {
  id: string
  title: string
  description?: string
  modules?: RawModule[]
}
export interface RawRoadmap {
  title?: string
  description?: string
  tracks?: RawTrack[]
}

export function loadRoadmap(libraryDir: string): RawRoadmap | null {
  const file = join(libraryDir, 'roadmap.yaml')
  if (!existsSync(file)) return null
  try {
    return parse(readFileSync(file, 'utf8')) as RawRoadmap
  } catch {
    return null
  }
}

export type StepStatus = 'planned' | 'todo' | 'reading' | 'done'

/**
 * A step's status comes from the reading state of the docs it references.
 * No resolvable `learn` doc yet → "planned" (content still to be written).
 */
export function stepStatus(
  learnPaths: string[],
  known: Set<string>,
  states: Record<string, string>,
): StepStatus {
  const resolved = learnPaths.filter((p) => known.has(p))
  if (!resolved.length) return 'planned'
  const s = resolved.map((p) => states[p] ?? 'unread')
  if (s.every((x) => x === 'done')) return 'done'
  if (s.some((x) => x === 'done' || x === 'reading')) return 'reading'
  return 'todo'
}
