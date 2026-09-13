#!/usr/bin/env python3
"""Read-only validator for pre-recorded macOS app-bundle evidence."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
from typing import Any


VERSION = re.compile(r"^[0-9]+(?:\.[0-9]+)*$")
ARCH = re.compile(r"\b(arm64|x86_64)\b")


def version_tuple(value: Any) -> tuple[int, ...] | None:
    if not isinstance(value, str) or not VERSION.fullmatch(value):
        return None
    return tuple(int(part) for part in value.split("."))


def comparable_versions(
    left: tuple[int, ...], right: tuple[int, ...]
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    width = max(len(left), len(right))
    return left + (0,) * (width - len(left)), right + (0,) * (width - len(right))


def tool(evidence: dict[str, Any], name: str) -> dict[str, Any]:
    value = evidence.get("tools", {}).get(name)
    return value if isinstance(value, dict) else {"status": "unavailable"}


def successful(record: dict[str, Any]) -> bool:
    return (
        record.get("status") == "ok"
        and record.get("exit_code") == 0
        and record.get("truncated") is not True
    )


def parse_architectures(file_record: dict[str, Any]) -> list[str] | None:
    if not successful(file_record) or not isinstance(file_record.get("stdout"), str):
        return None
    architectures = sorted(set(ARCH.findall(file_record["stdout"])))
    return architectures or None


def parse_vtool(
    vtool_record: dict[str, Any],
    fallback_architectures: list[str] | None = None,
) -> list[dict[str, str]] | None:
    if not successful(vtool_record) or not isinstance(vtool_record.get("stdout"), str):
        return None
    text = vtool_record["stdout"]
    headers = list(re.finditer(r"(?m)^.*?\(architecture (arm64|x86_64)\):\s*$", text))
    chunks: list[tuple[str | None, str]] = []
    if headers:
        for index, header in enumerate(headers):
            end = headers[index + 1].start() if index + 1 < len(headers) else len(text)
            chunks.append((header.group(1), text[header.end():end]))
    else:
        arches = sorted(set(ARCH.findall(text)))
        if not arches and fallback_architectures and len(fallback_architectures) == 1:
            arches = fallback_architectures
        chunks.append((arches[0] if len(arches) == 1 else None, text))
    slices = []
    for architecture, chunk in chunks:
        command = re.search(r"(?m)^\s*cmd\s+(LC_BUILD_VERSION|LC_VERSION_MIN_MACOSX)\s*$", chunk)
        minimum = re.search(r"(?m)^\s*(?:minos|version)\s+([0-9]+(?:\.[0-9]+)*)\s*$", chunk)
        sdk = re.search(r"(?m)^\s*sdk\s+([0-9]+(?:\.[0-9]+)*)\s*$", chunk)
        if architecture and command and minimum:
            platform_match = re.search(r"(?m)^\s*platform\s+(\S+)\s*$", chunk)
            platform_value = platform_match.group(1) if platform_match else None
            if command.group(1) == "LC_VERSION_MIN_MACOSX":
                platform = "MACOS"
                platform_source = "load_command"
            else:
                platform = "MACOS" if platform_value in {"MACOS", "1"} else platform_value
                platform_source = "platform_field"
            item = {
                "architecture": architecture,
                "load_command": command.group(1),
                "minimum_os": minimum.group(1),
                "platform": platform,
                "platform_source": platform_source,
            }
            if sdk:
                item["sdk"] = sdk.group(1)
            slices.append(item)
    return slices or None


def parse_codesign(display: dict[str, Any], verify: dict[str, Any]) -> dict[str, Any]:
    if not successful(display) or not isinstance(display.get("stderr"), str):
        return {"classification": "unknown", "qualified": False}
    text = display.get("stdout", "") + display.get("stderr", "")
    identifier_match = re.search(r"(?m)^Identifier=(.+)$", text)
    identifier = identifier_match.group(1).strip() if identifier_match else None
    app_bundle = bool(re.search(r"(?m)^Format=app bundle\b", text))
    adhoc = "flags=0x2(adhoc)" in text or "Signature=adhoc" in text
    team = re.search(r"(?m)^TeamIdentifier=(.+)$", text)
    team_id = None if not team or team.group(1).strip() == "not set" else team.group(1).strip()
    sealed_none = "Sealed Resources=none" in text
    plist_unbound = "Info.plist=not bound" in text
    sealed_resources = bool(re.search(r"(?m)^Sealed Resources version=\d+\b", text))
    plist_bound = bool(
        re.search(r"(?m)^Info\.plist=(?:bound|entries=\d+)\s*$", text)
        or re.search(r"(?m)^Info\.plist entries=\d+\s*$", text)
    )
    verified = successful(verify)
    if adhoc and (sealed_none or plist_unbound) and not verified:
        classification = "linker_only"
    elif verified and app_bundle and identifier and sealed_resources and plist_bound and not sealed_none and not plist_unbound:
        classification = "bundle_sealed_identity" if team_id else "bundle_sealed_ad_hoc"
    elif not verified:
        classification = "invalid_bundle_signature"
    else:
        classification = "unknown"
    return {
        "classification": classification,
        "qualified": verified and classification in {"bundle_sealed_identity", "bundle_sealed_ad_hoc"},
        "ad_hoc": adhoc,
        "identifier": identifier,
        "app_bundle": app_bundle,
        "team_identifier": team_id,
        "sealed_resources_none": sealed_none,
        "info_plist_unbound": plist_unbound,
        "sealed_resources_present": sealed_resources,
        "info_plist_bound": plist_bound,
        "verify_exit_code": verify.get("exit_code"),
        "verify_error": verify.get("stderr", ""),
    }


def validate(evidence: dict[str, Any]) -> dict[str, Any]:
    findings: list[dict[str, str]] = []

    def finding(code: str, severity: str, message: str) -> None:
        findings.append({"code": code, "severity": severity, "message": message})

    plist = evidence.get("info_plist")
    expected = evidence.get("expected")
    if not isinstance(plist, dict):
        plist = {}
        finding("plist.unavailable", "error", "Structured Info.plist evidence is unavailable.")
    if not isinstance(expected, dict):
        expected = {}
        finding("policy.unavailable", "error", "Expected product metadata is unavailable.")

    required = (
        "CFBundleExecutable",
        "CFBundleIdentifier",
        "CFBundleShortVersionString",
        "CFBundleVersion",
        "LSMinimumSystemVersion",
    )
    for key in required:
        if not isinstance(plist.get(key), str) or not plist[key].strip():
            finding(f"plist.missing.{key}", "error", f"{key} is missing or invalid.")

    executable_name = evidence.get("executable_name")
    if not isinstance(executable_name, str) or not executable_name:
        finding("executable.name_unavailable", "error", "Observed executable basename is unavailable.")
    elif plist.get("CFBundleExecutable") != executable_name:
        finding("identity.executable_mismatch", "error", "CFBundleExecutable does not match the observed executable basename.")

    comparisons = (
        ("CFBundleIdentifier", "bundle_identifier"),
        ("CFBundleShortVersionString", "short_version"),
        ("CFBundleVersion", "bundle_version"),
    )
    for plist_key, expected_key in comparisons:
        if expected_key not in expected:
            finding(f"policy.missing.{expected_key}", "error", f"Expected {expected_key} is unavailable.")
        elif plist.get(plist_key) != expected.get(expected_key):
            finding(f"identity.{expected_key}_mismatch", "error", f"{plist_key} does not match the expected product value.")

    plist_min = version_tuple(plist.get("LSMinimumSystemVersion"))
    expected_min = version_tuple(expected.get("minimum_macos"))
    if plist_min is None:
        finding("deployment.plist_minimum_invalid", "error", "LSMinimumSystemVersion is missing or malformed.")
    if expected_min is None:
        finding("policy.minimum_macos_unavailable", "error", "Expected minimum macOS is missing or malformed.")
    elif plist_min is not None:
        comparable_plist, comparable_expected = comparable_versions(plist_min, expected_min)
        if comparable_plist != comparable_expected:
            finding("deployment.policy_mismatch", "error", "LSMinimumSystemVersion does not match the expected product minimum.")

    carbon = plist.get("LSRequiresCarbon")
    if carbon is True:
        finding("plist.legacy_carbon", "error", "LSRequiresCarbon=true is legacy metadata and must be removed or explicitly justified.")
    elif carbon is not None and not isinstance(carbon, bool):
        finding("plist.legacy_carbon_invalid", "error", "LSRequiresCarbon must be absent or a boolean.")
    elif carbon is False:
        finding("plist.legacy_carbon_present", "warning", "LSRequiresCarbon is legacy metadata and should be removed even when false.")

    file_arches = parse_architectures(tool(evidence, "file"))
    slices = parse_vtool(tool(evidence, "vtool"), file_arches)
    if file_arches is None:
        finding("architecture.file_unavailable", "error", "Executable architecture output is unavailable or unparseable.")
    if slices is None:
        finding("deployment.vtool_unavailable", "error", "Per-slice Mach-O deployment output is unavailable or unparseable.")
        slice_arches = None
    else:
        slice_arches = sorted(item["architecture"] for item in slices)
        for item in slices:
            if item.get("platform") != "MACOS":
                finding(
                    "deployment.slice_platform_not_macos",
                    "error",
                    f"{item['architecture']} Mach-O platform is {item.get('platform') or 'missing'}, not macOS.",
                )
            slice_min = version_tuple(item["minimum_os"])
            if slice_min is None:
                finding("deployment.slice_minimum_invalid", "error", f"{item['architecture']} minimum OS is malformed.")
            elif plist_min is not None:
                comparable_plist, comparable_slice = comparable_versions(plist_min, slice_min)
                if comparable_plist < comparable_slice:
                    finding(
                        "deployment.bundle_understates_slice",
                        "error",
                        f"Bundle minimum {plist.get('LSMinimumSystemVersion')} is lower than {item['architecture']} Mach-O minimum {item['minimum_os']}.",
                    )

    if file_arches is not None and slice_arches is not None and file_arches != slice_arches:
        finding("architecture.tool_mismatch", "error", "file and vtool report different architecture sets.")
    expected_arches = expected.get("architectures")
    if not isinstance(expected_arches, list) or not expected_arches or any(a not in {"arm64", "x86_64"} for a in expected_arches):
        finding("policy.architectures_unavailable", "error", "Expected architectures are unavailable or invalid.")
    elif file_arches is not None and sorted(set(expected_arches)) != file_arches:
        finding("architecture.policy_mismatch", "error", "Observed executable architectures do not match the expected product architectures.")

    signature = parse_codesign(tool(evidence, "codesign_display"), tool(evidence, "codesign_verify"))
    if not signature["qualified"]:
        finding("signature.not_bundle_sealed", "error", f"Signature classification is {signature['classification']}.")
    elif signature.get("identifier") != plist.get("CFBundleIdentifier"):
        finding("signature.identifier_mismatch", "error", "Signed identifier does not match CFBundleIdentifier.")

    errors = [item for item in findings if item["severity"] == "error"]
    return {
        "schema_version": 1,
        "artifact": evidence.get("artifact"),
        "qualified_for_native_review": not errors,
        "distribution_ready": False,
        "distribution_note": "Metadata consistency and even a valid ad hoc bundle seal do not establish distribution readiness.",
        "observed": {
            "bundle_executable": plist.get("CFBundleExecutable"),
            "bundle_identifier": plist.get("CFBundleIdentifier"),
            "short_version": plist.get("CFBundleShortVersionString"),
            "bundle_version": plist.get("CFBundleVersion"),
            "bundle_minimum_macos": plist.get("LSMinimumSystemVersion"),
            "file_architectures": file_arches,
            "macho_slices": slices,
            "signature": signature,
        },
        "findings": findings,
        "evidence": evidence,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Recorded structured evidence JSON")
    parser.add_argument("--output", type=Path, help="Write report JSON; stdout is used when omitted")
    args = parser.parse_args()
    raw = args.input.read_bytes()
    evidence = json.loads(raw)
    if not isinstance(evidence, dict):
        raise ValueError("evidence root must be an object")
    report = validate(evidence)
    report["evidence_sha256"] = hashlib.sha256(raw).hexdigest()
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.write_text(encoded)
    else:
        sys.stdout.write(encoded)
    return 0 if report["qualified_for_native_review"] else 2


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, TypeError, json.JSONDecodeError) as error:
        sys.stderr.write(f"validation input error: {error}\n")
        raise SystemExit(3)
