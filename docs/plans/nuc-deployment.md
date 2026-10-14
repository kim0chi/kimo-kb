# NUC-0024 deployment runbook

Prepared 2026-10-14. Status: **not deployed**. NUC-0024 responds on the
tailnet, but SSH authentication from this workstation is unavailable. The
current branch remains in its reserved KB worktree. Benedict chose a Windows
OpenSSH account as the access method; the actual account name is still needed.

## Access and prerequisites

1. Confirm the authenticated Windows/WSL account and compare the NUC's SSH
   host fingerprint before adding a host alias. The existing known-host entry
   for its Tailscale IP is ED25519
   `SHA256:UDrmqhzRdBypVIEf5X7JPJONKBfmgPlRXPqJrBpuTM0`.
2. Check free disk/RAM, WSL systemd/startup behavior, Tailscale version and
   whether Windows can reach an HTTP listener bound to WSL loopback. Existing
   reports of a 6 GB / 4 CPU WSL cap are historical.
3. Choose a stable WSL path for the KB checkout, a read-only checkout or mount
   of `knowledge` and `evo-work`, and a separate backed-up directory for
   `kb.sqlite`. Preserve the exact paths across build and run; Nuxt Content
   indexes the external Markdown at build time.
4. Review this branch and the source-document scope before exposing the app
   to the tailnet. The app has no own login; tailnet membership and ACLs are
   its access boundary.

## WSL build and service

Set `KB_LIBRARY` to the NUC path for `knowledge`,
`KB_CONTENT_ROOT` to the `evo-work` path and `KB_STATE_DB` to the state
volume path. Use Node 22 with the same native-module ABI for install, build
and run. In the checked-out KB repository:

```bash
node --version                         # require 22.x
npm ci
npm test
KB_LIBRARY=/path/to/knowledge KB_CONTENT_ROOT=/path/to/evo-work npm run build
KB_STATE_DB=/srv/kimo/state/kb.sqlite HOST=127.0.0.1 PORT=3000 node .output/server/index.mjs
```

If `npm` comes from an old NVM install despite `mise exec`, put the
Node 22 bin directory first on `PATH`. `better-sqlite3` must load under
Node 22. The app-state environment variable is read when the server starts;
the source paths must also be set during the content build.

To enable the personal study companion, set `OPENAI_API_KEY` only in the
protected service environment. `OPENAI_MODEL` defaults to `gpt-6.1-sol`.
`KB_AI_ALLOWED_NOTEBOOKS` defaults to `cs`; inspect all documents before
adding another library-internal notebook. The server always blocks SI and
external reference-manifest roots. A ChatGPT subscription does not supply an
API key. API requests include `store: false`, but follow the provider's
[data controls](https://developers.openai.com/api/docs/guides/your-data) for
provider-side retention.

Use a systemd service or equivalent restart policy for the final Node command,
with a dedicated user and environment file. Verify that WSL and the service
actually start after a Windows reboot; a systemd unit alone does not establish
that behavior. Do not put secrets or the SQLite state directory in the repo.

## Private HTTPS route

From an Administrator Windows terminal, only after confirming Windows can
reach the WSL listener at `http://127.0.0.1:3000`, run
`tailscale serve --bg 3000`. It proxies to localhost and provides a
tailnet-only HTTPS URL. Check `tailscale serve status` and open that URL on
Benedict's laptop and phone over cellular. Do not enable Funnel. If Windows
cannot reach WSL loopback, resolve that forwarding path first; do not bind the
app to every LAN interface as a workaround.

Tailscale documents the current Serve command and its persistent `--bg`
behavior: <https://tailscale.com/docs/reference/tailscale-cli/serve>.

## State and recovery

The corpus stays in Git. Personal state lives in SQLite. Use a new backup
filename each time:

```bash
KB_STATE_DB=/srv/kimo/state/kb.sqlite npm run backup-state -- /srv/kimo/backups/kb-YYYY-MM-DD.sqlite
```

The backup script uses SQLite's backup API while the app may be running,
refuses to overwrite, and limits backup file permissions. Copy backups to a
separate protected destination and test restoration into an isolated path.
Rebuilds must not replace the state volume.

Before declaring deployment complete, check: Today and Library show the
expected notebooks; create and reopen a work item after restart; save a
learning entry; complete one recall exercise; verify phone layout and
tailnet-only access; restore one backup into a scratch DB. If OpenAI is
configured, verify that a CS source works and an SI source returns 403.
Record the NUC
resource and service versions actually observed.
