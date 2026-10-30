#!/usr/bin/env python3
"""Synthetic tests only: no Supabase access and no personal data."""
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from check_dump_offline import examine

TOC = b"""123; 0 0 TABLE DATA auth users postgres
124; 0 0 TABLE DATA public ay2_entries postgres
125; 0 0 TABLE DATA public site_units postgres
126; 0 0 TABLE DATA ay_auth_private tokens postgres
127; 0 0 FUNCTION ay2_private guard_person_identity() postgres
"""


def completed(args, output=b""):
    return subprocess.CompletedProcess(args, 0, stdout=output, stderr=b"")


class DumpPreflightTest(unittest.TestCase):
    def setUp(self):
        t = tempfile.TemporaryDirectory()
        self.addCleanup(t.cleanup)
        self.dump = Path(t.name) / "sample.dump"
        self.dump.write_bytes(b"synthetic not actual PII")

    def fake(self, args):
        if args[1] == "--version":
            return completed(args, b"pg_restore (PostgreSQL) 17.11\n")
        if args[1] == "--list":
            return completed(args, TOC)
        self.assertEqual(args[1:3], ["--file", "/dev/null"])
        self.assertNotIn("--dbname", args)
        return completed(args)

    def test_synthetic_success(self):
        with patch("check_dump_offline.run_tool", self.fake):
            result = examine(self.dump)
        self.assertTrue(result["payload_readable"])
        self.assertFalse(result["restore_tested"])

    def test_missing_private_data_fails(self):
        def fake(args):
            result = self.fake(args)
            if args[1] == "--list":
                result.stdout = TOC.replace(b"TABLE DATA ay_auth_private tokens postgres", b"COMMENT ay_auth_private tokens postgres")
            return result
        with patch("check_dump_offline.run_tool", fake):
            with self.assertRaisesRegex(ValueError, "private-auth"):
                examine(self.dump)

    def test_missing_core_table_fails(self):
        def fake(args):
            result = self.fake(args)
            if args[1] == "--list":
                result.stdout = TOC.replace(b"TABLE DATA auth users postgres", b"COMMENT auth users postgres")
            return result
        with patch("check_dump_offline.run_tool", fake):
            with self.assertRaisesRegex(ValueError, "auth.users"):
                examine(self.dump)

    def test_bad_version_fails(self):
        def fake(args):
            result = self.fake(args)
            if args[1] == "--version":
                result.stdout = b"pg_restore (PostgreSQL) 15.2\n"
            return result
        with patch("check_dump_offline.run_tool", fake):
            with self.assertRaisesRegex(ValueError, "17"):
                examine(self.dump)

    def test_corrupt_payload_fails(self):
        def fake(args):
            result = self.fake(args)
            if args[1] == "--file":
                result.returncode = 1
            return result
        with patch("check_dump_offline.run_tool", fake):
            with self.assertRaisesRegex(ValueError, "payload"):
                examine(self.dump)

    def test_symlink_rejected(self):
        link = self.dump.with_name("symlink.dump")
        link.symlink_to(self.dump)
        with self.assertRaisesRegex(ValueError, "symlink"):
            examine(link)


if __name__ == "__main__":
    unittest.main()
