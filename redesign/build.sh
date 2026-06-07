#!/usr/bin/env bash
# Build the production app bundle from tracked source and update cache hashes.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
APP="$ROOT/redesign/app"
ENTRY="$APP/.app-concat.jsx"

cleanup() {
  rm -f "$ENTRY"
}
trap cleanup EXIT

cat \
  "$APP/data.jsx" \
  "$APP/components.jsx" \
  "$APP/app-screens1.jsx" \
  "$APP/app-screens2.jsx" \
  "$APP/index-src.jsx" \
  > "$ENTRY"

if command -v esbuild >/dev/null 2>&1; then
  ESBUILD=(esbuild)
elif npx --no-install esbuild --version >/dev/null 2>&1; then
  ESBUILD=(npx --no-install esbuild)
else
  printf '[build] esbuild missing. Install it before building.\n' >&2
  exit 2
fi

"${ESBUILD[@]}" "$ENTRY" \
  --bundle=false \
  --format=iife \
  --target=es2019 \
  --outfile="$APP/bundle.js"

HASH=$(sha256sum "$APP/bundle.js" | cut -c1-8)

sed -Ei \
  -e "s#(redesign/app/(bundle\\.js|design-system\\.css|app\\.css))(\\?v=[a-zA-Z0-9.]+)?#\\1?v=$HASH#g" \
  "$ROOT/index.html"

sed -Ei \
  -e "s#((bundle\\.js|design-system\\.css|app\\.css))(\\?v=[a-zA-Z0-9.]+)?#\\1?v=$HASH#g" \
  "$APP/index.html"

printf '[build] bundle=%s target=es2019\n' "$HASH"
