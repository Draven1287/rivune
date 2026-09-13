#!/usr/bin/env python3
"""Anchor evidence/report writes to an opened directory and run the bound validator."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys


OPEN_DIRECTORY = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0)
OPEN_NEW = os.O_RDWR | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)


def digest_bytes(value):
    return hashlib.sha256(value).hexdigest()


def digest_file(path):
    return digest_bytes(Path(path).read_bytes())


def same_inode(left, right):
    return (left.st_dev, left.st_ino) == (right.st_dev, right.st_ino)


def output_is_within_source(output_fd, source_stat):
    current = os.dup(output_fd)
    try:
        for _ in range(1024):
            current_stat = os.fstat(current)
            if same_inode(current_stat, source_stat):
                return True
            parent = os.open("..", OPEN_DIRECTORY, dir_fd=current)
            parent_stat = os.fstat(parent)
            if same_inode(parent_stat, current_stat):
                os.close(parent)
                return False
            os.close(current)
            current = parent
        raise ValueError("directory ancestry exceeded safety limit")
    finally:
        os.close(current)


def open_bound_roots(source_root, output_root):
    source_fd = os.open(source_root, OPEN_DIRECTORY)
    try:
        output_fd = os.open(output_root, OPEN_DIRECTORY)
    except Exception:
        os.close(source_fd)
        raise
    try:
        if output_is_within_source(output_fd, os.fstat(source_fd)):
            raise ValueError("artifact output root resolves inside accepted source")
        return source_fd, output_fd
    except Exception:
        os.close(source_fd)
        os.close(output_fd)
        raise


def validate_leaf(name, label):
    if not name or name in {".", ".."} or "/" in name or os.sep in name:
        raise ValueError(label + " must be a direct filename")


def assert_fresh_at(root_fd, name, label):
    try:
        os.stat(name, dir_fd=root_fd, follow_symlinks=False)
    except FileNotFoundError:
        return
    raise FileExistsError(label + " already exists")


def write_new_at(root_fd, name, payload):
    fd = os.open(name, OPEN_NEW, 0o600, dir_fd=root_fd)
    try:
        view = memoryview(payload)
        while view:
            written = os.write(fd, view)
            if written <= 0:
                raise OSError("short write")
            view = view[written:]
        os.fsync(fd)
        os.lseek(fd, 0, os.SEEK_SET)
        return fd
    except Exception:
        os.close(fd)
        raise


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", required=True)
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--evidence-name", required=True)
    parser.add_argument("--report-name", required=True)
    parser.add_argument("--python", required=True)
    parser.add_argument("--validator", required=True)
    parser.add_argument("--validator-sha256", required=True)
    parser.add_argument("--check-only", action="store_true")
    args = parser.parse_args()
    validate_leaf(args.evidence_name, "evidence name")
    validate_leaf(args.report_name, "report name")
    if args.evidence_name == args.report_name:
        raise ValueError("evidence and report names must differ")
    source_fd, output_fd = open_bound_roots(args.source_root, args.output_root)
    try:
        assert_fresh_at(output_fd, args.evidence_name, "evidence")
        assert_fresh_at(output_fd, args.report_name, "report")
        if args.check_only:
            print(json.dumps({"status": "safe", "writes": 0}))
            return 0
        if digest_file(args.validator) != args.validator_sha256:
            raise ValueError("validator SHA-256 changed")
        evidence_payload = sys.stdin.buffer.read()
        evidence = json.loads(evidence_payload)
        if not isinstance(evidence, dict):
            raise ValueError("evidence root must be an object")
        evidence_payload = (json.dumps(evidence, indent=2) + "\n").encode()
        evidence_fd = write_new_at(output_fd, args.evidence_name, evidence_payload)
        try:
            validator = subprocess.run(
                [args.python, args.validator, "--input", "/dev/fd/" + str(evidence_fd)],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                pass_fds=(evidence_fd,),
                shell=False,
                check=False,
            )
        finally:
            os.close(evidence_fd)
        report = json.loads(validator.stdout)
        report_payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
        report_fd = write_new_at(output_fd, args.report_name, report_payload)
        os.close(report_fd)
        qualified = (
            validator.returncode == 0
            and report.get("qualified_for_native_review") is True
            and report.get("distribution_ready") is False
            and report.get("evidence_sha256") == digest_bytes(evidence_payload)
        )
        summary = {
            "status": "qualified" if qualified else "failed",
            "validator_exit_code": validator.returncode,
            "validator_stderr": validator.stderr.decode("utf8", "replace"),
            "evidence_sha256": digest_bytes(evidence_payload),
            "report_sha256": digest_bytes(report_payload),
            "report": report,
        }
        print(json.dumps(summary))
        return 0 if qualified else 2
    finally:
        os.close(source_fd)
        os.close(output_fd)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, TypeError, json.JSONDecodeError) as error:
        sys.stderr.write("safe artifact I/O refused: " + str(error) + "\n")
        raise SystemExit(3)
