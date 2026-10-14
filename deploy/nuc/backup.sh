#!/bin/bash
set -euo pipefail
# SQLite backup API remains consistent while Kimo is serving requests.
stamp=$(date -u +%Y%m%dT%H%M%SZ)
docker exec kimo-dashboard-1 node .output/server/backup-state.mjs "/srv/kimo/backups/kb-$stamp.sqlite"
