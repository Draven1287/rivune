#!/usr/bin/env python3
"""Create a new isolated Rivune QA .app wrapper; never modifies an existing bundle."""
from __future__ import annotations
import argparse, hashlib, json, os, plistlib, shutil, stat
from pathlib import Path

APP_ICON_SHA256 = "487636baa681f9a1c61fa1d42bf7c2f85cb0db052408512a11867aa73693cd02"

def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def absolute_existing_file(value: str, label: str) -> Path:
    path = Path(value)
    if not path.is_absolute() or not path.is_file() or path.is_symlink():
        raise SystemExit(f"{label} must be an absolute regular file")
    return path.resolve()

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--binary", required=True)
    parser.add_argument("--icon", required=True)
    parser.add_argument("--out-app", required=True)
    parser.add_argument("--profile", required=True)
    parser.add_argument("--bundle-id", required=True)
    parser.add_argument("--display-name", default="Rivune QA")
    parser.add_argument("--version", default="0.0.1")
    parser.add_argument("--build", required=True)
    args = parser.parse_args()

    binary = absolute_existing_file(args.binary, "--binary")
    icon = absolute_existing_file(args.icon, "--icon")
    if sha256(icon) != APP_ICON_SHA256:
        raise SystemExit("--icon is not the accepted Rivune AppIcon.icns")
    output = Path(args.out_app)
    profile = Path(args.profile)
    if not output.is_absolute() or output.suffix != ".app":
        raise SystemExit("--out-app must be an absolute .app path")
    if output.exists() or output.is_symlink():
        raise SystemExit("refusing to overwrite an existing QA app")
    if not profile.is_absolute():
        raise SystemExit("--profile must be absolute")
    if args.display_name != "Rivune QA" and not args.display_name.startswith("Rivune "):
        raise SystemExit("--display-name must retain the Rivune product name")
    if not args.bundle_id.startswith("com.rivune.desktop.qa."):
        raise SystemExit("--bundle-id must use the isolated Rivune QA namespace")

    contents = output / "Contents"
    macos = contents / "MacOS"
    resources = contents / "Resources"
    try:
        macos.mkdir(parents=True)
        resources.mkdir()
        executable = macos / "rivune"
        shutil.copy2(binary, executable)
        executable.chmod(executable.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        shutil.copy2(icon, resources / "AppIcon.icns")
        plist = {
            "CFBundleDisplayName": args.display_name,
            "CFBundleExecutable": "rivune",
            "CFBundleIconFile": "AppIcon.icns",
            "CFBundleIdentifier": args.bundle_id,
            "CFBundleName": args.display_name,
            "CFBundlePackageType": "APPL",
            "CFBundleShortVersionString": args.version,
            "CFBundleVersion": args.build,
            "LSEnvironment": {"RIVUNE_ISOLATED_PROFILE_DIR": str(profile)},
            "NSHighResolutionCapable": True,
        }
        with (contents / "Info.plist").open("wb") as stream:
            plistlib.dump(plist, stream, sort_keys=True)
    except BaseException:
        shutil.rmtree(output, ignore_errors=True)
        raise

    receipt = {
        "bundle": str(output),
        "binarySource": str(binary),
        "binarySha256": sha256(binary),
        "executable": str(executable),
        "executableSha256": sha256(executable),
        "iconSha256": sha256(resources / "AppIcon.icns"),
        "infoPlistSha256": sha256(contents / "Info.plist"),
        "profile": str(profile),
        "bundleIdentifier": args.bundle_id,
        "signedDistribution": False,
    }
    print(json.dumps(receipt, indent=2))

if __name__ == "__main__":
    main()
