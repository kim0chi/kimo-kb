<script setup lang="ts">
// Bespoke explainer for §6 (Data Model). An interactive map of the core entities:
// click a node for its facts; use the lenses to highlight the tenancy spine, the
// case aggregate, and the money trail (Store → CaseSummary → CaseSummaryAmazonCase
// → AllReimbursement) the new billing direction settles on.

interface Node {
  id: string
  label: string
  x: number
  y: number
  w?: number
  lenses: string[]
  key: string
  what: string
  rels: string[]
}

const W = 150
const H = 36
const nodes: Node[] = [
  { id: 'user', label: 'User', x: 20, y: 80, lenses: ['tenancy', 'money'], key: 'users.user_id', what: 'Account root — sellers, secondary users, managers, admins, BDRs. Self-referential tree via parent_user_id.', rels: ['hasOne Store (user_id)', 'hasMany managed stores', 'belongsToMany Team (team_user pivot)'] },
  { id: 'store', label: 'Store', x: 20, y: 185, lenses: ['tenancy', 'case', 'money'], key: 'stores.store_id', what: 'One connected Amazon account; the tenant hub nearly every table scopes to. ~1,990 lines. Hard-deletes via a boot() cascade — no DB-level cascade.', rels: ['belongsTo User', 'hasMany CaseSummary', 'hasMany All* report tables'] },
  { id: 'contract', label: 'Contract', x: 20, y: 330, lenses: ['money'], key: 'contracts.id', what: 'New billing engine (2026-05). Holds per-store take_rate via ContractStoreDetail.', rels: ['belongsTo User', 'hasMany Invoice', 'hasMany ContractStoreDetail'] },
  { id: 'caseDoc', label: 'CaseDocument / Message', x: 265, y: 20, w: 175, lenses: ['case'], key: 'polymorphic', what: 'Case child docs. Message is polymorphic (messageable) — it hangs off both CaseSummary and CaseDocument. Attachments live in S3.', rels: ['morphMany from CaseSummary', 'morphMany from CaseDocument'] },
  { id: 'caseSummary', label: 'CaseSummary', x: 275, y: 185, lenses: ['case', 'money'], key: 'case_summaries.id', what: 'The central aggregate the whole product is about (~2,050 lines). Hard-deletes (no soft-delete).', rels: ['belongsTo Store (store_id)', 'hasMany CaseSummaryAmazonCase', 'hasMany DailyNote / LostDamage'] },
  { id: 'caseManager', label: 'CaseManager', x: 275, y: 280, lenses: ['case'], key: 'case_managers.case_manager_id', what: 'Internal ops agent. A SEPARATE authenticatable identity from User — its own login and password. Has is_bot for automation agents.', rels: ['caseManager() from CaseSummary', 'self-ref supervisor_case_manager_id'] },
  { id: 'invoice', label: 'Invoice', x: 265, y: 345, lenses: ['money'], key: 'invoices.id', what: 'New billing engine. Uses explicit $fillable.', rels: ['belongsTo Contract + User', 'hasMany InvoiceItem', 'hasMany InvoicePayment'] },
  { id: 'csac', label: 'CaseSummaryAmazonCase', x: 500, y: 95, w: 185, lenses: ['case', 'money'], key: 'id', what: 'Holds the Amazon Seller-Central case IDs for a case (open/closed). Also the “through” model that links a case to its reimbursement money.', rels: ['hasMany from CaseSummary', 'through-model → AllReimbursement'] },
  { id: 'allReimb', label: 'AllReimbursement', x: 510, y: 195, w: 165, lenses: ['money'], key: 'id (store_id FK)', what: 'Raw Amazon reimbursement rows — the payout side of the money trail. One of the All* imported tables.', rels: ['belongsTo Store', 'reached via hasManyThroughWithStoreConstraint'] },
  { id: 'invoiceItem', label: 'InvoiceItem', x: 500, y: 345, w: 165, lenses: ['money'], key: 'invoice_items.id', what: 'Closes the loop: ties a successful reimbursement to the exact billable line.', rels: ['belongsTo Invoice', 'belongsTo CaseSummary', 'belongsTo AllReimbursement'] },
]

interface Edge { a: string; b: string; label?: string }
const edges: Edge[] = [
  { a: 'user', b: 'store', label: 'hasOne' },
  { a: 'user', b: 'contract' },
  { a: 'store', b: 'caseSummary', label: 'hasMany' },
  { a: 'store', b: 'allReimb' },
  { a: 'caseSummary', b: 'caseDoc' },
  { a: 'caseSummary', b: 'caseManager' },
  { a: 'caseSummary', b: 'csac', label: 'hasMany' },
  { a: 'csac', b: 'allReimb', label: 'through' },
  { a: 'contract', b: 'invoice' },
  { a: 'invoice', b: 'invoiceItem' },
  { a: 'invoiceItem', b: 'caseSummary' },
  { a: 'invoiceItem', b: 'allReimb' },
]

const lenses = [
  { id: 'all', label: 'All' },
  { id: 'tenancy', label: 'Tenancy spine' },
  { id: 'case', label: 'Case aggregate' },
  { id: 'money', label: 'Money trail' },
]
const lens = ref('all')
const selected = ref<string | null>('caseSummary')

const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
const cx = (n: Node) => n.x + (n.w ?? W) / 2
const cy = (n: Node) => n.y + H / 2

function inLens(n: Node) {
  return lens.value === 'all' || n.lenses.includes(lens.value)
}
function edgeIn(e: Edge) {
  return lens.value === 'all' || (inLens(byId[e.a]) && inLens(byId[e.b]))
}
const active = computed(() => (selected.value ? byId[selected.value] : null))
</script>

<template>
  <div class="explainer">
    <header class="ex-head">
      <h3>Data model map</h3>
      <div class="lenses">
        <button v-for="l in lenses" :key="l.id" :class="{ on: lens === l.id }" @click="lens = l.id">
          {{ l.label }}
        </button>
      </div>
    </header>

    <div class="canvas">
      <svg viewBox="0 0 700 400" preserveAspectRatio="xMinYMin meet" role="group" aria-label="Entity relationship map">
        <g class="edges">
          <line
            v-for="(e, idx) in edges"
            :key="idx"
            :x1="cx(byId[e.a])" :y1="cy(byId[e.a])"
            :x2="cx(byId[e.b])" :y2="cy(byId[e.b])"
            :class="{ dim: !edgeIn(e), trail: lens === 'money' && edgeIn(e) }"
          />
        </g>
        <g
          v-for="n in nodes"
          :key="n.id"
          class="node"
          :class="{ dim: !inLens(n), sel: selected === n.id }"
          tabindex="0"
          role="button"
          :aria-label="`${n.label} (${n.key})`"
          @click="selected = n.id"
          @mouseenter="selected = n.id"
          @focus="selected = n.id"
        >
          <rect :x="n.x" :y="n.y" :width="n.w ?? W" :height="H" rx="7" />
          <text :x="n.x + (n.w ?? W) / 2" :y="n.y + H / 2 + 4">{{ n.label }}</text>
        </g>
      </svg>
    </div>

    <div class="legend">
      <span class="lg"><span class="sw sel" /> selected</span>
      <span class="lg"><span class="sw trail" /> money trail</span>
      <span class="lg hint">hover or focus a box for details</span>
    </div>

    <div v-if="active" class="detail">
      <div class="detail-head">
        <strong>{{ active.label }}</strong>
        <code>{{ active.key }}</code>
      </div>
      <p>{{ active.what }}</p>
      <ul>
        <li v-for="r in active.rels" :key="r">{{ r }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.explainer { border: 1px solid var(--border); border-radius: 12px; padding: 1rem 1.15rem; background: linear-gradient(180deg, rgba(12, 163, 12, 0.05), transparent 40%); }
.ex-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
.ex-head h3 { margin: 0; font-size: 1.05rem; }
.lenses { display: flex; flex-wrap: wrap; gap: 0.25rem; }
.lenses button { background: var(--panel); color: var(--muted); border: 1px solid var(--border); border-radius: 6px; padding: 0.25rem 0.55rem; font-size: 0.74rem; cursor: pointer; }
.lenses button.on { background: var(--good); color: var(--on-good); border-color: var(--good); }

.canvas { overflow-x: auto; margin: 0.9rem 0; }
svg { width: 100%; min-width: 640px; height: auto; display: block; }
.edges line { stroke: var(--border); stroke-width: 1.5; transition: opacity 0.2s; }
.edges line.dim { opacity: 0.15; }
.edges line.trail { stroke: var(--good); stroke-width: 2.5; }
.node { cursor: pointer; }
.node rect { fill: var(--panel); stroke: var(--border); stroke-width: 1.5; transition: all 0.2s; }
.node text { fill: var(--text); font-size: 12px; text-anchor: middle; font-family: inherit; pointer-events: none; }
.node:hover rect { stroke: var(--accent); }
.node.sel rect { stroke: var(--accent); fill: var(--accent-soft); stroke-width: 2; }
.node.dim { opacity: 0.28; }
.node:focus-visible { outline: none; }
.node:focus-visible rect { stroke: var(--accent); stroke-width: 2; }

.legend { display: flex; flex-wrap: wrap; gap: 0.9rem; margin: 0.1rem 0 0.2rem; font-size: 0.72rem; color: var(--muted); }
.lg { display: inline-flex; align-items: center; gap: 0.35rem; }
.sw { width: 0.85rem; height: 0.5rem; border-radius: 2px; flex: 0 0 auto; }
.sw.sel { background: var(--accent-soft); border: 1.5px solid var(--accent); }
.sw.trail { background: var(--good); height: 2px; }
.hint { font-style: italic; }

.detail { border: 1px solid var(--border); border-left: 3px solid var(--accent); border-radius: 0 8px 8px 0; padding: 0.7rem 0.9rem; background: var(--panel); }
.detail-head { display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.35rem; }
.detail-head code { font-size: 0.75rem; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 0.05rem 0.35rem; color: var(--muted); }
.detail p { margin: 0 0 0.4rem; font-size: 0.88rem; }
.detail ul { margin: 0; padding-left: 1.1rem; }
.detail li { font-size: 0.82rem; color: var(--muted); margin: 0.1rem 0; }
</style>
