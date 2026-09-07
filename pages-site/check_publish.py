#!/usr/bin/env python3
"""Fail closed before artifact publication; does not enable or deploy GitHub Pages."""
import json
import os
from pathlib import Path
import sys


def authorize_publication(env, manifest):
    if (env.get("GITHUB_EVENT_NAME") != "workflow_dispatch"
            or env.get("GITHUB_REF") != "refs/heads/main"
            or env.get("PUBLISH_REQUESTED") != "true"):
        raise ValueError("Publishing requires an explicit manual request from main")
    target = env.get("PUBLISH_TARGET")
    approvals = {"preview": "PREVIEW_APPROVED", "validated-beta": "BETA_APPROVED"}
    if target not in approvals or env.get(approvals[target]) != "true":
        raise ValueError("This publication target does not have launch approval")
    expected_status = "coming-soon" if target == "preview" else "ready"
    if (manifest.get("publishTarget") != target or manifest.get("simulation") is not False
            or manifest.get("releaseStatus") != expected_status):
        raise ValueError("The built artifact does not match the approved publication target")
    return target


if __name__ == "__main__":
    try:
        manifest = json.loads((Path(__file__).resolve().parent / "dist/build-manifest.json").read_text())
        target = authorize_publication(os.environ, manifest)
    except (ValueError, OSError, TypeError) as error:
        sys.exit(f"Publication refused: {error}")
    print(f"Publication gate passed for {target}; deployment is a separate workflow step")
