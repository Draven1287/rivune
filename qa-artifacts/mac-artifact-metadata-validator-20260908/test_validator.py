import json
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest

from validate_mac_artifact import comparable_versions, parse_architectures, parse_codesign, parse_vtool, validate


ROOT = Path(__file__).resolve().parent
FIXTURES = ROOT / "fixtures"


def load(name):
    return json.loads((FIXTURES / name).read_text())


def codes(report):
    return {item["code"] for item in report["findings"]}


class ParserTests(unittest.TestCase):
    def test_version_comparison_treats_trailing_zero_as_equal(self):
        left, right = comparable_versions((11,), (11, 0))
        self.assertEqual(left, right)

    def test_file_parser_handles_thin_and_universal_output(self):
        thin = load("matched-thin.json")["tools"]["file"]
        universal = load("universal-slices.json")["tools"]["file"]
        self.assertEqual(parse_architectures(thin), ["arm64"])
        self.assertEqual(parse_architectures(universal), ["arm64", "x86_64"])

    def test_vtool_parser_handles_thin_fallback_and_universal_slices(self):
        thin = load("matched-thin.json")["tools"]["vtool"]
        parsed_thin = parse_vtool(thin, ["arm64"])[0]
        self.assertEqual(parsed_thin["minimum_os"], "11.0")
        self.assertEqual(parsed_thin["platform"], "MACOS")
        universal = parse_vtool(load("universal-slices.json")["tools"]["vtool"])
        self.assertEqual(
            {(item["architecture"], item["minimum_os"]) for item in universal},
            {("arm64", "11.0"), ("x86_64", "10.13")},
        )

    def test_vtool_accepts_numeric_macos_and_legacy_macos_command(self):
        current = load("matched-thin.json")["tools"]["vtool"]
        numeric = {**current, "stdout": current["stdout"].replace("platform MACOS", "platform 1")}
        self.assertEqual(parse_vtool(numeric, ["arm64"])[0]["platform"], "MACOS")
        legacy = {**current, "stdout": current["stdout"]
                  .replace("cmd LC_BUILD_VERSION", "cmd LC_VERSION_MIN_MACOSX")
                  .replace("platform MACOS\n", "")
                  .replace("minos 11.0", "version 11.0")}
        parsed = parse_vtool(legacy, ["arm64"])[0]
        self.assertEqual(parsed["platform"], "MACOS")
        self.assertEqual(parsed["platform_source"], "load_command")

    def test_signature_parser_distinguishes_linker_only_and_bundle_seal(self):
        regression = load("r3-regression.json")["tools"]
        self.assertEqual(
            parse_codesign(regression["codesign_display"], regression["codesign_verify"])["classification"],
            "linker_only",
        )
        matched = load("matched-thin.json")["tools"]
        self.assertEqual(
            parse_codesign(matched["codesign_display"], matched["codesign_verify"])["classification"],
            "bundle_sealed_ad_hoc",
        )


class QualificationTests(unittest.TestCase):
    def test_matched_thin_is_qualified_for_native_review_only(self):
        report = validate(load("matched-thin.json"))
        self.assertTrue(report["qualified_for_native_review"])
        self.assertFalse(report["distribution_ready"])
        self.assertEqual(report["findings"], [])

    def test_universal_slices_accept_conservative_bundle_minimum(self):
        report = validate(load("universal-slices.json"))
        self.assertTrue(report["qualified_for_native_review"])
        self.assertEqual(report["observed"]["file_architectures"], ["arm64", "x86_64"])
        self.assertEqual(len(report["observed"]["macho_slices"]), 2)

    def test_r3_regression_detects_every_recorded_metadata_defect(self):
        report = validate(load("r3-regression.json"))
        self.assertFalse(report["qualified_for_native_review"])
        self.assertEqual(report["observed"]["signature"]["classification"], "linker_only")
        self.assertTrue(
            {
                "deployment.policy_mismatch",
                "deployment.bundle_understates_slice",
                "plist.legacy_carbon",
                "signature.not_bundle_sealed",
            }.issubset(codes(report))
        )

    def test_missing_fields_and_unavailable_tools_fail_explicitly(self):
        report = validate(load("missing-fields.json"))
        self.assertFalse(report["qualified_for_native_review"])
        self.assertIn("plist.missing.CFBundleExecutable", codes(report))
        self.assertIn("architecture.file_unavailable", codes(report))
        self.assertIn("deployment.vtool_unavailable", codes(report))
        self.assertEqual(report["observed"]["signature"]["classification"], "unknown")

    def test_tool_failures_do_not_become_empty_successes(self):
        report = validate(load("tool-failures.json"))
        self.assertFalse(report["qualified_for_native_review"])
        self.assertIn("architecture.file_unavailable", codes(report))
        self.assertIn("deployment.vtool_unavailable", codes(report))
        self.assertIn("signature.not_bundle_sealed", codes(report))

    def test_empty_success_outputs_fail_qualification(self):
        evidence = load("matched-thin.json")
        evidence["tools"]["file"]["stdout"] = ""
        evidence["tools"]["vtool"]["stdout"] = ""
        evidence["tools"]["codesign_display"]["stderr"] = ""
        report = validate(evidence)
        self.assertFalse(report["qualified_for_native_review"])
        self.assertIn("architecture.file_unavailable", codes(report))
        self.assertIn("deployment.vtool_unavailable", codes(report))
        self.assertEqual(report["observed"]["signature"]["classification"], "unknown")

    def test_non_macos_or_missing_build_platform_blocks_qualification(self):
        cases = [load("non-macos-slice.json"), load("matched-thin.json")]
        cases[1]["tools"]["vtool"]["stdout"] = cases[1]["tools"]["vtool"]["stdout"].replace(
            "platform MACOS", ""
        )
        for evidence in cases:
            report = validate(evidence)
            self.assertFalse(report["qualified_for_native_review"])
            self.assertIn("deployment.slice_platform_not_macos", codes(report))

    def test_verified_signature_requires_positive_seal_and_plist_binding(self):
        report = validate(load("incomplete-seal.json"))
        self.assertFalse(report["qualified_for_native_review"])
        self.assertEqual(report["observed"]["signature"]["classification"], "unknown")
        self.assertIn("signature.not_bundle_sealed", codes(report))

    def test_explicitly_truncated_signature_display_is_unknown(self):
        report = validate(load("truncated-display.json"))
        self.assertFalse(report["qualified_for_native_review"])
        self.assertEqual(report["observed"]["signature"]["classification"], "unknown")

    def test_signature_verification_failure_blocks_identity_signed_bundle(self):
        report = validate(load("signature-failure.json"))
        self.assertFalse(report["qualified_for_native_review"])
        self.assertEqual(report["observed"]["signature"]["classification"], "invalid_bundle_signature")

    def test_signed_identifier_must_match_plist_identifier(self):
        evidence = load("matched-thin.json")
        evidence["tools"]["codesign_display"]["stderr"] = evidence["tools"]["codesign_display"]["stderr"].replace(
            "Identifier=com.rivune.desktop", "Identifier=com.example.wrong"
        )
        report = validate(evidence)
        self.assertFalse(report["qualified_for_native_review"])
        self.assertIn("signature.identifier_mismatch", codes(report))

    def test_cli_writes_bound_raw_evidence_and_uses_qualification_exit_code(self):
        with TemporaryDirectory() as directory:
            good = Path(directory) / "good.json"
            bad = Path(directory) / "bad.json"
            success = subprocess.run(
                [sys.executable, str(ROOT / "validate_mac_artifact.py"),
                 "--input", str(FIXTURES / "matched-thin.json"), "--output", str(good)],
                check=False,
            )
            failure = subprocess.run(
                [sys.executable, str(ROOT / "validate_mac_artifact.py"),
                 "--input", str(FIXTURES / "r3-regression.json"), "--output", str(bad)],
                check=False,
            )
            self.assertEqual(success.returncode, 0)
            self.assertEqual(failure.returncode, 2)
            self.assertTrue(json.loads(good.read_text())["qualified_for_native_review"])
            failed_report = json.loads(bad.read_text())
            self.assertEqual(failed_report["evidence"], load("r3-regression.json"))
            self.assertEqual(len(failed_report["evidence_sha256"]), 64)


if __name__ == "__main__":
    unittest.main()
