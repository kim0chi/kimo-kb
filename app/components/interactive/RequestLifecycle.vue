<script setup lang="ts">
// Bespoke explainer for §9 (HTTP Layer, Routing, Auth). Steps through the real
// round trip: two modes — a full page load (Blade → HTML) and a Vue AJAX call
// (axios → JSON) — using this app's actual middleware stack and auth model.

type Side = 'browser' | 'server'
interface Step {
  side: Side
  title: string
  detail: string
}

const flows: Record<'page' | 'api', Step[]> = {
  page: [
    { side: 'browser', title: 'Browser sends request', detail: 'A full page navigation, e.g. GET /admin/marketplace-permissions. The browser carries the session cookie.' },
    { side: 'server', title: 'Global middleware', detail: 'Runs on every request: TrustProxies, Fruitcake CORS, and FrameHeadersMiddleware (anti-clickjacking).' },
    { side: 'server', title: 'web middleware stack', detail: 'Ordered checkpoints: EncryptCookies → StartSession → VerifyCsrfToken (the 419 guard) → SubstituteBindings → LogLastUserActivity → Impersonate → … → SiDevTool.' },
    { side: 'server', title: 'Authenticate (auth guard)', detail: 'The web guard identifies the user from the session. Sellers logged in via Auth0 SSO; managers/admins via the classic email+password form.' },
    { side: 'server', title: 'Authorize (roles + gates)', detail: 'Role middleware (admin/manager/seller) stacked with can: gates. Gates test the integer User->role and often also a Spatie permission — e.g. access-billings = isAdmin() && can(\'can-read-all-billings\').' },
    { side: 'server', title: 'Route → Controller → Action', detail: 'Matched in routes/web.php (grouped by guard) or a container UI/WEB route. A thin controller delegates to an Action via app(SomeAction::class)($args).' },
    { side: 'server', title: 'Eloquent → MySQL', detail: 'The Action queries via Eloquent models — scoped by store_id, since there is no global tenant scope.' },
    { side: 'server', title: 'Blade → HTML string', detail: 'The controller renders a Blade view into one big HTML string.' },
    { side: 'server', title: 'Response sent — PHP dies', detail: 'The HTML goes back; the PHP process for this request ends and keeps no memory of you between requests.' },
    { side: 'browser', title: 'Browser renders + Vue wakes', detail: 'The page paints, app.js loads, and Vue hydrates. Ziggy exposes named routes to JS; window.Laravel.jsPermissions mirrors server gates to hide buttons.' },
  ],
  api: [
    { side: 'browser', title: 'Vue calls axios', detail: 'User toggles a permission → axios GET/POST api/… carrying the session cookie. Same-origin AJAX, not a token API.' },
    { side: 'server', title: 'web + auth stack again', detail: 'Container “API” routes mount on [\'web\',\'auth\'] — session cookie + CSRF — despite the api/ prefix. They are AJAX endpoints for our own Vue, not stateless token APIs.' },
    { side: 'server', title: 'Controller → Action → Eloquent', detail: 'Same delegation as a page load; the Action reads/writes via Eloquent.' },
    { side: 'server', title: 'JsonResource → JSON', detail: 'Data is shaped by a JsonResource (or, in ~9 legacy spots, league/fractal) into JSON.' },
    { side: 'browser', title: 'Vue updates the page live', detail: 'The response arrives and Vue updates the DOM in place — no page reload.' },
  ],
}

const mode = ref<'page' | 'api'>('page')
const i = ref(0)
const steps = computed(() => flows[mode.value])
const step = computed(() => steps.value[i.value])

function setMode(m: 'page' | 'api') {
  mode.value = m
  i.value = 0
}
function go(d: number) {
  i.value = Math.min(Math.max(i.value + d, 0), steps.value.length - 1)
}
</script>

<template>
  <div class="explainer">
    <header class="ex-head">
      <h3>Request lifecycle</h3>
      <div class="modes">
        <button :class="{ on: mode === 'page' }" @click="setMode('page')">Page load</button>
        <button :class="{ on: mode === 'api' }" @click="setMode('api')">Vue API call</button>
      </div>
    </header>

    <div class="worlds">
      <span class="world" :class="{ active: step.side === 'server' }">SERVER · PHP / Laravel</span>
      <span class="arrow">⟷</span>
      <span class="world" :class="{ active: step.side === 'browser' }">BROWSER · Vue</span>
    </div>

    <ol class="track">
      <li
        v-for="(s, idx) in steps"
        :key="idx"
        class="node"
        :class="[s.side, { active: idx === i, past: idx < i }]"
        @click="i = idx"
      >
        <span class="dot" />
        <span class="label">{{ s.title }}</span>
      </li>
    </ol>

    <div class="detail" :class="step.side">
      <div class="detail-head">
        <span class="badge">{{ step.side === 'server' ? 'Server' : 'Browser' }}</span>
        <strong>{{ step.title }}</strong>
      </div>
      <p>{{ step.detail }}</p>
    </div>

    <footer class="nav">
      <button :disabled="i === 0" @click="go(-1)">← Prev</button>
      <span class="count">{{ i + 1 }} / {{ steps.length }}</span>
      <button :disabled="i === steps.length - 1" @click="go(1)">Next →</button>
    </footer>
  </div>
</template>

<style scoped>
.explainer {
  border: 1px solid var(--border); border-radius: 12px; padding: 1rem 1.15rem;
  background: linear-gradient(180deg, var(--accent-soft), transparent 45%);
}
.ex-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
.ex-head h3 { margin: 0; font-size: 1.05rem; }
.modes button {
  background: var(--panel); color: var(--muted); border: 1px solid var(--border);
  padding: 0.3rem 0.7rem; font-size: 0.8rem; cursor: pointer;
}
.modes button:first-child { border-radius: 7px 0 0 7px; }
.modes button:last-child { border-radius: 0 7px 7px 0; border-left: none; }
.modes button.on { background: var(--accent); color: var(--on-accent); }

.worlds { display: flex; align-items: center; gap: 0.75rem; margin: 0.9rem 0; font-size: 0.72rem; letter-spacing: 0.04em; }
.world { flex: 1; text-align: center; padding: 0.4rem; border: 1px solid var(--border); border-radius: 6px; color: var(--muted); transition: all 0.2s; }
.world.active { color: var(--text); border-color: var(--accent); background: var(--accent-soft); }
.arrow { color: var(--muted); }

.track { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.3rem; }
.node { display: flex; align-items: center; gap: 0.35rem; cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 999px; border: 1px solid var(--border); font-size: 0.72rem; color: var(--muted); }
.node .dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; background: var(--border); flex: 0 0 auto; }
.node.server .dot { background: var(--role-server); }
.node.browser .dot { background: var(--accent); }
.node.past { opacity: 0.55; }
.node.active { color: var(--text); border-color: var(--accent); background: var(--panel); }

.detail { margin: 0.9rem 0; padding: 0.75rem 0.9rem; border-radius: 8px; border: 1px solid var(--border); border-left-width: 3px; background: var(--panel); }
.detail.server { border-left-color: var(--role-server); }
.detail.browser { border-left-color: var(--accent); }
.detail-head { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; }
.badge { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.05rem 0.4rem; border-radius: 4px; background: var(--bg); border: 1px solid var(--border); color: var(--muted); }
.detail p { margin: 0; font-size: 0.9rem; }

.nav { display: flex; align-items: center; justify-content: space-between; }
.nav button { background: var(--panel); color: var(--text); border: 1px solid var(--border); border-radius: 7px; padding: 0.35rem 0.8rem; cursor: pointer; font-size: 0.85rem; }
.nav button:disabled { opacity: 0.4; cursor: default; }
.count { font-size: 0.8rem; color: var(--muted); }
</style>
