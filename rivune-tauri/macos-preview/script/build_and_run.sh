#!/usr/bin/env bash
set -euo pipefail
PREVIEW_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# This process name belongs only to the dedicated preview; the existing Rivune app is untouched.
pkill -x RivunePreview >/dev/null 2>&1 || true
"$PREVIEW_ROOT/script/build.sh"
/usr/bin/open "$PREVIEW_ROOT/build/Rivune Preview.app"
