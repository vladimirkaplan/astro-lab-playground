#!/usr/bin/env bash
# Serve the offline classroom kit over plain-LAN http (BMC-19 / GitHub #16).
#
#   ops/serve-kit.sh              build the kit if it is missing, unzip, serve on :8080
#   PORT=9000 ops/serve-kit.sh    serve on another port
#   ops/serve-kit.sh build        only (re)generate site/offline/kit.zip
#
# Nothing here needs the internet or a service worker: the site is fully static and
# relative, so a plain static server over http serves it completely.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-8080}"
SITE="$ROOT/site"
ZIP="$SITE/offline/kit.zip"

build_kit() {
  node "$ROOT/scripts/offline-kit.js"
}

serve_kit() {
  [ -f "$ZIP" ] || build_kit
  DEST="$(mktemp -d)"
  echo "Unzipping $ZIP -> $DEST"
  unzip -q -o "$ZIP" -d "$DEST"
  echo "Serving at http://0.0.0.0:$PORT/  (Ctrl-C to stop)"
  echo "Students open http://<this-host-ip>:$PORT/  - labs are under /labs/..."
  exec python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$DEST"
}

case "${1:-serve}" in
  build) build_kit ;;
  serve) serve_kit ;;
  *) echo "usage: $0 [build|serve]" >&2; exit 2 ;;
esac
