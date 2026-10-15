# Workspace browser access

Benedict selected Cloudflare Access browser sign-in on 2026-10-15.
`workspace.k1m0.dev` will reach the existing NUC application through a dedicated
outbound tunnel. The apex remains reserved for the public portfolio. The existing
Tailscale browser URL, runner and project MCP connections remain usable.

## Prepared configuration

- Access application: **Kimo Workspace**, `self_hosted`, whole hostname protected.
- One-time email code for the verified Cloudflare account address only. The
  address and account/zone identifiers are in private workstation configuration.
- Eight-hour session, HTTP-only Access cookie, no WARP or preflight bypass.
- Keep Kimo's existing Basic authentication during rollout. Users will first
  pass Access and then use the existing Kimo username/password.
- Dedicated remote-managed tunnel: **kimo-workspace-nuc**.
- Origin: `http://127.0.0.1:3100` inside WSL. Catch-all: HTTP 404.
- `cloudflared` validates Access JWTs against the organization's verified team
  name and this application's AUD. No route to other NUC services is included.
- `kimo-tunnel.service` uses a dynamic user and a systemd credential, with
  metrics bound to loopback. The token is never a command-line argument.
- Version and SHA-256 are pinned in `deploy/nuc/cloudflared-version.json`.

The JSON examples contain placeholders. They are reviewable templates, not live
Cloudflare state. Do not submit them until the identity provider, team and AUD
have been retrieved from the owning account.

## Account connection

Wrangler's supported `whoami` refreshed the existing login. The active domain
was found in that account. Access application, identity-provider and tunnel
list requests returned empty successful results; the organization endpoint
returned HTTP 403. There is no connected Cloudflare plugin in the searched
catalog. A scoped setup token was requested through `k1m0-domain.html`.

Save the token at `~/.config/kimo/cloudflare-api-token` with mode 600. Limit
resources to the owning account and the `k1m0.dev` zone. Permissions:

- Account: Cloudflare Tunnel — Edit.
- Account: Access: Apps and Policies — Edit.
- Account: Access: Organizations, Identity Providers, and Groups — Edit.
- Zone: DNS — Edit; Zone — Read.

The setup token stays on the workstation. Only the dedicated tunnel credential
goes to `/srv/kimo/secrets/cloudflare-tunnel-token`, owned by root with mode 600.
Do not include the setup API token in repository commits or recovery archives.

## Apply after connecting

1. Read the owning zone and `/accounts/{account}/access/organizations`. If a
   Zero Trust organization has not been initialized, finish that account setup
   first. Do not guess an organization domain or claim that 403 means it exists.
2. Reuse an existing `onetimepin` identity provider if present, otherwise create
   one. Do not alter unrelated providers or account-wide login settings.
3. Create the Access application and exact-email policy before publishing DNS.
   Read back the application and its policies; retrieve its `aud`.
4. Create the dedicated remote-managed tunnel. Configure the example ingress
   with the real team and audience. Retrieve its tunnel-specific token privately.
5. Save a private readback JSON with keys `expected`, `organization`,
   `identity_provider`, `application`, `policies`, `tunnel`, and `configuration`.
   Values are the unwrapped API `result` objects; `policies` is the full list.
   `expected` contains the selected `hostname` and exact verified `email`.
6. Run `python3 deploy/nuc/verify-cloudflare-access.py /private/readback.json`.
   It must pass before publishing the DNS record. Resolve conflicts explicitly;
   do not overwrite pre-existing apps, policies or records on a blind retry.
7. Install the tunnel token securely, then enable/start `kimo-tunnel.service`.
   Wait for a healthy tunnel. Create a proxied CNAME for only
   `workspace.k1m0.dev` to `{tunnel-id}.cfargotunnel.com`. Re-read DNS and add it
   as `dns` in the validation input; rerun the configuration check.
8. Test signed-out requests to `/`, `/projects`, `/api/projects`, `/api/reading`,
   `/api/publish/kimo/context` and the actual Nuxt Content endpoint. Require
   Access login or denial; never accept application data before authentication.
   Recheck the Tailscale browser and publisher connection.
9. Benedict completes email-code sign-in in a browser, uses the existing Kimo
   password and opens an artifact. Check desktop and mobile access. Only then
   report the custom address as usable.
10. Save the non-secret connection readback privately on the NUC at
    `/srv/kimo/cloudflare-workspace.json`, update displayed URLs and recovery
    notes, install the updated backup script, and create a verified recovery
    archive. Keep the previous private address during migration.

The recovery script now includes the optional tunnel service, version manifest,
connection metadata and tunnel credential inside the encrypted archive. Restore
the pinned binary using its published checksum. Recheck the Access application,
DNS and token on a replacement host; the archive does not recreate Cloudflare
account state or grant a new account permission to the old tunnel.

## Checks

`PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p '*_test.py' -v`
passes five configuration-boundary tests. They cover broad/bypass policies,
wrong identity/audience, other-service routes, public path exceptions and DNS
proxy settings. These are preparation checks, not a completed live sign-in.

The deployment script's shell syntax passes. No application/runtime code changed,
so the existing application build was not repeated for these deployment files.

## References

- [Access applications and origin token validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
- [One-time PIN identity provider](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/)
- [Origin parameters](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/origin-parameters/)
- [Tunnel token-file option](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/run-parameters/)
- [API token permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)
