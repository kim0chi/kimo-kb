import type Database from 'better-sqlite3'

// These filenames were preserved during the SI Docs reorganization. Keep the
// old curriculum usable without renaming source documents or guessing by title.
const architecture = [
  '01-introduction', '02-technology-stack', '03-system-architecture',
  '04-design-patterns', '05-domain-modules', '06-data-model', '07-frontend',
  '08-integrations', '09-http-auth', '10-jobs-queues', '11-configuration',
  '12-development-environment', '13-testing', '14-code-quality', '15-cicd-git',
  '16-deployment-operations', '17-glossary-appendices',
]
export const movedSourcePaths: Record<string, string> = Object.fromEntries([
  ...architecture.map(name => ['/si/si-docs/sections/' + name, '/si/si-docs/reference/architecture/' + name]),
  ...['18-spp-and-store-switcher', '19-porto-apiato-and-the-campaign-container'].map(name =>
    ['/si/si-docs/sections/' + name, '/si/si-docs/reference/domains/' + name]),
  ['/si/si-docs/to-read/tech-primer', '/si/si-docs/_legacy/to-read/tech-primer'],
  ['/si/si-docs/to-read/linux-dev-guide', '/si/si-docs/reference/linux-dev-guide'],
])

export function currentSourcePath(path: string): string {
  return Object.hasOwn(movedSourcePaths, path) ? movedSourcePaths[path] : path
}

export function preserveMovedSourceState(db: Database.Database) {
  if (db.prepare("SELECT 1 FROM meta WHERE key='si_source_paths_v1'").get()) return
  db.transaction(() => {
    for (const [oldPath, newPath] of Object.entries(movedSourcePaths)) {
      db.prepare(`INSERT OR IGNORE INTO reading_state(doc_path,status,updated_at)
        SELECT ?,status,updated_at FROM reading_state WHERE doc_path=?`).run(newPath, oldPath)
      db.prepare(`INSERT OR IGNORE INTO notes(doc_path,body,updated_at)
        SELECT ?,body,updated_at FROM notes WHERE doc_path=?`).run(newPath, oldPath)
    }
    db.prepare("INSERT INTO meta(key,value) VALUES ('si_source_paths_v1',?)").run(new Date().toISOString())
  })()
}
