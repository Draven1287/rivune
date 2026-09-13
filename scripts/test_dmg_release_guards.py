#!/usr/bin/env python3
"""Exercise release guards without building, signing, mounting, or submitting.

The signature fixture uses codesign's actual `CodeDirectory ... flags=...`
record shape. Keeping this check catches a public-release blocker that an
ad-hoc packaging run cannot reach.
"""

import os
from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().with_name("package_macos_dmg.sh")
IDENTITY = "Developer ID Application: Example Developer (ABCDE12345)"
VALID_REPORT = f"""Executable=/example/Rivune.app/Contents/MacOS/Rivune
Identifier=com.aaravshah.alloy.mac
Format=app bundle with Mach-O universal (x86_64 arm64)
CodeDirectory v=20500 size=34384 flags=0x10000(runtime) hashes=1068+7 location=embedded
Signature size=9000
Authority={IDENTITY}
Authority=Developer ID Certification Authority
Authority=Apple Root CA
Timestamp=Sep 6, 2026 at 6:00:00 PM
TeamIdentifier=ABCDE12345
"""


class DMGReleaseGuards(unittest.TestCase):
    def check_signature(self, report, hardened=True):
        source = SCRIPT.read_text()
        function = source.split("validate_developer_signature() {", 1)[1].split(
            "submit_and_require_notary_acceptance() {", 1
        )[0]
        function = "validate_developer_signature() {" + function
        harness = """set -euo pipefail
work_dir="$1"
developer_id="$2"
codesign() { cat "$work_dir/fixture.txt" >&2; }
""" + function + '\nvalidate_developer_signature /example/Rivune.app "test app" "$3"\n'
        with tempfile.TemporaryDirectory(prefix="rivune-signature-fixture-") as tmp:
            Path(tmp, "fixture.txt").write_text(report)
            return subprocess.run(
                ["/bin/zsh", "-s", "--", tmp, IDENTITY, "1" if hardened else "0"],
                input=harness, text=True, capture_output=True, timeout=10,
            )

    def test_accepts_real_codesign_runtime_record(self):
        result = self.check_signature(VALID_REPORT)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_accepts_runtime_among_multiple_flags(self):
        result = self.check_signature(VALID_REPORT.replace(
            "flags=0x10000(runtime)", "flags=0x12000(library-validation,runtime)"
        ))
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_rejects_missing_runtime(self):
        result = self.check_signature(VALID_REPORT.replace(
            "flags=0x10000(runtime)", "flags=0x0(none)"
        ))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("missing the hardened runtime", result.stderr)

    def test_runtime_must_be_a_flag_in_the_code_directory(self):
        result = self.check_signature(VALID_REPORT.replace(
            "flags=0x10000(runtime)", "flags=0x0(none)"
        ) + "flags=runtime\nComment=runtime\n")
        self.assertNotEqual(result.returncode, 0)

    def test_dmg_signature_does_not_require_runtime(self):
        result = self.check_signature(VALID_REPORT.replace(
            "flags=0x10000(runtime)", "flags=0x0(none)"
        ), hardened=False)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_rejects_wrong_signer_missing_timestamp_and_missing_team(self):
        for report in (
            VALID_REPORT.replace(IDENTITY, "Developer ID Application: Someone Else (ZZZZZ99999)"),
            VALID_REPORT.replace("Timestamp=Sep 6, 2026 at 6:00:00 PM", "Timestamp=none"),
            VALID_REPORT.replace("TeamIdentifier=ABCDE12345", "TeamIdentifier=not set"),
        ):
            with self.subTest(report=report):
                self.assertNotEqual(self.check_signature(report).returncode, 0)

    def test_public_modes_without_credentials_stop_before_creating_artifacts(self):
        for args in ([], ["--public-release"]):
            with self.subTest(args=args), tempfile.TemporaryDirectory(prefix="rivune-public-guard-") as tmp:
                output = Path(tmp, "must-not-exist")
                env = dict(os.environ)
                env.update(RIVUNE_DEVELOPER_ID="", RIVUNE_NOTARY_PROFILE="", RIVUNE_OUTPUT_DIR=str(output))
                result = subprocess.run(
                    ["/bin/zsh", str(SCRIPT), *args], env=env,
                    text=True, capture_output=True, timeout=10,
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("Public release blocked", result.stderr)
                self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
