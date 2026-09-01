#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=5173
URL="http://localhost:${PORT}"

echo "=================================================="
echo "🚀 Khởi động Salaria — 100% Cloudflare Serverless Dashboard..."
echo "=================================================="

# Function to poll until frontend is ready before opening browser
open_browser_when_ready() {
  for i in {1..30}; do
    if curl -s --connect-timeout 1 "${URL}" > /dev/null 2>&1; then
      sleep 0.5
      if command -v xdg-open > /dev/null 2>&1; then
        xdg-open "${URL}" > /dev/null 2>&1 &
      elif command -v open > /dev/null 2>&1; then
        open "${URL}" > /dev/null 2>&1 &
      fi
      return 0
    fi
    sleep 0.5
  done
}

open_browser_when_ready &

cd "$DIR/frontend"
exec npm run dev -- --port 5173
