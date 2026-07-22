// Code Lab runners. One interface per language; the UI never cares which is which.
//
// JavaScript runs natively in a Web Worker (instant, no download). The other
// languages need a WASM runtime (esbuild for TS, Pyodide, php-wasm, sql.js) —
// they're registered here so the UI can say "runtime not installed yet" instead of
// silently doing nothing, and they'll be self-hosted (no CDN) when added.

export interface TestResult {
  name: string
  ok: boolean
  error?: string
}
export interface RunResult {
  ok: boolean
  logs: string[]
  tests: TestResult[]
  error?: string
  durationMs: number
}

export interface Runner {
  id: string
  label: string
  /** false → the runtime isn't available yet; the UI shows a notice instead of Run. */
  available: boolean
  run?: (solution: string, tests: string | null) => Promise<RunResult>
}

const TIMEOUT_MS = 5000

// The worker body: injects a tiny test harness, captures console, reports results.
const JS_WORKER = `
self.onmessage = async (e) => {
  const { code } = e.data
  const logs = []
  const tests = []
  const con = {
    log: (...a) => logs.push(a.map(fmt).join(' ')),
    error: (...a) => logs.push('ERROR: ' + a.map(fmt).join(' ')),
    warn: (...a) => logs.push('WARN: ' + a.map(fmt).join(' ')),
  }
  function fmt(v) {
    if (typeof v === 'string') return v
    try { return JSON.stringify(v) } catch { return String(v) }
  }
  function test(name, fn) {
    try { fn(); tests.push({ name: String(name), ok: true }) }
    catch (err) { tests.push({ name: String(name), ok: false, error: String((err && err.message) || err) }) }
  }
  function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed') }
  function assertEqual(actual, expected, msg) {
    const A = fmt(actual), B = fmt(expected)
    if (A !== B) throw new Error(msg || ('expected ' + B + ', got ' + A))
  }
  try {
    const fn = new Function('console', 'test', 'assert', 'assertEqual', code)
    await fn(con, test, assert, assertEqual)
    self.postMessage({ ok: true, logs, tests })
  } catch (err) {
    self.postMessage({ ok: false, logs, tests, error: String((err && err.stack) || err) })
  }
}
`

function runJs(solution: string, tests: string | null): Promise<RunResult> {
  const started = Date.now()
  const code = tests ? `${solution}\n;\n${tests}` : solution
  const url = URL.createObjectURL(new Blob([JS_WORKER], { type: 'application/javascript' }))
  const worker = new Worker(url)

  return new Promise<RunResult>((resolve) => {
    const finish = (r: Omit<RunResult, 'durationMs'>) => {
      clearTimeout(timer)
      worker.terminate()
      URL.revokeObjectURL(url)
      resolve({ ...r, durationMs: Date.now() - started })
    }
    const timer = setTimeout(
      () => finish({ ok: false, logs: [], tests: [], error: `Timed out after ${TIMEOUT_MS}ms (infinite loop?)` }),
      TIMEOUT_MS,
    )
    worker.onmessage = (e) => finish(e.data)
    worker.onerror = (e) => finish({ ok: false, logs: [], tests: [], error: e.message || 'Worker error' })
    worker.postMessage({ code })
  })
}

const RUNNERS: Record<string, Runner> = {
  js: { id: 'js', label: 'JavaScript', available: true, run: runJs },
  javascript: { id: 'js', label: 'JavaScript', available: true, run: runJs },
  ts: { id: 'ts', label: 'TypeScript', available: false },
  typescript: { id: 'ts', label: 'TypeScript', available: false },
  python: { id: 'python', label: 'Python', available: false },
  py: { id: 'python', label: 'Python', available: false },
  php: { id: 'php', label: 'PHP', available: false },
  sql: { id: 'sql', label: 'SQL', available: false },
}

export function getRunner(lang: string): Runner | null {
  return RUNNERS[(lang || '').toLowerCase()] ?? null
}
