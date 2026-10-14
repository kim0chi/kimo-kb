<script setup lang="ts">
import { ArrowLeft, ArrowRight, Pencil, Trash2 } from '@lucide/vue'
import { formatSgd, nextMonth, parseAmountCents } from '~~/lib/money'
import type { MoneyEntry, MoneyKind, MoneyMonth } from '~~/server/utils/money'

useHead({ title: 'Money — Kimo' })

function singaporeDate() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = (name: string) => parts.find(item => item.type === name)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}
const today = singaporeDate()
const month = ref(today.slice(0, 7))
const { data, status, error, refresh } = await useFetch<MoneyMonth>('/api/money', { query: { month } })
const monthTitle = computed(() => new Intl.DateTimeFormat('en-SG', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month.value}-01T00:00:00Z`)))
const canGoForward = computed(() => month.value < today.slice(0, 7))
function changeMonth(direction: number) {
  if (direction > 0) month.value = nextMonth(month.value)
  else {
    const [year, part] = month.value.split('-').map(Number)
    month.value = part === 1 ? `${year - 1}-12` : `${year}-${String(part - 1).padStart(2, '0')}`
  }
}

const limitEditing = ref(false)
const limitInput = ref('')
const limitBusy = ref(false)
const limitError = ref('')
const limitSaved = ref(false)
const limitRevision = ref(0)
watch([limitInput, month, limitEditing], () => { limitRevision.value++ }, { flush: 'sync' })
function editLimit() {
  limitInput.value = data.value?.limitCents == null ? '' : (data.value.limitCents / 100).toFixed(2)
  limitError.value = ''
  limitSaved.value = false
  limitEditing.value = true
}
async function saveLimit() {
  const value = limitInput.value.trim() ? parseAmountCents(limitInput.value, true) : null
  if (limitInput.value.trim() && value === null) { limitError.value = 'Enter an amount with up to two decimal places.'; return }
  const submittedMonth = month.value
  const submittedRevision = limitRevision.value
  limitBusy.value = true
  limitError.value = ''
  try {
    await $fetch('/api/money/budget', { method: 'PUT', body: { month: submittedMonth, limitCents: value } })
    if (month.value === submittedMonth) await refresh()
    if (month.value === submittedMonth && limitRevision.value === submittedRevision) {
      limitEditing.value = false
      limitSaved.value = true
    }
  } catch {
    if (month.value === submittedMonth && limitRevision.value === submittedRevision)
      limitError.value = 'The limit could not be saved. Try again.'
  }
  finally { limitBusy.value = false }
}

const kind = ref<MoneyKind>('expense')
const amount = ref('')
const category = ref('')
const note = ref('')
const date = ref(today)
const editingId = ref<string | null>(null)
const entryBusy = ref(false)
const entryError = ref('')
const entrySaved = ref('')
const deletingId = ref<string | null>(null)
const deleteBusy = ref(false)
const draftRevision = ref(0)
watch([kind, amount, category, note, date, editingId, month], () => { draftRevision.value++ }, { flush: 'sync' })
function resetEntry() {
  editingId.value = null
  kind.value = 'expense'
  amount.value = ''
  category.value = ''
  note.value = ''
  date.value = month.value === today.slice(0, 7) ? today : `${month.value}-01`
  entryError.value = ''
}
function editEntry(entry: MoneyEntry) {
  editingId.value = entry.id
  kind.value = entry.kind
  amount.value = (entry.amountCents / 100).toFixed(2)
  category.value = entry.category
  note.value = entry.note
  date.value = entry.date
  entryError.value = ''
  entrySaved.value = ''
  document.getElementById('entry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
watch(month, () => { resetEntry(); limitEditing.value = false; limitSaved.value = false; entrySaved.value = ''; deletingId.value = null })
async function saveEntry() {
  const amountCents = parseAmountCents(amount.value)
  if (amountCents === null) { entryError.value = 'Enter an amount greater than zero, with up to two decimal places.'; return }
  if (!category.value.trim()) { entryError.value = 'Add a category so you can recognise this entry later.'; return }
  if (!date.value.startsWith(`${month.value}-`)) { entryError.value = `Choose a date in ${monthTitle.value}.`; return }
  entryBusy.value = true
  entryError.value = ''
  const wasEditing = Boolean(editingId.value)
  const submittedMonth = month.value
  const submittedRevision = draftRevision.value
  try {
    await $fetch(editingId.value ? `/api/money/entries/${editingId.value}` : '/api/money/entries', {
      method: editingId.value ? 'PATCH' : 'POST',
      body: { kind: kind.value, amountCents, category: category.value.trim(), note: note.value.trim(), date: date.value },
    })
    if (month.value === submittedMonth) await refresh()
    if (month.value === submittedMonth && draftRevision.value === submittedRevision) {
      resetEntry()
      entrySaved.value = wasEditing ? 'Entry updated.' : 'Entry saved.'
    }
  } catch {
    if (month.value === submittedMonth && draftRevision.value === submittedRevision)
      entryError.value = 'The entry could not be saved. Check the details and try again.'
  }
  finally { entryBusy.value = false }
}
async function deleteEntry(id: string) {
  const submittedMonth = month.value
  deleteBusy.value = true
  entryError.value = ''
  try {
    await $fetch(`/api/money/entries/${id}`, { method: 'DELETE' })
    if (month.value === submittedMonth) await refresh()
    if (month.value === submittedMonth && deletingId.value === id) {
      deletingId.value = null
      entrySaved.value = 'Entry removed.'
      if (editingId.value === id) resetEntry()
    }
  } catch {
    if (month.value === submittedMonth) entryError.value = 'The entry could not be removed. Try again.'
  }
  finally { deleteBusy.value = false }
}
const remaining = computed(() => data.value?.limitCents == null ? null : data.value.limitCents - data.value.spentCents)
const progress = computed(() => {
  if (data.value?.limitCents == null) return 0
  if (data.value.limitCents === 0) return data.value.spentCents > 0 ? 100 : 0
  return Math.min(100, Math.round(data.value.spentCents / data.value.limitCents * 100))
})
function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}
</script>

<template>
  <div class="money-page">
    <header class="money-head">
      <div><h1>Money</h1><p>Keep track of what came in and what went out. All amounts are in SGD.</p></div>
      <div class="month-picker" aria-label="Choose month">
        <button type="button" aria-label="Previous month" @click="changeMonth(-1)"><ArrowLeft :size="18" aria-hidden="true" /></button>
        <span aria-live="polite">{{ monthTitle }}</span>
        <button type="button" aria-label="Next month" :disabled="!canGoForward" @click="changeMonth(1)"><ArrowRight :size="18" aria-hidden="true" /></button>
      </div>
    </header>

    <p v-if="status === 'pending'" class="message" role="status">Loading this month…</p>
    <div v-else-if="error" class="message error" role="alert">This month could not be loaded. <button type="button" @click="refresh()">Try again</button></div>
    <template v-else-if="data">
      <div class="money-layout">
        <section class="overview" aria-labelledby="budget-title">
          <div class="section-title"><h2 id="budget-title">Spending limit</h2><button v-if="!limitEditing" type="button" class="text-button" @click="editLimit">{{ data.limitCents == null ? 'Set limit' : 'Change limit' }}</button></div>
          <form v-if="limitEditing" class="limit-form" @submit.prevent="saveLimit">
            <label for="limit-amount">Monthly limit in SGD</label>
            <div class="limit-controls"><input id="limit-amount" v-model="limitInput" type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 800.00" /><button type="submit" :disabled="limitBusy">{{ limitBusy ? 'Saving…' : 'Save limit' }}</button></div>
            <p class="field-note">Leave empty to remove the limit. Income does not increase it.</p>
            <p v-if="limitError" class="error" role="alert">{{ limitError }}</p>
            <button type="button" class="text-button" @click="limitEditing = false">Cancel</button>
          </form>
          <template v-else>
            <p v-if="data.limitCents == null" class="no-limit">No limit set for this month.</p>
            <template v-else>
              <p class="budget-amount">{{ formatSgd(data.spentCents) }} <span>spent of {{ formatSgd(data.limitCents) }}</span></p>
              <div class="budget-track" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100" :aria-label="`Spent ${formatSgd(data.spentCents)} of ${formatSgd(data.limitCents)} monthly limit`"><span :style="{ width: progress + '%' }" :class="{ exceeded: remaining !== null && remaining < 0 }" /></div>
              <p class="remaining" :class="{ over: remaining !== null && remaining < 0 }">{{ remaining !== null && remaining < 0 ? `${formatSgd(-remaining)} over limit` : `${formatSgd(remaining ?? 0)} left in limit` }}</p>
            </template>
            <p v-if="limitSaved" class="success" role="status">Limit saved.</p>
          </template>
          <dl class="month-totals"><div><dt>Income</dt><dd>{{ formatSgd(data.incomeCents) }}</dd></div><div><dt>Expenses</dt><dd>{{ formatSgd(data.spentCents) }}</dd></div><div><dt>Net this month</dt><dd :class="{ over: data.incomeCents - data.spentCents < 0 }">{{ formatSgd(data.incomeCents - data.spentCents) }}</dd></div></dl>
          <p class="scope-note">Net is income minus expenses recorded here, not your bank balance.</p>
        </section>

        <section id="entry-form" class="entry-section" aria-labelledby="entry-title">
          <h2 id="entry-title">{{ editingId ? 'Edit entry' : 'Add an entry' }}</h2>
          <form @submit.prevent="saveEntry">
            <div class="kind-choice" role="group" aria-label="Entry type"><button type="button" :class="{ chosen: kind === 'expense' }" :aria-pressed="kind === 'expense'" @click="kind = 'expense'">Expense</button><button type="button" :class="{ chosen: kind === 'income' }" :aria-pressed="kind === 'income'" @click="kind = 'income'">Income</button></div>
            <div class="form-grid"><label>Amount · SGD<input v-model="amount" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" required /></label><label>Date<input v-model="date" type="date" :min="`${month}-01`" :max="`${month}-${new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()}`" required /></label></div>
            <label>Category<input v-model="category" type="text" maxlength="60" :placeholder="kind === 'expense' ? 'e.g. Groceries' : 'e.g. Salary'" required /></label>
            <label><span class="label-line">Note <small>(optional)</small></span><input v-model="note" type="text" maxlength="500" placeholder="What was this for?" /></label>
            <p v-if="entryError" class="error" role="alert">{{ entryError }}</p>
            <p v-if="entrySaved" class="success" role="status">{{ entrySaved }}</p>
            <div class="form-actions"><button type="submit" class="save-button" :disabled="entryBusy">{{ entryBusy ? 'Saving…' : editingId ? 'Save changes' : 'Save entry' }}</button><button v-if="editingId" type="button" class="text-button" @click="resetEntry">Cancel edit</button></div>
          </form>
        </section>
      </div>

      <section class="entries" aria-labelledby="entries-title">
        <div class="section-title"><h2 id="entries-title">Entries</h2><span>{{ data.entries.length }} this month</span></div>
        <p v-if="!data.entries.length" class="empty">Nothing recorded for {{ monthTitle }} yet. Add an expense or income to start.</p>
        <ul v-else><li v-for="entry in data.entries" :key="entry.id" class="entry-row">
          <div class="entry-main"><span class="entry-date">{{ dateLabel(entry.date) }}</span><div><strong>{{ entry.category }}</strong><p v-if="entry.note">{{ entry.note }}</p></div></div>
          <div class="entry-end"><span class="entry-amount" :class="entry.kind">{{ entry.kind === 'expense' ? '−' : '+' }}{{ formatSgd(entry.amountCents) }}</span><div class="entry-actions"><button type="button" :aria-label="`Edit ${entry.category} entry`" @click="editEntry(entry)"><Pencil :size="16" aria-hidden="true" /></button><button type="button" :aria-label="`Remove ${entry.category} entry`" @click="deletingId = entry.id"><Trash2 :size="16" aria-hidden="true" /></button></div></div>
          <div v-if="deletingId === entry.id" class="delete-confirm"><span>Remove this entry?</span><button type="button" :disabled="deleteBusy" @click="deleteEntry(entry.id)">{{ deleteBusy ? 'Removing…' : 'Remove' }}</button><button type="button" :disabled="deleteBusy" @click="deletingId = null">Cancel</button></div>
        </li></ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */
.money-page{max-width:68rem}.money-head{display:flex;align-items:flex-end;justify-content:space-between;gap:1.5rem;flex-wrap:wrap;border-bottom:1px solid var(--border);padding-bottom:1.5rem;margin-bottom:2rem}.money-head h1{font:600 2.35rem/1.15 var(--font-ui);letter-spacing:-.025em;margin:0}.money-head p{color:var(--muted);font-size:.9rem;margin:.4rem 0 0;max-width:36rem}.month-picker{display:flex;align-items:center;gap:.35rem;min-width:14rem;justify-content:space-between}.month-picker span{font-weight:700;white-space:nowrap;text-align:center}.month-picker button,.entry-actions button{display:grid;place-items:center;width:2.75rem;height:2.75rem;background:none;border:1px solid var(--border);border-radius:.55rem;color:var(--text);cursor:pointer}.month-picker button:hover:not(:disabled),.entry-actions button:hover{border-color:var(--accent);color:var(--accent)}button:disabled{opacity:.45;cursor:not-allowed}.money-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(18rem,.9fr);gap:3rem;align-items:start}.overview,.entry-section{min-width:0}.entry-section{border-left:1px solid var(--border);padding-left:3rem}h2{font:700 1rem var(--font-ui);margin:0}.section-title{display:flex;align-items:baseline;justify-content:space-between;gap:1rem}.section-title span{color:var(--muted);font-size:.8rem}.text-button{border:0;padding:.35rem 0;background:none;color:var(--accent);font:600 .83rem var(--font-ui);cursor:pointer;white-space:nowrap}.text-button:hover{text-decoration:underline}.budget-amount{font:600 clamp(1.5rem,3vw,2.2rem)/1.2 var(--font-ui);letter-spacing:-.02em;margin:1.6rem 0 .9rem;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.budget-amount span{display:block;font:400 .84rem var(--font-ui);color:var(--muted);letter-spacing:0;margin-top:.35rem}.budget-track{height:.5rem;background:var(--border);border-radius:1rem;overflow:hidden}.budget-track span{display:block;height:100%;background:var(--accent);border-radius:1rem}.budget-track span.exceeded{background:var(--critical)}.remaining{font-size:.85rem;font-weight:700;margin:.65rem 0 2rem}.over{color:var(--critical)}.no-limit{color:var(--muted);font-size:.9rem;margin:1.5rem 0 2rem}.month-totals{border-top:1px solid var(--border);margin:0}.month-totals div{display:flex;justify-content:space-between;gap:1rem;padding:.72rem 0;border-bottom:1px solid var(--border);font-size:.88rem}.month-totals dt{color:var(--muted)}.month-totals dd{margin:0;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}.scope-note,.field-note{color:var(--muted);font-size:.75rem;line-height:1.5}.scope-note{margin:.75rem 0 0}.entry-section h2{margin-bottom:1.2rem}.entry-section form,.limit-form{display:flex;flex-direction:column;gap:.9rem}.entry-section label,.limit-form label{display:flex;flex-direction:column;gap:.35rem;font-size:.8rem;font-weight:700}.entry-section label span{font-weight:400;color:var(--muted)}.entry-section input,.limit-form input{width:100%;min-width:0;min-height:2.75rem;border:1px solid var(--border);border-radius:.55rem;background:var(--panel);color:var(--text);padding:.55rem .75rem;font:400 .9rem var(--font-ui)}.entry-section input::placeholder,.limit-form input::placeholder{color:var(--muted)}.entry-section input:focus,.limit-form input:focus{border-color:var(--accent)}.form-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:.8rem}.kind-choice{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--border);border-radius:.6rem;padding:.2rem;gap:.2rem}.kind-choice button{min-height:2.5rem;background:none;border:0;border-radius:.4rem;color:var(--muted);font:600 .85rem var(--font-ui);cursor:pointer}.kind-choice button.chosen{background:var(--accent-soft);color:var(--accent)}.kind-choice button:hover:not(.chosen){color:var(--text)}.form-actions,.limit-controls{display:flex;align-items:center;gap:.8rem}.limit-controls input{flex:1}.save-button,.limit-controls button{min-height:2.75rem;border:0;border-radius:.55rem;background:var(--accent);color:var(--on-accent);padding:.5rem .95rem;font:700 .84rem var(--font-ui);cursor:pointer;white-space:nowrap}.save-button:hover,.limit-controls button:hover{filter:brightness(1.08)}.field-note{margin:-.35rem 0 0}.error{color:var(--critical);font-size:.82rem;margin:.2rem 0}.error button{background:none;border:0;color:var(--accent);font:inherit;cursor:pointer}.success{color:var(--good);font-size:.82rem;margin:.2rem 0}.message{padding:2rem 0;color:var(--muted)}.entries{margin-top:3rem;border-top:1px solid var(--border);padding-top:1.5rem}.entries ul{list-style:none;margin:1rem 0 0;padding:0}.entry-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;border-bottom:1px solid var(--border);padding:.8rem 0}.entry-main{display:flex;align-items:baseline;gap:1rem;min-width:0;flex:1}.entry-main>div{min-width:0}.entry-date{color:var(--muted);font-size:.78rem;min-width:3.6rem;white-space:nowrap}.entry-main strong{font-size:.9rem;overflow-wrap:anywhere}.entry-main p{color:var(--muted);font-size:.76rem;margin:.12rem 0 0;overflow-wrap:anywhere}.entry-end{display:flex;align-items:center;gap:1.1rem}.entry-amount{font-size:.9rem;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}.entry-amount.income{color:var(--good)}.entry-actions{display:flex;gap:.35rem}.entry-actions button{width:2.5rem;height:2.5rem}.delete-confirm{width:100%;display:flex;align-items:center;justify-content:flex-end;gap:.8rem;font-size:.82rem}.delete-confirm button{min-height:2.5rem;border:1px solid var(--border);border-radius:.5rem;padding:.4rem .7rem;background:var(--panel);color:var(--text);font:600 .82rem var(--font-ui);cursor:pointer}.delete-confirm button:first-of-type{color:var(--critical)}.empty{color:var(--muted);font-size:.9rem;margin:1rem 0}@media(max-width:56rem){.money-layout{grid-template-columns:minmax(0,1fr);gap:2.5rem}.entry-section{border-left:0;border-top:1px solid var(--border);padding:1.5rem 0 0}}@media(max-width:30rem){.money-head{align-items:flex-start}.month-picker{width:100%}.form-grid{grid-template-columns:minmax(0,1fr)}.entry-main{flex-basis:100%}.entry-end{width:100%;justify-content:space-between;padding-left:4.6rem}.delete-confirm{justify-content:flex-start;flex-wrap:wrap}.limit-controls{flex-wrap:wrap}.limit-controls button{width:100%}}
.entry-section label .label-line{display:inline-flex;align-items:baseline;gap:.35rem;font-weight:700;color:var(--text)}.entry-section label .label-line small{font-size:.8rem;font-weight:400;color:var(--muted)}
.entry-actions button{width:2.75rem;height:2.75rem}
@media(max-width:30rem){.entry-end{padding-left:0;gap:.5rem;flex-wrap:wrap}.entry-actions{margin-left:auto}}
</style>
