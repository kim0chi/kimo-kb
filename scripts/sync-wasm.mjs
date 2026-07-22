#!/usr/bin/env node
// Copies WASM runtimes out of node_modules into public/ so they're served locally.
// Nothing in the Code Lab is fetched from a CDN — same rule as the fonts.
// Runs on postinstall; the copied dirs are gitignored.
import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Pyodide needs its loader, wasm, stdlib and lock file served from one dir. */
function syncPyodide() {
  const src = join(root, 'node_modules/pyodide')
  const dest = join(root, 'public/pyodide')
  if (!existsSync(src)) {
    console.log('· pyodide not installed — skipping')
    return
  }
  mkdirSync(dest, { recursive: true })
  const keep = /\.(mjs|wasm|zip|json)$/
  let copied = 0
  let bytes = 0
  for (const f of readdirSync(src)) {
    if (!keep.test(f) || f.endsWith('.map') || f === 'package.json') continue
    const from = join(src, f)
    if (!statSync(from).isFile()) continue
    copyFileSync(from, join(dest, f))
    copied++
    bytes += statSync(from).size
  }
  console.log(`✓ pyodide → public/pyodide (${copied} files, ${(bytes / 1e6).toFixed(1)} MB)`)
}

syncPyodide()
