#!/usr/bin/env python3
"""Read-only download of Supabase file-bucket objects for encrypted backups."""
import hashlib
import json
import os
from pathlib import Path
import sys
from urllib.parse import quote
from urllib.request import Request, urlopen

BASE = os.environ["SUPABASE_URL"].rstrip("/") + "/storage/v1"
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "objects").mkdir(exist_ok=True)
HEADERS = {"apikey": KEY, "Authorization": "Bearer " + KEY}
MAX_DEPTH = 40

def request(method, endpoint, payload=None):
    headers = dict(HEADERS)
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode()
    req = Request(BASE + endpoint, headers=headers, data=data, method=method)
    return urlopen(req, timeout=120)

def fetch_json(method, endpoint, payload=None):
    with request(method, endpoint, payload) as response:
        return json.load(response)

def objects_in(bucket, prefix="", depth=0):
    if depth > MAX_DEPTH:
        raise RuntimeError("Storage nesting exceeds backup safety limit")
    offset = 0
    while True:
        page = fetch_json("POST", "/object/list/" + quote(bucket, safe=""),
                          {"prefix": prefix, "limit": 1000, "offset": offset, "sortBy": {"column": "name", "order": "asc"}})
        if not isinstance(page, list):
            raise RuntimeError("Unexpected Supabase Storage listing response")
        for entry in page:
            name = entry.get("name")
            if not isinstance(name, str) or name in ("", ".", "..") or "/" in name:
                raise RuntimeError("Invalid object name returned by Storage")
            path = prefix + name
            if entry.get("id") is None:
                yield from objects_in(bucket, path + "/", depth + 1)
            else:
                yield path
        if len(page) < 1000:
            break
        offset += len(page)

def download(bucket, path):
    filename = hashlib.sha256((bucket + "\0" + path).encode()).hexdigest() + ".bin"
    destination = OUT / "objects" / filename
    endpoint = "/object/authenticated/" + quote(bucket, safe="") + "/" + quote(path, safe="/")
    digest = hashlib.sha256()
    length = 0
    with request("GET", endpoint) as response, destination.open("wb") as fp:
        while True:
            part = response.read(1024 * 1024)
            if not part:
                break
            fp.write(part)
            digest.update(part)
            length += len(part)
    return {"bucket": bucket, "path": path, "file": "objects/" + filename,
            "bytes": length, "sha256": digest.hexdigest()}

def main():
    buckets = fetch_json("GET", "/bucket")
    if not isinstance(buckets, list):
        raise RuntimeError("Unexpected Supabase bucket response")
    manifest = {"format": 1, "buckets": [], "objects": []}
    seen = set()
    for bucket in buckets:
        if not isinstance(bucket, dict) or not isinstance(bucket.get("name"), str):
            raise RuntimeError("Unexpected bucket record")
        name = bucket["name"]
        manifest["buckets"].append({"name": name, "public": bool(bucket.get("public", False))})
        for path in objects_in(name):
            key = (name, path)
            if key in seen:
                raise RuntimeError("Duplicate object found while exporting Storage")
            seen.add(key)
            manifest["objects"].append(download(name, path))
    (OUT / "index.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    print("Storage read-only export completed: %s buckets, %s objects" %
          (len(manifest["buckets"]), len(manifest["objects"])))

if __name__ == "__main__":
    main()
