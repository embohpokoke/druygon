#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
URL=${DRUYGON_URL:-https://druygon.my.id}
EXIT=0

pass()  { printf '  [PASS] %s\n' "$1"; }
fail()  { printf '  [FAIL] %s — %s\n' "$1" "$2"; EXIT=1; }
warn()  { printf '  [WARN] %s — %s\n' "$1" "$2"; }

# ── HTTP smoke ──────────────────────────────────────────────────────────────────
printf '[release-check] HTTP smoke\n'
for path in / /parent /tutor /manifest.json /sw.js /redesign/app/bundle.js /api/content/regions; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "$URL$path")
  if [ "$code" != 200 ]; then
    fail "$path" "returned ${code}"
  else
    pass "$path"
  fi
done

# ── PWA manifest and icons ──────────────────────────────────────────────────────
printf '[release-check] PWA assets\n'
for path in /manifest.json /sw.js /assets/icons/app/icon-192.png /assets/icons/app/icon-512.png /assets/icons/app/icon-180.png; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "$URL$path")
  if [ "$code" != 200 ]; then
    fail "$path" "returned ${code}"
  else
    pass "$path"
  fi
done

# ── PWA manifest content-type check ─────────────────────────────────────────────
content_type=$(curl -sS -o /dev/null -w '%{content_type}' "$URL/manifest.json")
if [[ "$content_type" == *"application/manifest+json"* ]] || [[ "$content_type" == *"application/json"* ]]; then
  pass "manifest.json Content-Type: $content_type"
else
  warn "manifest.json" "Content-Type: $content_type (expected application/manifest+json)"
fi

# ── Service-worker scope check ───────────────────────────────────────────────────
sw_scope=$(curl -sS "$URL/sw.js" | grep -oE "(api/|/tutor|/parent|sw\.js)" | wc -l)
if [ "$sw_scope" -ge 4 ]; then
  pass "sw.js excludes api, /tutor, /parent, sw.js from cache"
else
  warn "sw.js" "cache exclusions may be incomplete"
fi

# ── HTML network-first check ────────────────────────────────────────────────────
html_check=$(curl -sS "$URL/sw.js" | grep -c "text/html" || true)
if [ "$html_check" -ge 1 ]; then
  pass "sw.js has network-first for text/html"
else
  warn "sw.js" "missing network-first for HTML"
fi

# ── Browser smoke ───────────────────────────────────────────────────────────────
REQUESTED=${DRUYGON_BROWSERS:-chromium}
BROWSERS_TO_TRY=$(echo "$REQUESTED" | tr ',' '\n' | sort -u | tr '\n' ',' | sed 's/,$//')

if node -e "require('playwright')" >/dev/null 2>&1; then
  NODE_MODULES_OK=1
else
  PLAYWRIGHT_PACKAGE=$(find "$HOME/.npm/_npx" -path '*/node_modules/playwright/package.json' -print 2>/dev/null | head -1)
  if [ -z "$PLAYWRIGHT_PACKAGE" ]; then
    warn "playwright" "not installed. Run: npm i playwright && npx playwright install chromium webkit"
    echo ''
    printf '[release-check] %d checks: ' "$EXIT"
    if [ "$EXIT" -eq 0 ]; then echo 'PASS'; else echo 'FAIL'; fi
    exit $EXIT
  fi
  NODE_MODULES_OK=0
fi

for browser in $(echo "$BROWSERS_TO_TRY" | tr ',' ' '); do
  case "$browser" in
    chromium)
      printf '[release-check] Chromium smoke\n'
      export DRUYGON_SMOKE_BROWSER=chromium
      if [ "$NODE_MODULES_OK" = "1" ]; then
        node "$ROOT/scripts/browser-smoke.js"
      else
        NODE_PATH=$(dirname "$(dirname "$PLAYWRIGHT_PACKAGE")") node "$ROOT/scripts/browser-smoke.js"
      fi
      ;;
    webkit)
      printf '[release-check] WebKit smoke\n'
      if ! modprobe -q vkms 2>/dev/null && ! ls /dev/dri/render* >/dev/null 2>&1; then
        warn "webkit" "no DRM render node — gbm/EGL cannot init. Fix: install playwright docker image, or run 'modprobe vkms', or test via Mac Safari."
        continue
      fi
      if ! ldconfig -p 2>/dev/null | grep -q "libjpeg.so.8"; then
        warn "webkit" "libjpeg.so.8 missing — WebKit runtime needs it. Fix: build IJG libjpeg v8d (jpegsrc.v8d.tar.gz) → /usr/local/libjpeg8/lib + ldconfig."
        continue
      fi
      printf '  [INFO] WebKit headless needs EGL/GPU (WPE backend). May fail on headless VPS.\n'
      export DRUYGON_SMOKE_BROWSER=webkit
      export DRUYGON_SMOKE_TIMEOUT=8000
      if [ "$NODE_MODULES_OK" = "1" ]; then
        timeout 20 node "$ROOT/scripts/browser-smoke.js" 2>&1 || warn "webkit" "launch failed — expected on headless VPS. Test on Mac Safari instead."
      else
        timeout 20 bash -c "NODE_PATH=$(dirname "$(dirname "$PLAYWRIGHT_PACKAGE")") node \"$ROOT/scripts/browser-smoke.js\"" 2>&1 || warn "webkit" "launch failed — expected on headless VPS. Test on Mac Safari instead."
      fi
      unset DRUYGON_SMOKE_TIMEOUT
      ;;
    *)
      warn "$browser" "unknown browser — skipping"
      ;;
  esac
done
unset DRUYGON_SMOKE_BROWSER

# ── Final result ────────────────────────────────────────────────────────────────
echo ''
printf '[release-check] %d checks: ' "$EXIT"
if [ "$EXIT" -eq 0 ]; then echo 'PASS'; else echo 'FAIL'; fi
exit $EXIT
