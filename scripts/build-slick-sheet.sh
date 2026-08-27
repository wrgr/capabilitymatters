#!/usr/bin/env bash
# Render the LENS slick sheet (slick-sheet/lens-slick-sheet.html) to the
# one-page PDF the homepage links: public/LENS_Overview_Aug2026.pdf.
#
# Uses headless Chromium, which is the only HTML-to-PDF engine that honours the
# sheet's @page/flex layout faithfully. Set CHROME to point at a binary if it is
# not on PATH under one of the names probed below.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
src="$repo_root/slick-sheet/lens-slick-sheet.html"
out="$repo_root/public/LENS_Overview_Aug2026.pdf"

# Probe the usual names; PLAYWRIGHT_BROWSERS_PATH covers CI images that ship
# Chromium under /opt rather than on PATH.
chrome="${CHROME:-}"
if [ -z "$chrome" ]; then
  for candidate in \
    "${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}/chromium" \
    "${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}/chromium/chrome-linux/chrome" \
    "$(command -v chromium || true)" \
    "$(command -v chromium-browser || true)" \
    "$(command -v google-chrome || true)"; do
    if [ -n "$candidate" ] && [ -x "$candidate" ]; then chrome="$candidate"; break; fi
  done
fi
if [ -z "$chrome" ]; then
  echo "error: no Chromium binary found; set CHROME=/path/to/chrome" >&2
  exit 1
fi

tmp_profile="$(mktemp -d)"
trap 'rm -rf "$tmp_profile"' EXIT

"$chrome" \
  --headless \
  --disable-gpu \
  --no-sandbox \
  --user-data-dir="$tmp_profile" \
  --no-pdf-header-footer \
  --print-to-pdf="$out" \
  "file://$src" >/dev/null 2>&1

echo "wrote $out"
