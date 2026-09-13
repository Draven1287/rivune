#!/usr/bin/env python3
"""Prepare a site-only local review patch from a frozen candidate; never publish."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tempfile


def run(*args, cwd=None):
    return subprocess.check_output(args, cwd=cwd, text=True)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(candidate, baseline_repo, workflow, base, output):
    manifest = json.loads((candidate / "manifest.json").read_text())
    source_hashes = manifest["source_sha256"]
    if not isinstance(source_hashes, dict) or not source_hashes:
        raise ValueError("An explicit frozen source manifest is required")
    paths = []
    for name, expected in source_hashes.items():
        rel = PurePosixPath(name)
        if rel.is_absolute() or any(p in ("..", ".git", ".qa", "dist", "__pycache__") for p in rel.parts):
            raise ValueError(f"Unpublishable source path: {name}")
        source = candidate / "site" / name
        if not source.is_file() or source.is_symlink() or not source.resolve().is_relative_to((candidate / "site").resolve()):
            raise ValueError(f"Invalid source file: {name}")
        if digest(source) != expected:
            raise ValueError(f"Frozen source changed: {name}")
        paths.append(name)
    if not workflow.is_file() or workflow.is_symlink():
        raise ValueError("A regular workflow file is required")
    resolved_base = run("git", "rev-parse", "--verify", base + "^{commit}", cwd=baseline_repo).strip()
    output.mkdir(parents=True, exist_ok=True)
    materialized = Path(tempfile.mkdtemp(prefix="rivune-pages-integration-")) / "repo"
    run("git", "clone", "--local", "--no-hardlinks", "--no-checkout", str(baseline_repo.resolve()), str(materialized))
    run("git", "checkout", "--detach", resolved_base, cwd=materialized)
    allowed = [".github/workflows/rivune-pages.yml"] + ["pages-site/" + p for p in sorted(paths)]
    for rel in allowed:
        target = materialized / rel
        if target.exists():
            raise ValueError(f"Baseline now contains {rel}; review the upstream change before replacing it")
        target.parent.mkdir(parents=True, exist_ok=True)
        source = workflow if rel.startswith(".github/") else candidate / "site" / rel.removeprefix("pages-site/")
        shutil.copyfile(source, target)
    run("git", "add", "--", *allowed, cwd=materialized)
    actual = run("git", "diff", "--cached", "--name-only", cwd=materialized).splitlines()
    if sorted(actual) != sorted(allowed):
        raise ValueError("Staged scope differs from the reviewed website manifest")
    statuses = run("git", "diff", "--cached", "--name-status", cwd=materialized).splitlines()
    if any(not line.startswith("A\t") for line in statuses):
        raise ValueError("An existing public file would be modified")
    patch = subprocess.check_output(["git", "diff", "--cached", "--binary"], cwd=materialized)
    (output / "integration.patch").write_bytes(patch)
    result = {"base": resolved_base, "candidate": str(candidate.resolve()),
              "materialized": str(materialized), "source_file_count": len(paths),
              "public_file_count": len(allowed), "files": {p: digest(materialized / p) for p in allowed},
              "patch_sha256": hashlib.sha256(patch).hexdigest(),
              "existing_public_files_changed": False, "pushed": False, "deployed": False,
              "validation": "Pending tests, build, patch reconstruction and rendered acceptance"}
    (output / "integration.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--baseline-repo", type=Path, required=True)
    parser.add_argument("--workflow", type=Path, required=True)
    parser.add_argument("--base", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    prepare(args.candidate, args.baseline_repo, args.workflow, args.base, args.output)
