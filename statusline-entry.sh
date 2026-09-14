#!/bin/sh
# Claude Code Statusline Shell Entry (Optional / Backward-compatible)
DIR="$(cd "$(dirname "$0")" && pwd)"
NODE="$(command -v node 2>/dev/null)"
if [ -z "$NODE" ]; then
  NODE="/c/Program Files/nodejs/node"
fi
exec "$NODE" "$DIR/bin/statusline.js"
