#!/usr/bin/env bash
# Read-only Supabase export to encrypted offsite archive. Does NOT restore or change production.
set -Eeuo pipefail
umask 077

if [[ "$BACKUP_EXECUTION_ACK" != "YES" ]]; then
  echo "Backup blocked: missing explicit execution acknowledgement." >&2
  exit 1
fi
for key in SUPABASE_PROJECT_REF SUPABASE_DB_URL SUPABASE_SERVICE_ROLE_KEY BACKUP_AGE_RECIPIENT RCLONE_CONFIG_B64 RCLONE_REMOTE_DEST; do
  if [[ -z "$(printenv "$key" || true)" ]]; then
    echo "Backup blocked: missing configuration $key" >&2
    exit 1
  fi
done
if [[ "$SUPABASE_DB_URL" != *"$SUPABASE_PROJECT_REF"* ]]; then
  echo "Backup blocked: the database URL does not contain the expected project reference." >&2
  exit 1
fi
if [[ ! "$BACKUP_AGE_RECIPIENT" =~ ^age1[a-z0-9]{20,}$ ]]; then
  echo "Backup blocked: an age public recipient is required." >&2
  exit 1
fi
if [[ ! "$RCLONE_REMOTE_DEST" =~ ^[a-zA-Z0-9_-]+:[a-zA-Z0-9_/-]+$ ]] || [[ "$RCLONE_REMOTE_DEST" == *".."* ]]; then
  echo "Backup blocked: invalid offsite destination." >&2
  exit 1
fi

TEMP="$(mktemp -d)"
trap 'rm -rf "$TEMP"' EXIT
mkdir -p "$TEMP/export/db" "$TEMP/export/storage"
printf '%s' "$RCLONE_CONFIG_B64" | base64 --decode > "$TEMP/rclone.conf"
chmod 600 "$TEMP/rclone.conf"
REMOTE_NAME="$(printf '%s' "$RCLONE_REMOTE_DEST" | cut -d ':' -f 1)"
rclone --config "$TEMP/rclone.conf" lsd "$REMOTE_NAME:" >/dev/null

# Using PostgreSQL 17 against the currently verified PostgreSQL 17 production server.
# All pg_dump operations are read-only. Never run psql restore against production.
docker run --rm \
  -e SUPABASE_DB_URL -e PGSSLMODE=require \
  -v "$TEMP/export/db:/out" \
  postgres:17 sh -eu -c '
    pg_dump -d "$SUPABASE_DB_URL" -Fc --no-owner --no-acl \
      -n public -n ay2_private -n ay_auth_private -f /out/application.dump
    pg_dump -d "$SUPABASE_DB_URL" -Fc --data-only --no-owner --no-acl \
      -n auth -f /out/auth-data.dump
    pg_dump -d "$SUPABASE_DB_URL" -Fc --data-only --no-owner --no-acl \
      -n storage -f /out/storage-metadata.dump
  '
for file in application auth-data storage-metadata; do
  test -s "$TEMP/export/db/$file.dump" || { echo "Missing database export: $file" >&2; exit 1; }
done

# Separately download actual Storage file bytes; a PostgreSQL dump does not contain them.
SUPABASE_URL="https://$SUPABASE_PROJECT_REF.supabase.co" \
  python3 scripts/backup/export_storage.py "$TEMP/export/storage"

python3 - "$TEMP/export" <<'PY'
import hashlib, json, os, pathlib, sys
root = pathlib.Path(sys.argv[1])
items = {}
for path in sorted(root.rglob("*")):
    if path.is_file() and path.name != "manifest.json":
        rel = path.relative_to(root).as_posix()
        with path.open("rb") as source:
            digest = hashlib.file_digest(source, "sha256").hexdigest()
        items[rel] = {"bytes": path.stat().st_size, "sha256": digest}
manifest = {"format": 1, "project_ref": os.environ["SUPABASE_PROJECT_REF"], "files": items,
            "note": "Logical dumps require a supervised restore drill; platform configuration and credentials are excluded."}
(root / "manifest.json").write_text(json.dumps(manifest, sort_keys=True, indent=2) + "\n")
PY

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="ayapark2-$STAMP-${GITHUB_RUN_ID:-manual}.tar.age"
OUT="$TEMP/$NAME"
# Pipe tar straight into age, never persist an unencrypted tar archive.
tar -C "$TEMP/export" -cf - . | age -r "$BACKUP_AGE_RECIPIENT" -o "$OUT"
test -s "$OUT"
rclone --config "$TEMP/rclone.conf" copyto "$OUT" "$RCLONE_REMOTE_DEST/$NAME" --retries 3 --low-level-retries 5
rclone --config "$TEMP/rclone.conf" lsf "$RCLONE_REMOTE_DEST" --files-only | grep -Fxq "$NAME"
echo "Encrypted offsite backup uploaded and listed successfully: $NAME"
