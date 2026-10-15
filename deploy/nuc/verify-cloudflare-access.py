"""Check live Cloudflare API readbacks before publishing the workspace DNS.

Usage: python3 deploy/nuc/verify-cloudflare-access.py private-readback.json
Input keys: expected, organization, identity_provider, application, policies,
tunnel, configuration, and optionally dns. Store this file outside the repository.
This checks configuration, not the end-to-end browser login.
"""
import json
import re
import sys
import uuid
from pathlib import Path


def check(condition, message):
    if not condition:
        raise ValueError(message)


def verify(data):
    expected = data['expected']
    host, email = expected['hostname'], expected['email']
    check(host == 'workspace.k1m0.dev', 'Unexpected workspace hostname')
    check(bool(re.fullmatch(r'[^\s@*]+@[^\s@*]+\.[^\s@*]+', email)), 'Invalid exact-email rule')
    organization, identity = data['organization'], data['identity_provider']
    auth_domain = organization['auth_domain']
    check(bool(re.fullmatch(r'[a-z0-9-]+\.cloudflareaccess\.com', auth_domain)), 'Unverified Access team domain')
    app = data['application']
    check(app.get('domain') == host and app.get('type') == 'self_hosted', 'Wrong Access application')
    audience = app.get('aud', '')
    check(bool(re.fullmatch(r'[a-fA-F0-9]{64}', audience)), 'Missing or invalid Access audience')
    check(identity.get('type') == 'onetimepin' and bool(identity.get('id')), 'Email-code provider required')
    check(app.get('allowed_idps') == [identity['id']], 'Unexpected login providers')
    check(app.get('session_duration') == '8h', 'Unexpected session duration')
    check(not app.get('allow_authenticate_via_warp'), 'WARP must not bypass the selected login')
    check(not app.get('options_preflight_bypass'), 'Unauthenticated preflight bypass is enabled')
    check(app.get('http_only_cookie_attribute') is True, 'Access cookie must be HTTP-only')
    for destination in app.get('destinations') or []:
        check(destination.get('type') == 'public' and destination.get('uri') == host,
              'Additional Access destination found')
        check(not destination.get('overrides'), 'Public path override found')
    check(all(domain == host for domain in app.get('self_hosted_domains') or []),
          'Additional legacy domain found')
    policies = data['policies']
    check(len(policies) == 1, 'Exactly one Access policy is required')
    policy = policies[0]
    check(policy.get('decision') == 'allow', 'Unexpected Access policy decision')
    check(policy.get('include') == [{'email': {'email': email}}], 'Policy permits another identity')
    check(not policy.get('require') and not policy.get('exclude'), 'Unexpected policy conditions')
    tunnel = data['tunnel']
    tunnel_id = str(uuid.UUID(tunnel['id']))
    check(tunnel.get('name') == 'kimo-workspace-nuc', 'Wrong tunnel')
    check(tunnel.get('config_src') == 'cloudflare' and not tunnel.get('deleted_at'), 'Invalid tunnel configuration source')
    ingress = data['configuration']['config']['ingress']
    check(len(ingress) == 2, 'Unexpected additional tunnel routes')
    route, fallback = ingress
    check(route.get('hostname') == host and not route.get('path'), 'Wrong tunnel hostname or path')
    check(route.get('service') == 'http://127.0.0.1:3100', 'Wrong local origin')
    access = route.get('originRequest', {}).get('access', {})
    check(access.get('required') is True, 'Origin does not require Access JWT validation')
    check(access.get('teamName') == auth_domain.removesuffix('.cloudflareaccess.com'), 'Wrong Access team')
    check(access.get('audTag') == [audience], 'Origin accepts the wrong Access audience')
    check(fallback.get('service') == 'http_status:404' and not fallback.get('hostname') and not fallback.get('path'),
          'Catch-all must reject other hosts')
    if data.get('dns') is not None:
        dns = data['dns']
        check(dns.get('name') == host and dns.get('type') == 'CNAME', 'Wrong DNS record')
        check(dns.get('content') == tunnel_id + '.cfargotunnel.com' and dns.get('proxied') is True,
              'DNS must proxy to this tunnel only')
    return True


if __name__ == '__main__':
    try:
        if len(sys.argv) != 2:
            raise ValueError('Provide a private API-readback JSON file')
        verify(json.loads(Path(sys.argv[1]).read_text()))
    except (ValueError, KeyError, TypeError, OSError) as error:
        raise SystemExit('Workspace Access validation failed: ' + str(error))
    print('Access policy, identity, origin validation and tunnel route match the workspace plan.')
