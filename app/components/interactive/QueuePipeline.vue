<script setup lang="ts">
// Bespoke explainer for §10 (Jobs, Queues & Scheduling). Dispatch jobs and watch
// them flow App → Redis queue → Horizon worker → Done (or Failed). Includes the
// real supervisor pools and the retry_after > timeout invariant from the doc.

const STAGES = ['Dispatched', 'Redis queue', 'Worker', 'Done'] as const

interface Job {
  id: number
  stage: number
  failed: boolean
}

const jobs = ref<Job[]>([])
const failMode = ref(false)
let seq = 0
let timer: ReturnType<typeof setInterval> | null = null

function tick() {
  jobs.value = jobs.value
    .map((j) => {
      // Fail at the worker stage when failure is simulated (tries:1 → no retry).
      if (failMode.value && j.stage === 1 && !j.failed) return { ...j, stage: 2, failed: true }
      return { ...j, stage: j.stage + 1 }
    })
    .filter((j) => j.stage <= (STAGES.length - 1) + 2) // linger briefly at the end
  if (!jobs.value.length && timer) {
    clearInterval(timer)
    timer = null
  }
}

function dispatch() {
  jobs.value = [...jobs.value, { id: ++seq, stage: 0, failed: false }]
  if (!timer) timer = setInterval(tick, 750)
}

onBeforeUnmount(() => timer && clearInterval(timer))

function jobsAt(stage: number) {
  return jobs.value.filter((j) => (j.failed ? j.stage >= 2 && stage === 2 : j.stage === stage))
}

const supervisors = [
  { name: 'supervisor-1', queues: 'high, refresh-tokens, mid, low, default', procs: '3–50', timeout: 1200 },
  { name: 'inbound-processes-supervisor', queues: 'inbound-processes', procs: '10–150', timeout: 1740 },
  { name: 'report-processing-supervisor', queues: 'report-updater, report-processor', procs: '5–60', timeout: 1740 },
  { name: 'long-running-db-write-supervisor', queues: 'download-report', procs: '2–50', timeout: 3600 },
  { name: 'one-worker-supervisor', queues: 'mails', procs: '1', timeout: 1200 },
  { name: 'unified-billing', queues: 'ubs (SQS)', procs: '1–5', timeout: 120 },
]
const picked = ref<string | null>(null)
</script>

<template>
  <div class="explainer">
    <header class="ex-head">
      <h3>Queue pipeline</h3>
      <label class="failtoggle">
        <input v-model="failMode" type="checkbox" /> simulate failure
      </label>
    </header>

    <p class="intro">
      Anything slow becomes a <strong>job</strong>, dropped on a <strong>queue in Redis</strong>, and
      run later by <strong>workers</strong> that <strong>Horizon</strong> supervises. Dispatch a few:
    </p>

    <div class="flow">
      <div v-for="(name, s) in STAGES" :key="s" class="stage" :class="{ terminal: s === 3 }">
        <div class="stage-name">{{ name }}</div>
        <div class="lane">
          <TransitionGroup name="tok">
            <span
              v-for="j in jobsAt(s)"
              :key="j.id"
              class="tok"
              :class="{ fail: j.failed && s === 2 }"
              :title="j.failed ? 'Failed → failed_jobs table (tries:1, no retry)' : `job #${j.id}`"
            >{{ j.failed && s === 2 ? '✕' : '#' + j.id }}</span>
          </TransitionGroup>
        </div>
      </div>
    </div>

    <div class="qlegend">
      <span class="ql"><span class="chip" />job</span>
      <span class="ql"><span class="chip fail">✕</span>failed → failed_jobs</span>
      <span class="ql hint">hover a token for its id</span>
    </div>

    <button class="dispatch" @click="dispatch">+ Dispatch a job</button>

    <p class="invariant">
      <strong>retry_after 3700s &gt; timeout 3600s.</strong> The queue waits longer than the slowest
      worker before reassigning a job — if it didn't, a still-running job would be handed to a second
      worker and run <em>twice</em>.
    </p>

    <details class="sups">
      <summary>Horizon supervisors ({{ supervisors.length }} of ~14 shown)</summary>
      <table>
        <thead><tr><th>Supervisor</th><th>Queues</th><th>Procs</th><th>Timeout</th></tr></thead>
        <tbody>
          <tr
            v-for="sv in supervisors"
            :key="sv.name"
            :class="{ on: picked === sv.name }"
            @click="picked = picked === sv.name ? null : sv.name"
          >
            <td>{{ sv.name }}</td>
            <td>{{ sv.queues }}</td>
            <td>{{ sv.procs }}</td>
            <td>{{ sv.timeout }}s</td>
          </tr>
        </tbody>
      </table>
      <p class="sched">
        Scheduled work is the same idea on a clock: one cron line — <code>* * * * * php artisan
        schedule:run</code> — ticks every minute and dispatches whatever is due.
      </p>
    </details>
  </div>
</template>

<style scoped>
.explainer { border: 1px solid var(--border); border-radius: 12px; padding: 1rem 1.15rem; background: linear-gradient(180deg, rgba(217, 89, 38, 0.05), transparent 40%); }
.ex-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.ex-head h3 { margin: 0; font-size: 1.05rem; }
.failtoggle { font-size: 0.78rem; color: var(--muted); display: flex; align-items: center; gap: 0.3rem; }
.intro { font-size: 0.9rem; color: var(--muted); margin: 0.5rem 0 0.9rem; }

.flow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.4rem; }
.stage { border: 1px solid var(--border); border-radius: 8px; padding: 0.45rem; background: var(--panel); min-height: 5.5rem; display: flex; flex-direction: column; }
.stage.terminal { border-color: var(--good); }
.stage-name { font-size: 0.68rem; color: var(--muted); text-align: center; margin-bottom: 0.4rem; letter-spacing: 0.03em; }
.lane { display: flex; flex-wrap: wrap; gap: 0.25rem; align-content: flex-start; justify-content: center; flex: 1; }
.tok { font-size: 0.68rem; background: var(--accent); color: var(--on-accent); border-radius: 5px; padding: 0.1rem 0.35rem; font-weight: 600; }
.tok.fail { background: var(--critical); color: var(--on-critical); }
.tok-enter-active, .tok-leave-active, .tok-move { transition: all 0.4s ease; }
.tok-enter-from { opacity: 0; transform: translateY(-6px); }
.tok-leave-to { opacity: 0; transform: scale(0.6); }

.qlegend { display: flex; flex-wrap: wrap; gap: 0.9rem; margin: 0.7rem 0 0; font-size: 0.72rem; color: var(--muted); }
.ql { display: inline-flex; align-items: center; gap: 0.35rem; }
.ql .chip { display: inline-flex; align-items: center; justify-content: center; width: 0.95rem; height: 0.85rem; border-radius: 4px; background: var(--accent); color: var(--on-accent); font-size: 0.6rem; font-weight: 700; }
.ql .chip.fail { background: var(--critical); color: var(--on-critical); }
.ql.hint { font-style: italic; }
.dispatch { margin: 0.9rem 0 0; background: var(--accent); color: var(--on-accent); border: none; border-radius: 8px; padding: 0.45rem 0.9rem; font-weight: 600; cursor: pointer; }
.invariant { font-size: 0.82rem; color: var(--muted); margin: 0.9rem 0; padding: 0.6rem 0.8rem; border-left: 3px solid var(--serious); background: var(--panel); border-radius: 0 6px 6px 0; }
.invariant strong { color: var(--text); }

.sups summary { cursor: pointer; font-size: 0.85rem; color: var(--accent); }
.sups table { width: 100%; border-collapse: collapse; margin-top: 0.6rem; font-size: 0.72rem; display: block; overflow-x: auto; }
.sups th, .sups td { border: 1px solid var(--border); padding: 0.3rem 0.45rem; text-align: left; white-space: nowrap; }
.sups th { color: var(--muted); font-weight: 500; }
.sups tbody tr { cursor: pointer; }
.sups tbody tr:hover { background: var(--panel); }
.sups tbody tr.on { background: rgba(236, 131, 90, 0.15); }
.sched { font-size: 0.8rem; color: var(--muted); margin-top: 0.6rem; }
.sched code { background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 0.05rem 0.3rem; font-size: 0.9em; }
</style>
