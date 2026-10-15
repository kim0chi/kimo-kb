import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('verify_access', Path(__file__).resolve().parents[1] / 'deploy/nuc/verify-cloudflare-access.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class AccessBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.data = {
            'expected': {'hostname': 'workspace.k1m0.dev', 'email': 'owner@example.com'},
            'organization': {'auth_domain': 'test-team.cloudflareaccess.com'},
            'identity_provider': {'id': 'test-provider', 'type': 'onetimepin'},
            'application': {'domain': 'workspace.k1m0.dev', 'type': 'self_hosted', 'aud': 'a' * 64,
                            'allowed_idps': ['test-provider'], 'session_duration': '8h', 'http_only_cookie_attribute': True},
            'policies': [{'decision': 'allow', 'include': [{'email': {'email': 'owner@example.com'}}]}],
            'tunnel': {'id': '11111111-1111-4111-8111-111111111111', 'name': 'kimo-workspace-nuc', 'config_src': 'cloudflare'},
            'configuration': {'config': {'ingress': [
                {'hostname': 'workspace.k1m0.dev', 'service': 'http://127.0.0.1:3100', 'originRequest': {
                    'access': {'required': True, 'teamName': 'test-team', 'audTag': ['a' * 64]}}},
                {'service': 'http_status:404'},
            ]}},
        }

    def test_only_the_exact_account_and_origin_pass(self):
        self.assertTrue(module.verify(self.data))

    def test_bypass_and_broad_identities_fail(self):
        for policy in [
            {'decision': 'bypass', 'include': [{'email': {'email': 'owner@example.com'}}]},
            {'decision': 'allow', 'include': [{'everyone': {}}]},
            {'decision': 'allow', 'include': [{'email': {'email': 'other@example.com'}}]},
        ]:
            with self.subTest(policy=policy):
                data = copy.deepcopy(self.data); data['policies'] = [policy]
                with self.assertRaises(ValueError): module.verify(data)

    def test_origin_must_validate_the_matching_access_audience(self):
        for key, value in [('required', False), ('audTag', ['b' * 64]), ('teamName', 'other-team')]:
            with self.subTest(key=key):
                data = copy.deepcopy(self.data)
                data['configuration']['config']['ingress'][0]['originRequest']['access'][key] = value
                with self.assertRaises(ValueError): module.verify(data)

    def test_other_routes_and_public_overrides_fail(self):
        self.data['configuration']['config']['ingress'][1] = {'service': 'http://127.0.0.1:8787'}
        with self.assertRaises(ValueError): module.verify(self.data)
        self.data['configuration']['config']['ingress'][1] = {'service': 'http_status:404'}
        self.data['application']['destinations'] = [{'type': 'public', 'uri': 'workspace.k1m0.dev',
                                                   'overrides': [{'behavior': 'public', 'path_pattern': '/api/*'}]}]
        with self.assertRaises(ValueError): module.verify(self.data)

    def test_dns_cannot_target_another_tunnel(self):
        self.data['dns'] = {'name': 'workspace.k1m0.dev', 'type': 'CNAME', 'proxied': True,
                            'content': self.data['tunnel']['id'] + '.cfargotunnel.com'}
        self.assertTrue(module.verify(self.data))
        self.data['dns']['proxied'] = False
        with self.assertRaises(ValueError): module.verify(self.data)


if __name__ == '__main__': unittest.main()
