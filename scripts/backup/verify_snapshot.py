#!/usr/bin/env python3
"""Offline encrypted-backup integrity check. NEVER writes to Supabase."""
import hashlib
import json
from pathlib import PurePosixPath
import sys
import tarfile

if len(sys.argv) != 2:
    raise SystemExit("Usage: python3 scripts/backup/verify_snapshot.py decrypted-snapshot.tar")

with tarfile.open(sys.argv[1], "r:") as archive:
    files = {}
    for member in archive.getmembers():
        name = member.name.removeprefix("./")
        p = PurePosixPath(name)
        if p.is_absolute() or ".." in p.parts or member.issym() or member.islnk():
            raise SystemExit("Unsafe archive member: " + name)
        if member.isdir():
            continue
        if not member.isfile() or name in files:
            raise SystemExit("Invalid or duplicate file: " + name)
        files[name] = member
    if "manifest.json" not in files or "storage/index.json" not in files:
        raise SystemExit("Incomplete backup: manifests missing")
    raw = archive.extractfile(files["manifest.json"]).read()
    manifest = json.loads(raw)
    if manifest.get("format") not in (1, 2) or not isinstance(manifest.get("files"), dict):
        raise SystemExit("Invalid backup manifest")
    expected = manifest["files"]
    if set(files) != set(expected) | {"manifest.json"}:
        raise SystemExit("Manifest/archive file list mismatch")
    for required in ("db/application.dump", "db/auth-data.dump", "db/storage-metadata.dump"):
        if required not in expected:
            raise SystemExit("Missing database dump: " + required)
    if manifest["format"] == 2:
        for required in ("source/repository.bundle", "source/refs.json", "source/head-tree.txt",
                         "config/recovery-inventory.md"):
            if required not in expected or expected[required]["bytes"] <= 0:
                raise SystemExit("Missing source/recovery inventory: " + required)
    for name, info in expected.items():
        digest = hashlib.sha256()
        length = 0
        with archive.extractfile(files[name]) as fileobj:
            while True:
                block = fileobj.read(1024 * 1024)
                if not block:
                    break
                digest.update(block)
                length += len(block)
        if digest.hexdigest() != info["sha256"] or length != info["bytes"]:
            raise SystemExit("Backup integrity failure: " + name)
    index = json.load(archive.extractfile(files["storage/index.json"]))
    if index.get("format") != 1:
        raise SystemExit("Invalid Storage index")
    for obj in index["objects"]:
        if obj["file"] not in expected:
            raise SystemExit("Missing stored object: " + obj["path"])
        info = expected[obj["file"]]
        if info["sha256"] != obj["sha256"] or info["bytes"] != obj["bytes"]:
            raise SystemExit("Storage file mismatch: " + obj["path"])
print("Archive integrity VERIFIED; actual Supabase RESTORE is NOT yet tested.")
if manifest["format"] == 1:
    print("Legacy format 1: source-code backup is NOT required or verified by this format.")
