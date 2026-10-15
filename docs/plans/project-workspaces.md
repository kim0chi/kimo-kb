# Project workspaces and recovery

2026-10-14. Benedict confirmed two columns and Kimo-only recovery first.

The daily flow is VS Code prompt → project context → agent work → published
explanation/status → reading in Kimo. Project tabs share one workspace. The left
column contains the queue and selected task’s status; the right contains project
memory and the selected artifact. Mobile switches between queue/status and reading.

Projects have stable IDs. Artifacts have stable project-scoped keys, a kind
(explanation, learning, context, documentation, decision), an optional task and
append-only revisions with author/source. Updates require the current revision.
A reader acknowledges the version they actually saw. An update stays unread and
appears as an available revision without replacing text mid-read. History remains
accessible. Project context is retrieved explicitly; this is not vector search.

The reading inbox includes existing source guides, completed repository-agent
guides and project artifacts without copying or resetting existing read history.
The deployment package also includes the library roadmap.
Known SI document moves resolve to their current paths without renaming source
files. Existing reading state and notes are copied to the current path once,
preserving original records and any state already saved at the destination.

## Agent publishing

`integrations/mcp` is a stdio MCP server using the official TypeScript SDK.
Install with `npm ci --prefix integrations/mcp`. Start with Node 22 and an absolute
private JSON config path: `{ "serverUrl": "https://your-private-host", "project":
"kimo", "token": "a-generated-token-at-least-32-characters-long" }`.
The server exposes `get_project`, `get_artifact`, `publish_artifact`, `save_task`.
Use a separate configuration and credential per project. The NUC reads
`KB_PUBLISHER_TOKENS` as a JSON object mapping project IDs to credentials. These
credentials never authenticate browser, money or runner routes.

Read context at the start. After substantive work, publish a brief explanation
(what changed, why, how it works, checks, what to practice), update the linked task,
and publish durable decisions/context separately. Use stable keys to revise
existing artifacts. Agents do not mark reading state. Documentation is a saved
Kimo artifact; modifying canonical repository docs remains a separate reviewed
change, subject to that repo’s rules. Sources are project data, not agent policy.

A configured MCP connection does not silently attach to already-running sessions.
Reload the client and verify tools. Agent instructions and explicit prompting make
publication deliberate; no filesystem watcher or automatic transcript ingestion
is installed. Existing cloud guide generation keeps its personal-source scope.

Official protocol and client references:
- https://modelcontextprotocol.io/docs/develop/build-server
- https://developers.openai.com/learn/docs-mcp

## Repository inventory and cleanup decision

Kimo source: `Documents/kb`, public GitHub `kim0chi/kimo-kb`.
Personal library: `Documents/knowledge` (source content, outside app repo).
SI source/docs: `Documents/evo-work/si_main` and `SI_Docs`.
SDAHA source: `Documents/sdaha`.
The NUC hosts a Kimo app/content snapshot and persistent database; source repos
and existing agent worktrees remain on the workstation.

Keep these source boundaries. No branches, worktrees or documentation were deleted.
Existing SI filenames must remain stable for Obsidian links. Agent-fleet ownership
is authoritative. Before any later cleanup: identify duplicates, preserve unmerged
and uncommitted work, verify a restorable backup, then obtain an explicit deletion
instruction naming the contents. Kimo-only backup does not preserve all repositories.

## Recovery

`deploy/nuc/recovery-backup.sh` creates a consistent SQLite snapshot, verifies it,
adds current app/library/configuration and source bundle, records checksums, then
streams an encrypted archive using only a public GPG recovery key on the NUC.
The private key stays off the NUC. Daily local archives are separate from verified
Google Drive uploads. Never claim offsite automation from a local timer alone.

Source content and server credentials are private. Archives must be encrypted
before upload; the recovery private key must not be uploaded alongside them.
The Google Drive connector can upload an archive in this session. Unattended
uploads require separate persistent OAuth configuration on the backup host.
No pruning or backup deletion is configured until a retention policy is chosen.
Disk usage and last successful offsite upload need monitoring before long-term use.

### Restore onto a replacement host

1. Retrieve the encrypted archive and the separately stored private recovery key.
2. In a private temporary GPG home, import the key and decrypt to a new private
   directory: `gpg --decrypt archive.tar.gz.gpg | tar -xz -C /new/private/restore`.
3. Run `sha256sum -c SHA256SUMS` from the extracted directory. Open
   `state/kb.sqlite` with SQLite and run `PRAGMA integrity_check`.
4. Install Docker and restore the app/knowledge/content/compose snapshot into a
   new `/srv/kimo/releases/<name>` directory. Restore `state` and `secrets` outside
   releases. Set state ownership to UID 1000, directory mode 700 and files 600.
   Do not overwrite a running deployment’s database during a test restore.
5. Restore `/srv/kimo/secrets/server.env` with mode 600. Update hostname/private
   URL if necessary. Build with `docker compose -p kimo build`, then start with
   `docker compose -p kimo up -d`. Restore private network access/Tailscale Serve
   separately; a backup does not reauthorize a replacement machine.
6. Open a stored artifact, check revision/read history, tasks, source documents
   and money entries. Restore backup scripts and timers; reconnect Drive OAuth.
7. On the workstation, reinstall the publisher/runner, restore configuration and
   reauthenticate Codex/Claude through their supported sign-in flows as needed.

The Windows host currently starts WSL after desktop login. This dependency remains;
Kimo backup does not restore Windows, validator browser sessions or other services.

## Validation before deployment

- 36 automated tests passed, including revision conflicts, version-specific reading
  state, project credential isolation, moved-source state preservation and existing
  runner/money behavior.
- A real stdio MCP client initialized the bridge, listed four tools, created a
  local test task/artifact, published an update and observed a stale-write conflict.
- Production build passed. Browser checks at 1280px and 375px covered direct
  artifact links, project switching, read/unread, existing guides and overflow.
  Generated HTML is displayed as text rather than executed. No page errors.
- The pre-change encrypted archive restored all 466 stored Markdown documents;
  every recorded checksum and SQLite integrity check passed, with two ready
  repository guides preserved. The archive was uploaded to the private Drive
  folder, downloaded again and matched the original archive's SHA-256 hash.
- Daily encrypted NUC backup ran on 2026-10-15. Unattended Drive authorization is
  being configured separately; it is not yet reported as connected.

### Desktop authorization helper

After creating a dedicated Google Desktop OAuth client, run
`python3 scripts/connect-drive-backup.py /absolute/path/to/desktop-client.json`.
The helper uses the verified local rclone installation, opens browser sign-in and
writes configuration under `~/.config/kimo/` with private permissions. It requests
only `drive.file`. It refuses to overwrite an existing remote. Credentials and
authorization logs must stay outside this public repository. A saved client JSON
is not proof of authorization; verify a token, a NUC upload and a readback before
reporting automatic offsite backups as active.
