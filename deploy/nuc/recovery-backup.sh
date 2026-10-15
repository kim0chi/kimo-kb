#!/bin/bash
set -euo pipefail
umask 077
# Only Kimo data. Never include browser profiles, unrelated services or agent logins.
exec 9>/srv/kimo/backups/recovery.lock
flock -n 9 || exit 0
stamp=$(date -u +%Y%m%dT%H%M%S%NZ)
release=$(readlink -f /srv/kimo/current)
stage=$(mktemp -d /srv/kimo/backups/.recovery-XXXXXX)
trap 'rm -rf "$stage"' EXIT
mkdir -p "$stage/state" "$stage/secrets" "$stage/deployment"
db="/srv/kimo/backups/snapshot-$stamp.sqlite"
docker exec kimo-dashboard-1 node .output/server/backup-state.mjs "$db"
mv "$db" "$stage/state/kb.sqlite"
python3 - "$stage/state/kb.sqlite" <<'PY'
import sqlite3,sys
with sqlite3.connect(sys.argv[1]) as db:
    if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok': raise SystemExit('Database integrity check failed')
PY
cp -a "$release/app" "$release/knowledge" "$release/content" "$stage/"
cp "$release/compose.yaml" "$stage/compose.yaml"
cp /srv/kimo/secrets/server.env "$stage/secrets/server.env"
cp /srv/kimo/recovery-public.asc "$stage/deployment/"
cp /srv/kimo/backup.sh /srv/kimo/recovery-backup.sh "$stage/deployment/"
cp /etc/systemd/system/kimo-backup.service /etc/systemd/system/kimo-backup.timer "$stage/deployment/"
for unit in /etc/systemd/system/kimo-recovery-backup.service /etc/systemd/system/kimo-recovery-backup.timer; do
  if [ -f "$unit" ]; then cp "$unit" "$stage/deployment/"; fi
done
if [ -f /srv/kimo/kimo-source.bundle ]; then cp /srv/kimo/kimo-source.bundle "$stage/"; fi
printf '%s\n' "Created UTC: $stamp" "Release: $release" "Scope: Kimo application, stored library, state, configuration and source bundle when present." "Excludes: other repositories, Windows, other NUC services, CLI sign-ins and recovery private key." > "$stage/RECOVERY-MANIFEST.txt"
(cd "$stage" && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS)
output="/srv/kimo/backups/kimo-recovery-$stamp.tar.gz.gpg"
tar -czf - -C "$stage" . | gpg --batch --yes --homedir /srv/kimo/backup-gnupg --trust-model always --recipient-file /srv/kimo/recovery-public.asc --output "$output.partial" --encrypt
mv "$output.partial" "$output"
chmod 600 "$output"
# A configured rclone remote is optional; do not report local creation as an upload.
if [ -f /srv/kimo/secrets/backup-destination ]; then
  destination=$(cat /srv/kimo/secrets/backup-destination)
  /usr/local/bin/rclone --config /srv/kimo/secrets/rclone.conf copyto "$output" "$destination/$(basename "$output")" --immutable
  /usr/local/bin/rclone --config /srv/kimo/secrets/rclone.conf check /srv/kimo/backups "$destination" --include "$(basename "$output")" --one-way
  printf '%s\n' "$stamp" > /srv/kimo/backups/last-drive-success.txt
else
  printf '%s\n' 'Encrypted local recovery archive ready; automatic Drive upload is not configured.'
fi
printf '%s\n' "$output"
