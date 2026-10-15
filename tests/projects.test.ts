import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import Database from 'better-sqlite3'
import { migrateProjects, projectStore } from '../lib/projects.ts'
import { publisherAccess } from '../server/utils/publisher-access.ts'

test('artifact revisions preserve history and cannot silently overwrite concurrent work or mark a newer revision read', () => {
  const db = new Database(':memory:')
  db.exec('CREATE TABLE work_items(id TEXT PRIMARY KEY,project TEXT)')
  migrateProjects(db)
  const store = projectStore(db)
  const input = { key: 'feature/guide', title: 'A guide', content: 'First explanation', kind: 'explanation', expectedRevision: 0 }
  const first = store.publish('kimo', input, 'test')
  assert.equal(first.readAt, null)
  store.markRead('kimo', first.id, 1, true)
  assert.ok(store.get('kimo', first.id).readAt)
  const second = store.publish('kimo', { ...input, content: 'Revised explanation', expectedRevision: 1 }, 'test')
  assert.equal(second.revision, 2)
  assert.equal(second.readAt, null)
  assert.throws(() => store.publish('kimo', { ...input, content: 'Conflicting edit', expectedRevision: 1 }, 'test'), /changed/)
  assert.equal(store.markRead('kimo', first.id, 1, true).readAt, null)
  assert.equal(store.history('kimo', first.id).length, 2)
  assert.equal((store.revision('kimo', first.id, 1) as {content:string}).content, 'First explanation')
  assert.throws(() => store.get('si', first.id), /not found/)
  db.prepare('INSERT INTO work_items VALUES (?,?)').run('si-task', 'SI')
  assert.throws(() => store.publish('kimo', { ...input, key: 'wrong-task', taskId: 'si-task' }, 'test'), /this project/)
  assert.throws(() => store.publish('kimo', { ...input, key: 'bad-link', sourceUrl: 'javascript:alert(1)' }, 'test'), /source URL/)
  migrateProjects(db)
  assert.equal(store.get('kimo', first.id).revision, 2)
  db.close()
})

test('publisher credentials are scoped to one project and fail closed', () => {
  const token = 'a'.repeat(40)
  const config = JSON.stringify({ kimo: token, si: 'b'.repeat(40) })
  assert.equal(publisherAccess('Bearer ' + token, 'kimo', config), true)
  assert.equal(publisherAccess('Bearer ' + token, 'si', config), false)
  assert.equal(publisherAccess('Basic ' + token, 'kimo', config), false)
  assert.equal(publisherAccess('Bearer ' + token, 'kimo', '{bad'), false)
  assert.equal(publisherAccess('Bearer ' + token, '__proto__', config), false)
  assert.equal(publisherAccess('Bearer ' + token, 'kimo', undefined), false)
})
