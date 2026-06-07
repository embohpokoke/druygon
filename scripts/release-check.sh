#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
URL=${DRUYGON_URL:-https://druygon.my.id}

for path in / /parent /tutor /manifest.json /sw.js /redesign/app/bundle.js /api/content/regions; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "$URL$path")
  if [ "$code" != 200 ]; then
    printf '[release-check] FAIL: %s returned %s\n' "$path" "$code" >&2
    exit 1
  fi
done

if node -e "require('playwright')" >/dev/null 2>&1; then
  node "$ROOT/scripts/browser-smoke.js"
  exit
fi

PLAYWRIGHT_PACKAGE=$(find "$HOME/.npm/_npx" -path '*/node_modules/playwright/package.json' -print 2>/dev/null | head -1)
if [ -z "$PLAYWRIGHT_PACKAGE" ]; then
  printf '[release-check] Playwright missing. Run: npx playwright install chromium webkit\n' >&2
  exit 2
fi

NODE_PATH=$(dirname "$(dirname "$PLAYWRIGHT_PACKAGE")") node "$ROOT/scripts/browser-smoke.js"
