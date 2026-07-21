import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'

// Loads the curriculum manifest (roadmap.yaml at the library root). It holds no
// content — steps reference notebook docs by content path. Status lives in
// lib/roadmap.ts so it can be derived on the client too.

export interface RawStep {
  id?: string
  title?: string
  objective?: string
  learn?: unknown
  apply?: unknown
}
export interface RawModule {
  id?: string
  title?: string
  prereqs?: unknown
  steps?: unknown
}
export interface RawTrack {
  id?: string
  title?: string
  description?: string
  modules?: unknown
}
export interface RawRoadmap {
  title?: string
  description?: string
  tracks?: unknown
}

export interface RoadmapLoad {
  /** Parsed manifest, or null when missing/unparseable. */
  roadmap: RawRoadmap | null
  /** True when roadmap.yaml is on disk (so "missing" and "broken" are distinguishable). */
  exists: boolean
  /** Parse/shape error message, surfaced to the UI instead of being swallowed. */
  error: string | null
}

export function loadRoadmap(libraryDir: string): RoadmapLoad {
  const file = join(libraryDir, 'roadmap.yaml')
  if (!existsSync(file)) return { roadmap: null, exists: false, error: null }
  try {
    const parsed = parse(readFileSync(file, 'utf8'))
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { roadmap: null, exists: true, error: 'roadmap.yaml must be a mapping with a `tracks:` list.' }
    }
    return { roadmap: parsed as RawRoadmap, exists: true, error: null }
  } catch (e) {
    return { roadmap: null, exists: true, error: (e as Error).message }
  }
}

/**
 * Coerce a hand-authored YAML value to a list. A bare scalar (e.g.
 * `learn: /si/foo` instead of `learn: [/si/foo]`) is a common authoring slip —
 * treat it as a one-item list rather than crashing on `.map`.
 */
export function asList<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[]
  if (v == null) return []
  return [v as T]
}

/** Only keep strings — guards against a nested mapping ending up in `learn:`. */
export function asPaths(v: unknown): string[] {
  return asList<unknown>(v).filter((x): x is string => typeof x === 'string')
}
