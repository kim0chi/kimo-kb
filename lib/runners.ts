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

// TypeScript: strip the types (sucrase — pure JS, no WASM needed), then run as JS.
async function runTs(solution: string, tests: string | null): Promise<RunResult> {
  const started = Date.now()
  try {
    const { transform } = await import('sucrase')
    const strip = (src: string) => transform(src, { transforms: ['typescript'] }).code
    return await runJs(strip(solution), tests ? strip(tests) : null)
  } catch (err) {
    return {
      ok: false,
      logs: [],
      tests: [],
      error: `TypeScript compile failed:\n${(err as Error).message}`,
      durationMs: Date.now() - started,
    }
  }
}

// SQL: SQLite compiled to WASM (sql.js), self-hosted — the .wasm is emitted as a
// local asset by the bundler, so nothing is fetched from a CDN.
let sqlPromise: Promise<any> | null = null
function loadSql(): Promise<any> {
  if (!sqlPromise) {
    sqlPromise = (async () => {
      const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([
        import('sql.js'),
        import('sql.js/dist/sql-wasm.wasm?url'),
      ])
      return initSqlJs({ locateFile: () => wasmUrl })
    })()
  }
  return sqlPromise
}

/** Render a sql.js result set as a monospace text table. */
function formatTable(columns: string[], values: unknown[][]): string[] {
  const rows = values.map((r) => r.map((v) => (v === null ? 'NULL' : String(v))))
  const widths = columns.map((c, i) => Math.max(c.length, ...rows.map((r) => (r[i] ?? '').length), 3))
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join('  ')
  return [line(columns), widths.map((w) => '─'.repeat(w)).join('  '), ...rows.map(line)]
}

async function runSqlLab(solution: string): Promise<RunResult> {
  const started = Date.now()
  const logs: string[] = []
  try {
    const SQL = await loadSql()
    const db = new SQL.Database()
    try {
      const results = db.exec(solution)
      if (!results.length) logs.push('(no rows returned)')
      for (const res of results) {
        logs.push(...formatTable(res.columns, res.values), '')
      }
      return { ok: true, logs, tests: [], durationMs: Date.now() - started }
    } finally {
      db.close()
    }
  } catch (err) {
    return { ok: false, logs, tests: [], error: String((err as Error).message || err), durationMs: Date.now() - started }
  }
}

// Python: CPython compiled to WASM (Pyodide), served from /pyodide/ — copied there
// out of node_modules by scripts/sync-wasm.mjs. Imported by URL rather than as a
// module so the bundler leaves it alone and the loader can find its own assets.
// First run downloads ~13 MB from localhost and takes a couple of seconds; after
// that the interpreter is kept alive for the tab.
let pyPromise: Promise<any> | null = null
function loadPy(): Promise<any> {
  if (!pyPromise) {
    pyPromise = (async () => {
      // Built at runtime on purpose: a literal specifier gets rewritten by the
      // bundler into a module it can't parse, and loadPyodide comes back undefined.
      const url = `${location.origin}/pyodide/pyodide.mjs`
      const mod: any = await import(/* @vite-ignore */ url)
      return mod.loadPyodide({ indexURL: `${location.origin}/pyodide/` })
    })()
  }
  return pyPromise
}

// The same harness the JS worker injects, in Python. snake_case because that's
// what a Python author would reach for; `test` keeps the name across languages.
const PY_HARNESS = `
__kb_results = []

def test(name, fn):
    try:
        fn()
        __kb_results.append([str(name), True, ""])
    except Exception as e:
        __kb_results.append([str(name), False, "%s: %s" % (type(e).__name__, e)])

def assert_equal(actual, expected, msg=""):
    if actual != expected:
        raise AssertionError(msg or "expected %r, got %r" % (expected, actual))

def assert_true(cond, msg=""):
    if not cond:
        raise AssertionError(msg or "assertion failed")
`

async function runPython(solution: string, tests: string | null): Promise<RunResult> {
  const started = Date.now()
  const logs: string[] = []
  let py: any
  try {
    py = await loadPy()
  } catch (err) {
    return {
      ok: false,
      logs,
      tests: [],
      error: `Python runtime failed to load. Run \`npm run sync-wasm\` to copy it into public/.\n${(err as Error).message}`,
      durationMs: Date.now() - started,
    }
  }

  py.setStdout({ batched: (s: string) => logs.push(s) })
  py.setStderr({ batched: (s: string) => logs.push(`ERROR: ${s}`) })
  try {
    // Reset the harness each run so results don't accumulate across clicks.
    await py.runPythonAsync(`${PY_HARNESS}\n${solution}\n${tests ?? ''}`)
    const raw = py.globals.get('__kb_results')
    const collected: TestResult[] = raw
      ? raw.toJs().map(([name, ok, error]: [string, boolean, string]) => ({ name, ok, error: error || undefined }))
      : []
    raw?.destroy?.()
    return { ok: true, logs, tests: collected, durationMs: Date.now() - started }
  } catch (err) {
    // Pyodide puts the Python traceback in the message — that's the useful part.
    return { ok: false, logs, tests: [], error: String((err as Error).message || err), durationMs: Date.now() - started }
  }
}

// PHP: the WordPress Playground build of PHP 8.3 as WASM. The bundler resolves it
// out of node_modules and emits the .wasm as a local asset, so — like the others —
// nothing comes from a CDN. ~18 MB on first run, then the interpreter stays warm.
//
// We depend on @php-wasm/web-8-3 rather than the @php-wasm/web umbrella on purpose:
// the umbrella dispatches over every PHP version 5.6→8.5, which makes the bundler
// pull all eight builds (~375 MB) to serve the one we actually run.
//
// Two builds ship for each version. JSPI is the newer, faster suspension mechanism;
// asyncify is the portable fallback for browsers that don't have it. The #php-*
// aliases are wired up in nuxt.config.ts.
let phpPromise: Promise<any> | null = null
function loadPhp(): Promise<any> {
  if (!phpPromise) {
    phpPromise = (async () => {
      const hasJspi = typeof (WebAssembly as any).Suspending === 'function'
      const [{ PHP, loadPHPRuntime }, glue] = await Promise.all([
        import('@php-wasm/universal'),
        hasJspi ? import('#php-jspi') : import('#php-asyncify'),
      ])
      return new PHP(await loadPHPRuntime(glue))
    })()
  }
  return phpPromise
}

/** Lab files are real PHP files, so they open with `<?php`. We concatenate them
 *  into one script, which means the tags have to come off first. */
function stripPhpTags(src: string): string {
  return src.replace(/^\s*<\?php\s*/, '').replace(/\?>\s*$/, '')
}

const PHP_HARNESS = `
$__kb_results = [];
function test($name, $fn) {
    global $__kb_results;
    try {
        $fn();
        $__kb_results[] = [(string) $name, true, ""];
    } catch (\\Throwable $e) {
        $__kb_results[] = [(string) $name, false, get_class($e) . ': ' . $e->getMessage()];
    }
}
function assert_equal($actual, $expected, $msg = '') {
    if ($actual !== $expected) {
        throw new Exception($msg ?: 'expected ' . json_encode($expected) . ', got ' . json_encode($actual));
    }
}
function assert_true($cond, $msg = '') {
    if (!$cond) throw new Exception($msg ?: 'assertion failed');
}
`

// Test results ride back on stdout behind a marker, so echo output stays readable.
const PHP_MARKER = '__KB_RESULTS__'

async function runPhp(solution: string, tests: string | null): Promise<RunResult> {
  const started = Date.now()
  let php: any
  try {
    php = await loadPhp()
  } catch (err) {
    return {
      ok: false,
      logs: [],
      tests: [],
      error: `PHP runtime failed to load.\n${(err as Error).message}`,
      durationMs: Date.now() - started,
    }
  }

  const code = [
    '<?php',
    PHP_HARNESS,
    stripPhpTags(solution),
    tests ? stripPhpTags(tests) : '',
    `echo "\\n${PHP_MARKER}" . json_encode($__kb_results);`,
  ].join('\n')

  try {
    const res = await php.run({ code })
    const [stdout = '', encoded = ''] = res.text.split(PHP_MARKER)
    let collected: TestResult[] = []
    try {
      collected = (JSON.parse(encoded || '[]') as [string, boolean, string][]).map(([name, ok, error]) => ({
        name,
        ok,
        error: error || undefined,
      }))
    } catch {
      // A fatal error kills the script before the marker prints — leave tests empty
      // and let the output below explain what happened.
    }
    const logs = stdout.split('\n').filter((l) => l.trim() !== '')
    const failed = res.exitCode !== 0
    return {
      ok: !failed,
      logs,
      tests: collected,
      error: failed ? res.errors || `PHP exited with code ${res.exitCode}` : undefined,
      durationMs: Date.now() - started,
    }
  } catch (err) {
    return { ok: false, logs: [], tests: [], error: String((err as Error).message || err), durationMs: Date.now() - started }
  }
}

const jsRunner: Runner = { id: 'js', label: 'JavaScript', available: true, run: runJs }
const tsRunner: Runner = { id: 'ts', label: 'TypeScript', available: true, run: runTs }
const sqlRunner: Runner = { id: 'sql', label: 'SQL', available: true, run: (s) => runSqlLab(s) }
const pyRunner: Runner = { id: 'python', label: 'Python', available: true, run: runPython }
const phpRunner: Runner = { id: 'php', label: 'PHP', available: true, run: runPhp }

const RUNNERS: Record<string, Runner> = {
  js: jsRunner,
  javascript: jsRunner,
  ts: tsRunner,
  typescript: tsRunner,
  sql: sqlRunner,
  python: pyRunner,
  py: pyRunner,
  php: phpRunner,
}

export function getRunner(lang: string): Runner | null {
  return RUNNERS[(lang || '').toLowerCase()] ?? null
}
