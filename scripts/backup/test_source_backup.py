#!/usr/bin/env python3
"""Offline integration tests with synthetic repos only; no production credentials."""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest

from export_source import export_source, git, refs


class SourceBackupTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="ayapark-backup-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / "original"
        self.repo.mkdir()
        git(self.repo, "init", "-b", "main")
        git(self.repo, "config", "user.name", "Backup test")
        git(self.repo, "config", "user.email", "backup@example.invalid")
        for name, value in {"index.html": "<h1>Synthetic</h1>", "styles.css": "body{color:black}",
                            "assets/icon.bin": b"\x00\xff\x80",
                            "supabase/functions/example/index.ts": "export default {}"}.items():
            path = self.repo / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(value if isinstance(value, bytes) else value.encode())
        git(self.repo, "add", ".")
        git(self.repo, "commit", "-m", "initial fixture")

    def test_standalone_restore_preserves_history_tags_remote_refs_and_assets(self):
        initial = git(self.repo, "rev-parse", "HEAD")
        git(self.repo, "tag", "-a", "v1", "-m", "annotated release")
        git(self.repo, "switch", "-c", "design")
        (self.repo / "styles.css").write_text("body{color:green}")
        git(self.repo, "commit", "-am", "design variant")
        git(self.repo, "update-ref", "refs/remotes/origin/remote-only", initial)
        git(self.repo, "symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/remote-only")
        git(self.repo, "switch", "--detach")
        (self.repo / "untracked-secret.txt").write_text("fixture-secret-never-export")
        git(self.repo, "remote", "add", "origin", "https://fixture-credential@example.invalid/repo")
        expected = refs(self.repo)
        out = self.root / "export"
        export_source(self.repo, out)
        # Remove every path back to the original repository before restoration.
        self.repo.rename(self.root / "unavailable")
        mirror = self.root / "restored.git"
        git(self.root, "clone", "--mirror", str(out / "repository.bundle"), str(mirror))
        git(mirror, "fsck", "--full", "--strict")
        self.assertEqual(refs(mirror), expected)
        self.assertEqual(git(mirror, "show", "refs/heads/design:styles.css"), "body{color:green}")
        self.assertEqual(git(mirror, "show", "refs/heads/main:index.html"), "<h1>Synthetic</h1>")
        self.assertIn("assets/icon.bin", git(mirror, "ls-tree", "-r", "HEAD"))
        self.assertNotIn("untracked-secret", git(mirror, "ls-tree", "-r", "HEAD"))
        self.assertNotIn("fixture-credential", (mirror / "config").read_text())
        metadata = json.loads((out / "refs.json").read_text())
        self.assertTrue(metadata["standalone_mirror_verified"])
        self.assertEqual(metadata["refs"], expected)

    def test_shallow_source_is_rejected(self):
        clone = self.root / "shallow"
        git(self.root, "clone", "--depth=1", self.repo.as_uri(), str(clone))
        with self.assertRaisesRegex(ValueError, "shallow"):
            export_source(clone, self.root / "export")

    def test_dirty_tracked_source_is_rejected(self):
        (self.repo / "index.html").write_text("uncommitted")
        with self.assertRaisesRegex(ValueError, "Commit tracked"):
            export_source(self.repo, self.root / "export")

    def test_lfs_pointer_even_in_old_history_is_rejected(self):
        (self.repo / "photo").write_text("version https://git-lfs.github.com/spec/v1\noid sha256:" + "0" * 64 + "\nsize 5\n")
        git(self.repo, "add", ".")
        git(self.repo, "commit", "-m", "old external asset")
        git(self.repo, "rm", "photo")
        git(self.repo, "commit", "-m", "remove pointer")
        with self.assertRaisesRegex(ValueError, "LFS"):
            export_source(self.repo, self.root / "export")

    def test_submodule_history_is_rejected(self):
        head = git(self.repo, "rev-parse", "HEAD")
        git(self.repo, "update-index", "--add", "--cacheinfo", "160000," + head + ",external")
        git(self.repo, "commit", "-m", "gitlink fixture")
        bare = self.root / "gitlink.git"
        git(self.root, "clone", "--bare", str(self.repo), str(bare))
        with self.assertRaisesRegex(ValueError, "Submodule"):
            export_source(bare, self.root / "export")

    def test_format_two_requires_source_and_detects_corruption(self):
        export_source(self.repo, self.root / "source")
        files = {"db/application.dump": b"fixture-db", "db/auth-data.dump": b"fixture-auth",
                 "db/storage-metadata.dump": b"fixture-storage",
                 "storage/index.json": b'{"format":1,"objects":[]}',
                 "config/recovery-inventory.md": b"fixture config checklist"}
        files.update({"source/" + p.name: p.read_bytes() for p in (self.root / "source").iterdir()})
        checker = Path(__file__).with_name("verify_snapshot.py")

        def check(removed=None, corrupted=None):
            values = {k: v for k, v in files.items() if k != removed}
            manifest = {"format": 2, "files": {k: {"bytes": len(v), "sha256": hashlib.sha256(v).hexdigest()}
                                                       for k, v in values.items()}}
            values["manifest.json"] = json.dumps(manifest).encode()
            if corrupted:
                values[corrupted] += b"broken"
            path = self.root / "snapshot.tar"
            with tarfile.open(path, "w") as tar:
                for name, value in values.items():
                    info = tarfile.TarInfo(name)
                    info.size = len(value)
                    tar.addfile(info, io.BytesIO(value))
            return subprocess.run(["python3", str(checker), str(path)], capture_output=True, text=True)

        self.assertEqual(check().returncode, 0)
        self.assertNotEqual(check(removed="source/repository.bundle").returncode, 0)
        self.assertNotEqual(check(corrupted="source/repository.bundle").returncode, 0)


if __name__ == "__main__":
    unittest.main()
