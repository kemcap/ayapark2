#!/usr/bin/env python3
"""Offline preflight of a locally decrypted AyaPark PostgreSQL custom-format dump.

Does not connect to, modify, or restore any database. Do not upload private dumps.
"""
import argparse
import os
from pathlib import Path
import re
import subprocess
import sys

REQUIRED_DATA = {
    ("auth", "users"),
    ("public", "ay2_entries"),
    ("public", "site_units"),
}


def run_tool(args):
    # Even inherited PG* environment settings are removed; all invocations are offline.
    env = {k: v for k, v in os.environ.items() if not k.startswith("PG")}
    return subprocess.run(args, env=env, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, check=False, timeout=300)


def examine(path, pg_restore="pg_restore"):
    file = Path(path)
    if file.is_symlink() or not file.is_file() or file.stat().st_size == 0:
        raise ValueError("Input must be a nonempty regular local dump file (not a symlink)")
    try:
        version = run_tool([pg_restore, "--version"])
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ValueError("PostgreSQL 17 pg_restore is unavailable") from exc
    match = re.search(rb"pg_restore \(PostgreSQL\) (\d+)", version.stdout)
    if version.returncode or not match or int(match.group(1)) != 17:
        raise ValueError("PostgreSQL 17 pg_restore is required for this snapshot")
    try:
        listing = run_tool([pg_restore, "--list", str(file)])
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ValueError("Could not inspect the PostgreSQL archive") from exc
    if listing.returncode:
        raise ValueError("pg_restore could not read the archive directory")
    toc = listing.stdout.decode("utf-8", errors="replace")
    table_data = set(re.findall(r"\bTABLE DATA\s+(\S+)\s+(\S+)\s", toc))
    missing = REQUIRED_DATA - table_data
    if missing:
        raise ValueError("Missing required database table data: " +
                         ", ".join(".".join(v) for v in sorted(missing)))
    if not any(schema == "ay_auth_private" for schema, _ in table_data):
        raise ValueError("Missing private-auth table data")
    if not re.search(r"\bFUNCTION\s+ay2_private\s+guard_person_identity\b", toc):
        raise ValueError("Missing expected private function")
    try:
        # --file is mandatory: it streams SQL/data to /dev/null, without a DB connection.
        # This checks the compressed payload, not just the table of contents.
        payload = run_tool([pg_restore, "--file", os.devnull, str(file)])
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ValueError("Offline archive payload scan failed") from exc
    if payload.returncode:
        raise ValueError("Offline archive payload scan failed")
    return {"pg_restore_major": 17, "table_data_entries": len(table_data),
            "auth_users_present": True, "payload_readable": True,
            "restore_tested": False}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dump", help="locally decrypted .dump file, never an .age file")
    parser.add_argument("--pg-restore", default="pg_restore",
                        help="path to PostgreSQL 17 pg_restore executable")
    args = parser.parse_args(argv)
    try:
        result = examine(args.dump, args.pg_restore)
    except ValueError as exc:
        print("OFFLINE PREFLIGHT FAILED: " + str(exc), file=sys.stderr)
        return 1
    print("OFFLINE PREFLIGHT PASSED: PostgreSQL 17; required TOC entries and archive payload readable.")
    print("This is NOT a restored database; Auth, RLS, row-level data and Storage remain UNTESTED.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
