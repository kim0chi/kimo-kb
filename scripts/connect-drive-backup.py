"""Authorize the private Kimo uploader through Google's local browser flow.

Usage: python scripts/connect-drive-backup.py /absolute/path/to/desktop-client.json
No credentials are printed or passed as command-line arguments to rclone.
"""
import configparser
import json
import os
import pathlib
import subprocess
import sys

os.umask(0o077)
private = pathlib.Path.home() / '.config/kimo'
private.mkdir(mode=0o700, parents=True, exist_ok=True)
source = pathlib.Path(sys.argv[1]).expanduser().resolve()
client = json.loads(source.read_text()).get('installed')
if not isinstance(client, dict) or not client.get('client_id') or not client.get('client_secret'):
    raise SystemExit('Use the JSON for a Google OAuth Desktop app, not a service account or web client.')
if not client['client_id'].endswith('.apps.googleusercontent.com'):
    raise SystemExit('Unexpected Google OAuth client ID.')
source.chmod(0o600)
rclone = pathlib.Path.home() / '.local/share/kimo/tools/rclone'
config = private / 'rclone.conf'
if config.exists():
    raise SystemExit('Private rclone configuration already exists; review it before reconnecting.')
obscured = subprocess.check_output([str(rclone), 'obscure', '-'], input=client['client_secret'] + '\n', text=True).strip()
settings = configparser.ConfigParser(interpolation=None)
settings['kimo-drive'] = {'type': 'drive', 'scope': 'drive.file', 'client_id': client['client_id'], 'client_secret': obscured}
with config.open('x') as output:
    settings.write(output)
config.chmod(0o600)
print('Opening Google sign-in. Authorize your Kimo Backups app in the browser.', flush=True)
with (private / 'drive-connect.log').open('w') as log:
    result = subprocess.run([str(rclone), '--config', str(config), 'config', 'reconnect', 'kimo-drive:', '--auto-confirm'], stdout=log, stderr=subprocess.STDOUT)
if result.returncode:
    raise SystemExit('Google authorization did not finish. Review the private drive-connect.log; no upload is configured yet.')
settings.read(config)
if not settings['kimo-drive'].get('token'):
    raise SystemExit('No OAuth token was saved; the uploader is not connected.')
print('Google authorization saved privately. Next: install on the NUC and verify an encrypted upload.')
