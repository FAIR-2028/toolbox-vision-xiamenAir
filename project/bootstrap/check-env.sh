#!/usr/bin/env bash
set +e
echo "=== Toolbox Vision Demo: environment check (macOS / Linux) ==="
uname -a
for cmd in codex node npm docker pi magpie herdr; do
  if command -v "$cmd" >/dev/null 2>&1; then
    printf "%-10s FOUND (%s)\n" "$cmd" "$(command -v "$cmd")"
  else
    printf "%-10s NOT_FOUND\n" "$cmd"
  fi
done
codex --version 2>/dev/null || true
node --version 2>/dev/null || true
npm --version 2>/dev/null || true
docker --version 2>/dev/null || true
docker compose version 2>/dev/null || true
echo "=== Check complete. No environment variables or credentials were printed. ==="
