#!/usr/bin/env bash
# backup-db.sh — daily timestamped backups of the Druygon SQLite databases.
# Keeps 14 days of backups under /root/backups/druygon (root-only, off-git).
# Restore: sqlite3 /path/to/restore.db ".restore '/root/backups/druygon/<file>'"
# (or simply copy the file back over the target DB while the service is stopped).
set -euo pipefail

DEST=/root/backups/druygon
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$DEST"
chmod 700 "$DEST"

for db in /opt/druygon/api/druygon_content.db /opt/druygon/druygon_players.db; do
  name=$(basename "$db" .db)
  out="$DEST/${name}-${STAMP}.db"
  sqlite3 "$db" ".backup '$out'"
  chmod 600 "$out"
  echo "[backup] $out ($(stat -c %s "$out") bytes)"
done

# Retention: delete backups older than 14 days
find "$DEST" -name '*.db' -mtime +14 -delete
echo "[backup] retention ok, $(ls "$DEST" | wc -l) files kept"
