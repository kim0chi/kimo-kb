import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { execFileSync } from 'node:child_process'
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { loadRunnerConfig, runAgentJob, claudeArtifacts } from '../scripts/agent-runner.mjs'

test('runner refuses SI and evo-work repository paths', async t => {
  const root = mkdtempSync(join(tmpdir(), 'kimo-agent-scope-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const repo = join(root, 'evo-work', 'personal-looking')
  mkdirSync(repo, { recursive: true })
  const file = join(root, 'runner.json')
  writeFileSync(file, JSON.stringify({
    runnerId: 'scope-test',
    serverUrl: 'http://127.0.0.1:3000',
    projects: { Personal: { repo } },
  }))
  await assert.rejects(loadRunnerConfig(file), /outside this personal runner scope/)
})

for (const provider of ['codex', 'claude']) test(provider + ' runner commits only its two artifacts on an isolated branch', async t => {
  const root = mkdtempSync(join(tmpdir(), 'kimo-agent-runner-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const repo = join(root, 'repo')
  mkdirSync(repo)
  const git = (...args: string[]) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()
  git('init', '-q')
  git('config', 'user.name', 'Runner Test')
  git('config', 'user.email', 'runner@example.test')
  writeFileSync(join(repo, 'README.md'), '# Test project\n')
  git('add', 'README.md')
  git('commit', '-qm', 'Initial')
  const fleet = join(root, 'fake-fleet')
  writeFileSync(fleet, [
    '#!/bin/sh',
    'repo="$3"',
    'branch="$4"',
    'base="$5"',
    'root="$(dirname "$0")/worktree"',
    'git -C "$repo" worktree add -q -b "$branch" "$root" "$base" || exit 1',
    'printf "%s\\n" "$root"',
  ].join('\n'))
  chmodSync(fleet, 0o700)
  const codex = join(root, 'fake-codex')
  writeFileSync(codex, [
    '#!/bin/sh',
    'root="$PWD"',
    'while [ "$#" -gt 0 ]; do',
    '  if [ "$1" = "--cd" ]; then root="$2"; shift 2; else shift; fi',
    'done',
    'prompt="$(cat)"',
    'guide="$(printf "%s\\n" "$prompt" | awk \'/^Guide file:/ {print $3}\')"',
    'docs="$(printf "%s\\n" "$prompt" | awk \'/^Documentation draft file:/ {print $4}\')"',
    'mkdir -p "$root/docs/learning"',
    'printf "A plain guide with code references.\\n" > "$root/$guide"',
    'printf "A proposed documentation update.\\n" > "$root/$docs"',
  ].join('\n'))
  if (provider === 'claude') writeFileSync(codex, [
    '#!/bin/sh',
    'cat >/dev/null',
    `printf '%s\\n' '{"structured_output":{"guideContent":"A plain guide with code references.","docsContent":"A proposed documentation update."}}'`,
  ].join('\n'))
  chmodSync(codex, 0o700)
  const id = randomUUID()
  let finished: Record<string, unknown> | undefined
  const api = async (path: string, body: Record<string, unknown>) => {
    if (path.endsWith('/heartbeat')) return { cancelRequested: false }
    if (path.endsWith('/finish')) { finished = body; return { job: body } }
    throw new Error('Unexpected API call')
  }
  const result = await runAgentJob(
    { runnerId: 'test-runner', providers: [provider], projects: { Kimo: { repo, base: 'HEAD' } } },
    { id, provider, project: 'Kimo', title: 'Understand the repo', brief: 'Explain README.' },
    api, { fleet, codex, claude: codex },
  )
  assert.equal(result.status, 'ready', JSON.stringify(result))
  assert.equal(finished?.status, 'ready')
  assert.equal(finished?.branch, 'agent/learning-' + id)
  assert.match(String(finished?.commitHash), /^[0-9a-f]{40}$/)
  assert.match(readFileSync(join(root, 'worktree', 'docs', 'learning', id + '-guide.md'), 'utf8'), /plain guide/)
  assert.equal(execFileSync('git', ['-C', join(root, 'worktree'), 'status', '--porcelain'], { encoding: 'utf8' }).trim(), '')
})

// Invalid provider output cannot turn into a committed artifact.
test('Claude results require both bounded artifacts and a successful turn', () => {
  assert.throws(() => claudeArtifacts('{"is_error":true,"subtype":"error_max_turns"}'), /did not complete/)
  assert.throws(() => claudeArtifacts('{"result":"I could not write"}'), /both nonempty/)
  assert.throws(() => claudeArtifacts(JSON.stringify({ structured_output: { guideContent: 'x'.repeat(12001), docsContent: 'ok' } })), /12,000/)
})
