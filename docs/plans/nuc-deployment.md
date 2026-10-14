# NUC-0024 deployment runbook

Updated 2026-10-14. Benedict resumed NUC deployment and requested centralized
Codex, Claude and project workflows. SSH as `Admin` through `ssh si-host` was
verified. The implementation is on `docs/personal-dashboard-plan-20261014`.

## Layout

- Windows 11 NUC-0024: Tailscale `100.95.178.108`, DNS `nuc-0024.tail13b503.ts.net`.
- Ubuntu WSL2 has systemd and Docker. The existing Tally stack listens on 8787;
  Kimo is a separate Compose project and uses Windows/WSL loopback port 3100.
- `/srv/kimo/current` links to the active release directory. Each release has
  application source, a Markdown snapshot and rewritten notebook manifests.
- `/srv/kimo/state/kb.sqlite` stores reading, work, money, learning and jobs.
  The initial import uses SQLite backup from `Documents/kb/data/kb.sqlite`:
  12 reading-state rows and one flashcard schedule. Preview fixtures are excluded.
- `/srv/kimo/secrets/server.env` holds the browser password and separate runner
  token. It is root-only. App state and backups belong to container UID 1000,
  directory mode 700 and database mode 600. No secret is committed to Git.
- Node 22 build/runtime container; app runs as an unprivileged user, with all
  Linux capabilities dropped, a 1.5 GB runtime limit and two CPUs.
- Private HTTPS destination: `https://nuc-0024.tail13b503.ts.net`. Benedict enabled
  Serve / HTTPS in his Tailscale account. The route and certificate were verified
  from the workstation; see [the account-step record](nuc-access.html).

## Documentation snapshot and updates

`deploy/nuc/package.py /new/private/staging/path` copies tracked/unignored
application files and Markdown from configured notebooks, with their navigation
and glossary files. It copies 466 Markdown files in this initial snapshot;
source repositories and their credentials stay on the workstation. Personal
notebooks remain under the library root, so the existing personal-AI scope
check works. External SI and Manifesto sources stay outside it.

This is a deployment snapshot, not automatic GitHub or documentation sync.
To update, create a new staging directory and tar archive, transfer over SCP,
extract into a new `/srv/kimo/releases/<release>` directory, then run:

```sh
cd /srv/kimo/releases/<release>
docker compose -p kimo build
docker compose -p kimo up -d
```

The Compose file uses the same persistent state and secret paths. Preserve the
previous release and image for rollback. Never overwrite/import the initial
state database during an update. Replace the `current` symlink only after the
new release passes health and authenticated API checks.

Docker build installs dependencies, runs the tests, then builds Nuxt against
the exact source paths used at runtime. Rebuilding is required when the
Markdown snapshot changes because Nuxt Content indexes it at build time.

## Access and account connections

Browser access requires username `kimo`, a generated password, and the private
Tailscale route. The local handoff file is `~/.config/kimo/access.txt` (mode 600).
The runner uses a separate bearer token and cannot use it for browser APIs.
Do not print either credential in logs or paste it into chat.

The workstation already reports Codex signed in with ChatGPT and Claude Code
signed in with a Claude subscription. The runner invokes those CLIs locally;
it does not copy their credentials to the NUC. These are supported CLI sign-ins:
[official OpenAI authentication](https://learn.chatgpt.com/docs/auth) and
[Claude Code authentication](https://code.claude.com/docs/en/authentication).

Repository learning jobs support either provider. The runner reserves a fresh
branch/worktree through agent-fleet, writes exactly two Markdown artifacts,
checks the diff, commits locally, and returns the content and commit to Kimo.
Codex uses workspace-write isolation. Claude uses restricted read-only file tools, no MCP connections or custom
hooks, and no interactive approvals. It returns two structured Markdown
fields. The runner validates their size, creates only the two expected files
without overwriting or following directory symlinks, and then checks the diff. Failures retain the worktree for inspection.
No merge, push or cleanup happens automatically.

The application handles newly queued Kimo jobs. It does not import ChatGPT or
Claude web chat histories, or control existing editor/terminal agent sessions.
Only the personal Kimo repository is registered initially. SI/evo-work runner
paths remain blocked under the user's personal-context choice.

The separate source-document guide API still needs `OPENAI_API_KEY` on the
server; no key was supplied. The default personal scope remains `cs`. Neither
CLI login automatically supplies an API key to that feature.

## Workstation runner

Config: `~/.config/kimo/runner.json`; secret: `~/.config/kimo/runner.env`.
Installed script: `~/.local/share/kimo/runner/agent-runner.mjs`.
User service: `~/.config/systemd/user/kimo-runner.service`.

```sh
systemctl --user status kimo-runner
journalctl --user -u kimo-runner -n 30
systemctl --user restart kimo-runner
```

The runner processes one job at a time. Kimo records online/offline status,
provider, branch, result and read/unread state. Jobs remain queued when the
workstation sleeps; interrupted running jobs become failed instead of replaying
against a possibly dirty worktree. Process groups get SIGTERM and then SIGKILL
if they do not exit within five seconds.

## Startup and recovery

Docker has `restart: unless-stopped`. Windows already has an interactive
`WSL Ubuntu keep-alive` scheduled task for Admin. WSL starts after Windows login;
a restart without login still leaves Kimo unavailable. This deployment does
not change the office machine's login policy or reboot it.

Serve is configured on HTTPS port 443 and leaves the existing HTTP 8787 route
in place. Check `tailscale serve status --json` in PowerShell; never use Funnel.
[Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve) is private
to the tailnet and subject to its access rules.

For live SQLite backup, from `/srv/kimo/current` in WSL:

```sh
docker compose -p kimo exec -T dashboard node .output/server/backup-state.mjs /srv/kimo/backups/kb-<unique-timestamp>.sqlite
```

The script uses SQLite's backup API, refuses overwrites, and creates a private
file. `kimo-backup.timer` runs `/srv/kimo/backup.sh` daily at 03:00 Singapore
time, with a catch-up run when WSL next starts. Backups are retained; no
automatic deletion policy is installed. Keep an additional protected copy on a separate machine. Restore into a
scratch database and run `PRAGMA integrity_check` before using a backup. A
production restore requires stopping only the Kimo container, preserving the
current state and sidecars, then installing the backup with UID 1000/mode 600.

## Verification

Observed on 2026-10-14:

- Private HTTPS and certificate work from the workstation; unauthenticated
  HTML, data API and content SQL-dump requests return 401. A runner token
  cannot authenticate to browser APIs. Existing Tally port 8787 remains intact.
- Five notebooks expose 463 indexed documents (466 snapshot files include
  navigation support files). Exactly three CS sources are eligible for the
  disabled source-guide API; SI and Manifesto remain excluded.
- 32 local tests pass. The Docker build passed its then-current 31 tests and
  completed the production Nuxt build. Runtime Node is v22.23.3.
- Browser checks passed at 375px and 1280px for Today, Connections, Workflows,
  Money and Library: no horizontal overflow or browser errors. Both agent
  choices are present. A physical phone over cellular was not tested.
- Migrated state has 12 reading rows and one flashcard schedule. State and
  backup file permissions were verified; live SQLite integrity and a scratch
  restoration from backup both return `ok`.
- Codex job `57379050-bf15-4dd5-8dda-abe574a4d534` completed through the live
  queue, committed `edc8468`, and returned its unread guide and documentation
  draft. The first Claude run wrote no files and remains failed for inspection;
  the adapter now uses a validated structured response. Claude job
  `ab176f1f-9ec4-476a-973c-b2f95aaa786d` completed and committed `0b63dc0`.
- `kimo-runner.service` is enabled on the workstation. `kimo-backup.timer` is
  enabled in WSL and its initial backup succeeded. Windows' existing WSL task
  is explicitly a logon trigger for Admin; reboot-without-login recovery has
  not been established.

Both providers completed live learning jobs. Artifact-content hashes and the
read timestamp survived a real Kimo container restart. The mobile reader's
Mark unread button was exercised, and both guides were left unread for Benedict.
The container is healthy. The current app image is also preserved as
`kimo:20261014-472ef1b`; the workstation runner includes fix `507e1d2`.
A protected off-machine backup copy is held in `~/.config/kimo/backups/`.

Known boundaries: agent execution needs the workstation awake; WSL needs Windows
login after reboot; library refresh is a rebuild, not continuous synchronization;
API source guides are unconfigured; existing chat/IDE sessions are not imported;
SI repository execution is not enabled. These boundaries are not described as
completed integrations in Connections.
