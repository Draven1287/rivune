#!/usr/bin/env bash
set -euo pipefail
PREVIEW_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Keep test signing outside file-provider managed directories.
TEST_ROOT="$(mktemp -d /private/tmp/rivune-swift-tests.XXXXXX)"
cp -R "$PREVIEW_ROOT/Sources" "$PREVIEW_ROOT/Tests" "$TEST_ROOT/"
cp "$PREVIEW_ROOT/Package.swift" "$PREVIEW_ROOT/Package.resolved" "$TEST_ROOT/"
export CLANG_MODULE_CACHE_PATH="$TEST_ROOT/cache"
export SWIFTPM_MODULECACHE_OVERRIDE="$TEST_ROOT/cache"
swift test --package-path "$TEST_ROOT" --scratch-path "$TEST_ROOT/build" --disable-sandbox
