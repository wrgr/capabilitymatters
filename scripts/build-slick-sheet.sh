#!/usr/bin/env bash
# Render the LENS print sheets under slick-sheet/ to the PDFs the site links:
#   lens-slick-sheet.html     -> public/LENS_Overview_Aug2026.pdf        (1 page)
#   lens-what-you-will-do.html -> public/LENS_What_You_Will_Do_Aug2026.pdf (2 pages)
#
# Uses headless Chromium, which is the only HTML-to-PDF engine that honours the
# sheets' @page/flex layout faithfully. Set CHROME to point at a binary if it is
# not on PATH under one of the names probed below. Pass a source basename to
# render just that one, e.g. ./scripts/build-slick-sheet.sh lens-slick-sheet.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# source basename -> output PDF name, one pair per line.
sheets=(
  "lens-slick-sheet:LENS_Overview_Aug2026.pdf"
  "lens-what-you-will-do:LENS_What_You_Will_Do_Aug2026.pdf"
)

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

only="${1:-}"
rendered=0
for pair in "${sheets[@]}"; do
  name="${pair%%:*}"
  [ -n "$only" ] && [ "$only" != "$name" ] && continue
  src="$repo_root/slick-sheet/$name.html"
  out="$repo_root/public/${pair#*:}"
  "$chrome" \
    --headless \
    --disable-gpu \
    --no-sandbox \
    --user-data-dir="$tmp_profile" \
    --no-pdf-header-footer \
    --print-to-pdf="$out" \
    "file://$src" >/dev/null 2>&1
  echo "wrote $out"
  rendered=$((rendered + 1))
done

if [ "$rendered" -eq 0 ]; then
  echo "error: no sheet named '$only'; known sheets: ${sheets[*]%%:*}" >&2
  exit 1
fi
