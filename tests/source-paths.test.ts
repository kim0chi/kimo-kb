import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import Database from 'better-sqlite3'
import { currentSourcePath, preserveMovedSourceState } from '../lib/source-paths.ts'

test('known moved SI sources resolve without guessing unrelated or planned documents', () => {
  assert.equal(currentSourcePath('/si/si-docs/sections/06-data-model'), '/si/si-docs/reference/architecture/06-data-model')
  assert.equal(currentSourcePath('/si/si-docs/sections/18-spp-and-store-switcher'), '/si/si-docs/reference/domains/18-spp-and-store-switcher')
  assert.equal(currentSourcePath('/si/si-docs/to-read/linux-dev-guide'), '/si/si-docs/reference/linux-dev-guide')
  assert.equal(currentSourcePath('/si/si-docs/sections/planned-topic'), '/si/si-docs/sections/planned-topic')
  assert.equal(currentSourcePath('/another/06-data-model'), '/another/06-data-model')
})

test('moved document state and notes survive without overwriting newer canonical state', () => {
  const db = new Database(':memory:')
  db.exec(`CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT);
    CREATE TABLE reading_state(doc_path TEXT PRIMARY KEY,status TEXT,updated_at TEXT);
    CREATE TABLE notes(doc_path TEXT PRIMARY KEY,body TEXT,updated_at TEXT);`)
  const old = '/si/si-docs/sections/06-data-model', next = currentSourcePath(old)
  db.prepare('INSERT INTO reading_state VALUES (?,?,?)').run(old,'done','old-date')
  db.prepare('INSERT INTO notes VALUES (?,?,?)').run(old,'My original note','old-date')
  db.prepare('INSERT INTO reading_state VALUES (?,?,?)').run(next,'reading','new-date')
  preserveMovedSourceState(db)
  assert.equal((db.prepare('SELECT status FROM reading_state WHERE doc_path=?').get(next) as {status:string}).status,'reading')
  assert.equal((db.prepare('SELECT body FROM notes WHERE doc_path=?').get(next) as {body:string}).body,'My original note')
  assert.ok(db.prepare('SELECT * FROM notes WHERE doc_path=?').get(old))
  preserveMovedSourceState(db)
  assert.equal((db.prepare('SELECT COUNT(*) AS count FROM meta').get() as {count:number}).count,1)
  db.close()
})
