#!/usr/bin/env python3
"""End-to-end synthetic portable archive integration test. No credentials or user data."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import unittest

from export_source import export_source


class SyntheticPortableArchiveTest(unittest.TestCase):
    def test_encrypted_portable_archive_survives_independent_restore(self):
        for executable in ("age", "age-keygen", "git"):
            if not shutil.which(executable):
                self.fail("Missing required synthetic-test executable: " + executable)

        with tempfile.TemporaryDirectory(prefix="ayapark-synthetic-full-") as directory:
            root = Path(directory)
            repo = root / "synthetic-repo"
            repo.mkdir()
            def run(*args, capture=True, cwd=None):
                result = subprocess.run(args, cwd=cwd, check=True,
                                        stdout=subprocess.PIPE if capture else None,
                                        stderr=subprocess.PIPE if capture else None,
                                        text=True)
                return result.stdout.strip() if capture else ""
            run("git", "init", "-b", "main", str(repo))
            run("git", "-C", str(repo), "config", "user.name", "AyaPark test")
            run("git", "-C", str(repo), "config", "user.email", "test@example.invalid")
            (repo / "assets").mkdir()
            (repo / "supabase/functions/synthetic").mkdir(parents=True)
            (repo / "index.html").write_text("<h1>Synthetic AyaPark</h1>")
            (repo / "assets/logo.txt").write_text("synthetic asset")
            (repo / "supabase/functions/synthetic/index.ts").write_text("export default {}")
            (repo / "UNTRACKED_PRIVATE_FILE").write_text("never included in git backup")
            run("git", "-C", str(repo), "add", "index.html", "assets/logo.txt", "supabase/functions/synthetic/index.ts")
            run("git", "-C", str(repo), "commit", "-m", "Synthetic fixture")
            run("git", "-C", str(repo), "tag", "synthetic-v1")

            export_dir = root / "export"
            (export_dir / "db").mkdir(parents=True)
            (export_dir / "storage/objects").mkdir(parents=True)
            (export_dir / "config").mkdir()
            export_source(repo, export_dir / "source")
            # The PostgreSQL custom archive and RLS checks are in the separate Docker test.
            for name in ("application", "auth-data", "storage-metadata"):
                (export_dir / "db" / (name + ".dump")).write_bytes(("synthetic " + name).encode())
            stored_bytes = b"\x00synthetic-private-document\xff"
            stored_file = export_dir / "storage/objects/synthetic.bin"
            stored_file.write_bytes(stored_bytes)
            obj_hash = hashlib.sha256(stored_bytes).hexdigest()
            (export_dir / "storage/index.json").write_text(json.dumps({
                "format": 1, "buckets": [{"name": "fixture-private", "public": False}],
                "objects": [{"bucket": "fixture-private", "path": "invoice-test.txt",
                             "file": "objects/synthetic.bin", "bytes": len(stored_bytes),
                             "sha256": obj_hash}],
            }))
            (export_dir / "config/recovery-inventory.md").write_text("Synthetic no-secret inventory")
            manifest = {}
            for file in sorted(export_dir.rglob("*")):
                if file.is_file():
                    relative = file.relative_to(export_dir).as_posix()
                    payload = file.read_bytes()
                    manifest[relative] = {"bytes": len(payload),
                                          "sha256": hashlib.sha256(payload).hexdigest()}
            (export_dir / "manifest.json").write_text(json.dumps({
                "format": 2, "project_ref": "synthetic-project", "files": manifest},
                sort_keys=True))

            plain_tar = root / "temporary-plain.tar"
            with tarfile.open(plain_tar, "w") as archive:
                archive.add(export_dir, arcname=".")
            identity = root / "temp-identity.txt"
            run("age-keygen", "-o", str(identity))
            recipient = run("age-keygen", "-y", str(identity))
            encrypted = root / "synthetic.tar.age"
            run("age", "-r", recipient, "-o", str(encrypted), str(plain_tar))
            plain_tar.unlink()
            self.assertTrue(encrypted.is_file())
            recovered = root / "recovered.tar"
            run("age", "-d", "-i", str(identity), "-o", str(recovered), str(encrypted))

            checker = Path(__file__).with_name("verify_snapshot.py")
            stdout = run("python3", str(checker), str(recovered))
            self.assertIn("VERIFIED", stdout)
            extract_to = root / "unpacked"
            extract_to.mkdir()
            with tarfile.open(recovered, "r:") as archive:
                archive.extractall(extract_to, filter="data")
            self.assertEqual((extract_to / "storage/objects/synthetic.bin").read_bytes(), stored_bytes)
            self.assertEqual((extract_to / "source/refs.json").is_file(), True)

            # Source repository is made inaccessible before we rebuild solely from the bundle.
            repo.rename(root / "original-source-unavailable")
            restored_git = root / "restored-git.git"
            run("git", "clone", "--mirror", str(extract_to / "source/repository.bundle"), str(restored_git))
            run("git", "-C", str(restored_git), "fsck", "--full", "--strict")
            self.assertEqual(run("git", "-C", str(restored_git), "show", "main:index.html"),
                             "<h1>Synthetic AyaPark</h1>")
            self.assertEqual(run("git", "-C", str(restored_git), "show", "main:assets/logo.txt"),
                             "synthetic asset")
            self.assertNotIn("UNTRACKED_PRIVATE_FILE",
                             run("git", "-C", str(restored_git), "ls-tree", "-r", "main"))
            self.assertTrue((extract_to / "db/application.dump").is_file())

            # Removing just one referenced Storage object must invalidate the
            # archive even when all other manifests and Git objects survive.
            missing_storage = root / "missing-storage.tar"
            with tarfile.open(recovered, "r:") as original, tarfile.open(missing_storage, "w") as modified:
                for member in original:
                    if member.name.removeprefix("./") == "storage/objects/synthetic.bin":
                        continue
                    if member.isfile():
                        with original.extractfile(member) as fp:
                            modified.addfile(member, fp)
                    else:
                        modified.addfile(member)
            failed = subprocess.run(["python3", str(checker), str(missing_storage)],
                                    text=True, capture_output=True, check=False)
            self.assertNotEqual(failed.returncode, 0)
            self.assertIn("mismatch", failed.stderr.lower())


if __name__ == "__main__":
    unittest.main()
