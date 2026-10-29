#!/usr/bin/env python3
"""Create a standalone bundle of locally available refs; never contact a service."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile


def git(repo, *args, input_bytes=None, raw=False):
    env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    env.update(GIT_TERMINAL_PROMPT="0", GIT_NO_REPLACE_OBJECTS="1", GIT_NO_LAZY_FETCH="1",
               GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL=os.devnull)
    result = subprocess.run(["git", "-C", str(repo), *args], env=env,
                            input=input_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if result.returncode:
        # Do not echo stderr: repository configuration may contain credential URLs.
        raise ValueError("Git operation failed: " + args[0])
    return result.stdout if raw else result.stdout.decode().strip()


def refs(repo):
    lines = git(repo, "for-each-ref", "--format=%(refname) %(objectname)").splitlines()
    return dict(line.split(" ", 1) for line in lines)


def export_source(repo, destination):
    repo, destination = Path(repo).resolve(), Path(destination).resolve()
    if destination.exists():
        raise ValueError("Source export destination already exists")
    if git(repo, "rev-parse", "--is-shallow-repository") != "false":
        raise ValueError("Full history required; shallow repositories are not portable")
    if git(repo, "rev-parse", "--is-bare-repository") == "false":
        if git(repo, "status", "--porcelain", "--untracked-files=no"):
            raise ValueError("Commit tracked changes before exporting source")
    head = git(repo, "rev-parse", "HEAD")
    reference_map = refs(repo)
    if not reference_map:
        raise ValueError("Repository has no refs")
    if git(repo, "replace", "-l"):
        raise ValueError("Replacement objects require a separate recovery review")
    # LFS bytes and submodule repositories are not Git blobs. Fail instead of
    # silently advertising a complete asset backup when external bytes are needed.
    objects = git(repo, "rev-list", "--objects", "--all").splitlines()
    object_ids = "\n".join(line.split(" ", 1)[0] for line in objects) + "\n"
    sizes = git(repo, "cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)",
                input_bytes=object_ids.encode()).splitlines()
    inspect = []
    for line in sizes:
        oid, kind, size = line.split()
        if kind == "tree" or (kind == "blob" and int(size) <= 1024):
            inspect.append(oid)
    # Batch object reads keep a large history from spawning thousands of processes.
    payload = git(repo, "cat-file", "--batch", input_bytes=("\n".join(inspect) + "\n").encode(), raw=True)
    cursor = 0
    hash_bytes = 32 if git(repo, "rev-parse", "--show-object-format") == "sha256" else 20
    while cursor < len(payload):
        end = payload.index(b"\n", cursor)
        _, kind, raw_size = payload[cursor:end].split()
        start = end + 1
        value = payload[start:start + int(raw_size)]
        cursor = start + int(raw_size) + 1
        if kind == b"blob" and value.startswith(b"version https://git-lfs.github.com/spec/v1\n"):
            raise ValueError("LFS pointers found; external LFS objects must be backed up first")
        if kind == b"tree":
            offset = 0
            while offset < len(value):
                entry_end = value.index(b"\0", offset)
                if value[offset:entry_end].startswith(b"160000 "):
                    raise ValueError("Submodule history needs an additional repository backup")
                offset = entry_end + 1 + hash_bytes
    destination.mkdir(parents=True, mode=0o700)
    bundle = destination / "repository.bundle"
    git(repo, "bundle", "create", str(bundle), "--all", "HEAD")
    if refs(repo) != reference_map or git(repo, "rev-parse", "HEAD") != head:
        raise ValueError("Repository refs changed during export; discard this snapshot and retry")
    # A fresh mirror must work without the original repo or any object alternates.
    with tempfile.TemporaryDirectory(prefix="ayapark-source-restore-") as temp:
        restored = Path(temp) / "restore.git"
        git(Path(temp), "clone", "--mirror", str(bundle), str(restored))
        git(restored, "bundle", "verify", str(bundle))
        git(restored, "fsck", "--full", "--strict")
        if refs(restored) != reference_map or git(restored, "rev-parse", "HEAD") != head:
            raise ValueError("Restored refs do not match the source snapshot")
    tracked = git(repo, "ls-tree", "-r", "--full-tree", head)
    (destination / "head-tree.txt").write_text(tracked + "\n")
    (destination / "refs.json").write_text(json.dumps({
        "format": 1, "head": head, "refs": reference_map,
        "head_tree": git(repo, "rev-parse", head + "^{tree}"),
        "standalone_mirror_verified": True,
        "scope": "All locally available refs and their reachable Git objects; fetch full remote history first.",
        "excluded": ["uncommitted/untracked files", "repository credentials/configuration", "unreachable objects"],
    }, indent=2, sort_keys=True) + "\n")
    print("Standalone source bundle and isolated mirror restore verified.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repository", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    try:
        export_source(args.repository, args.destination)
    except (ValueError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error)) from None
