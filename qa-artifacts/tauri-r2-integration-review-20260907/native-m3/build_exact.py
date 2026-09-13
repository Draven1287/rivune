#!/usr/bin/env python3
"""Build one hash-bound Rivune QA binary without touching an installed app."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
from datetime import datetime, timezone

EXCLUDED_DIRS = {".git", "target", "node_modules", "__pycache__"}
EXCLUDED_FILES = {".DS_Store"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def files_under(root: Path):
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            raise SystemExit(f"Build input symlink requires explicit provenance: {path}")
        if not path.is_file():
            continue
        relative = path.relative_to(root)
        if any(part in EXCLUDED_DIRS for part in relative.parts) or path.name in EXCLUDED_FILES:
            continue
        yield path


def applicable_configs(crate: Path, cargo_home: Path) -> list[Path]:
    candidates = [cargo_home / "config", cargo_home / "config.toml"]
    current = crate
    while True:
        candidates.extend([current / ".cargo" / "config", current / ".cargo" / "config.toml"])
        if current.parent == current:
            break
        current = current.parent
    for path in candidates:
        if path.is_symlink():
            raise SystemExit(f"Cargo config symlink requires explicit provenance: {path}")
    return sorted({path.resolve() for path in candidates if path.is_file()})


def source_snapshot(project: Path, metadata: dict, cargo_home: Path) -> dict:
    roots = {project.resolve(), (project / "web").resolve(), (project / "src-tauri").resolve()}
    local_packages = []
    for package in metadata["packages"]:
        if package.get("source") is None:
            root = Path(package["manifest_path"]).resolve().parent
            roots.add(root)
            local_packages.append({"name": package["name"], "version": package["version"], "root": str(root)})

    # Hash the project as two explicit build-input roots, not the surrounding
    # QA artifact tree. Local Rust dependencies come from cargo metadata.
    roots.discard(project.resolve())
    entries = {}
    for root in sorted(roots):
        for path in files_under(root):
            key = str(path.resolve())
            entries[key] = sha256(path)

    configs = {str(path): sha256(path) for path in applicable_configs(project / "src-tauri", cargo_home)}
    payload = {
        "schemaVersion": 1,
        "project": str(project),
        "localPackages": sorted(local_packages, key=lambda item: (item["name"], item["root"])),
        "cargoConfigs": configs,
        "files": dict(sorted(entries.items())),
        "excludedGeneratedDirectories": sorted(EXCLUDED_DIRS),
        "excludedFiles": sorted(EXCLUDED_FILES),
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    payload["manifestSha256"] = hashlib.sha256(encoded).hexdigest()
    return payload


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True)
    parser.add_argument("--cargo-home", required=True)
    parser.add_argument("--rustup-home", required=True)
    parser.add_argument("--target-dir", required=True)
    parser.add_argument("--out-dir", required=True)
    args = parser.parse_args()

    project = Path(args.project).resolve()
    crate = project / "src-tauri"
    cargo_home = Path(args.cargo_home).resolve()
    rustup_home = Path(args.rustup_home).resolve()
    target_dir = Path(args.target_dir).resolve()
    out = Path(args.out_dir).resolve()
    expected = [out / name for name in ("SOURCE_BEFORE.json", "SOURCE_AFTER.json", "BUILD.log", "BUILD_RECEIPT.json")]
    if any(path.exists() or path.is_symlink() for path in expected):
        raise SystemExit("refusing to overwrite an existing build receipt")
    if not crate.joinpath("Cargo.toml").is_file() or not out.is_dir():
        raise SystemExit("project and existing output directory are required")

    cargo = cargo_home / "bin" / "cargo"
    rustc = cargo_home / "bin" / "rustc"
    env = {key: value for key, value in os.environ.items() if not key.startswith(("CARGO_", "RUST")) and key not in {"CC", "CXX", "CFLAGS", "CXXFLAGS", "LDFLAGS"}}
    env.update({
        "CARGO_HOME": str(cargo_home),
        "RUSTUP_HOME": str(rustup_home),
        "CARGO_TARGET_DIR": str(target_dir),
        "PATH": f"{cargo_home / 'bin'}:/usr/bin:/bin:/usr/sbin:/sbin",
    })
    compiler_version = subprocess.check_output([str(rustc), "--version", "--verbose"], cwd=crate, env=env, text=True)
    if "host: aarch64-apple-darwin" not in compiler_version.splitlines():
        raise SystemExit("Compiler host must match aarch64-apple-darwin metadata filter")
    metadata_command = [str(cargo), "metadata", "--locked", "--offline", "--format-version", "1", "--features", "custom-protocol", "--filter-platform", "aarch64-apple-darwin"]
    metadata = json.loads(subprocess.check_output(metadata_command, cwd=crate, env=env, text=True))
    before = source_snapshot(project, metadata, cargo_home)
    (out / "SOURCE_BEFORE.json").write_text(json.dumps(before, indent=2, sort_keys=True) + "\n")

    command = [str(cargo), "build", "--locked", "--offline", "--features", "custom-protocol", "--bin", "rivune"]
    started = now()
    with (out / "BUILD.log").open("wb") as log:
        completed = subprocess.run(command, cwd=crate, env=env, stdout=log, stderr=subprocess.STDOUT)
    finished = now()

    metadata_after = json.loads(subprocess.check_output(metadata_command, cwd=crate, env=env, text=True))
    after = source_snapshot(project, metadata_after, cargo_home)
    (out / "SOURCE_AFTER.json").write_text(json.dumps(after, indent=2, sort_keys=True) + "\n")
    changed = sorted(key for key in set(before["files"]) | set(after["files"]) if before["files"].get(key) != after["files"].get(key))
    binary = target_dir / "debug" / "rivune"
    receipt = {
        "command": command,
        "metadataCommand": metadata_command,
        "cwd": str(crate),
        "startedAt": started,
        "completedAt": finished,
        "exitCode": completed.returncode,
        "sourceFiles": len(before["files"]),
        "localPackages": before["localPackages"],
        "cargoConfigs": before["cargoConfigs"],
        "sourceManifestSha256": before["manifestSha256"],
        "sourceAfterManifestSha256": after["manifestSha256"],
        "changedInputs": changed,
        "cargoVersion": subprocess.check_output([str(cargo), "--version", "--verbose"], cwd=crate, env=env, text=True),
        "rustcVersion": subprocess.check_output([str(rustc), "--version", "--verbose"], cwd=crate, env=env, text=True),
        "buildEnvironment": {key: value for key, value in env.items() if key in {"CARGO_HOME", "RUSTUP_HOME", "CARGO_TARGET_DIR", "PATH", "SDKROOT", "MACOSX_DEPLOYMENT_TARGET", "RUSTFLAGS", "CARGO_ENCODED_RUSTFLAGS", "RUSTC", "RUSTC_WRAPPER", "RUSTC_WORKSPACE_WRAPPER", "CARGO_BUILD_TARGET", "CC", "CXX", "CFLAGS", "CXXFLAGS", "LDFLAGS"}},
        "helperSha256": sha256(Path(__file__)),
        "cargoSha256": sha256(cargo),
        "rustcSha256": sha256(rustc),
        "binary": str(binary),
        "binarySha256": sha256(binary) if completed.returncode == 0 and binary.is_file() else None,
        "target": metadata.get("target_directory"),
        "customProtocol": True,
        "launchPerformed": False,
        "installedAppModified": False,
    }
    (out / "BUILD_RECEIPT.json").write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n")
    if completed.returncode != 0 or changed or before["manifestSha256"] != after["manifestSha256"]:
        raise SystemExit("build was not a clean, stable success; inspect the preserved receipt")
    print(json.dumps(receipt, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
