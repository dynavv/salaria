#!/usr/bin/env bash
set -e

DIR="/home/dynav/.gemini/antigravity/scratch/personal-finance-app"
PORT=3001
URL="http://localhost:${PORT}"

echo "=================================================="
echo "🚀 Khởi động Ứng dụng Quản Lý Tài Chính Cá Nhân..."
echo "=================================================="

# Check if server is already running on port 3001
if curl -s --connect-timeout 1 "${URL}/api/health" > /dev/null 2>&1; then
  echo "🌐 Ứng dụng đã đang chạy trên ${URL}, đang mở trình duyệt..."
  if command -v xdg-open > /dev/null 2>&1; then
    xdg-open "${URL}" > /dev/null 2>&1 &
  elif command -v open > /dev/null 2>&1; then
    open "${URL}" > /dev/null 2>&1 &
  fi
  exit 0
fi

# Function to poll until server is fully up & ready before opening browser
open_browser_when_ready() {
  for i in {1..30}; do
    if curl -s --connect-timeout 1 "${URL}/api/health" > /dev/null 2>&1; then
      sleep 1.5
      if command -v xdg-open > /dev/null 2>&1; then
        xdg-open "${URL}" > /dev/null 2>&1 &
      elif command -v open > /dev/null 2>&1; then
        open "${URL}" > /dev/null 2>&1 &
      elif command -v sensible-browser > /dev/null 2>&1; then
        sensible-browser "${URL}" > /dev/null 2>&1 &
      fi
      return 0
    fi
    sleep 0.5
  done
  xdg-open "${URL}" > /dev/null 2>&1 &
}

# Run open_browser in background
open_browser_when_ready &

# Change to project root directory
cd "$DIR"

# Execute local tsx with project backend
if [ -f "$DIR/node_modules/.bin/tsx" ]; then
  exec "$DIR/node_modules/.bin/tsx" "$DIR/backend/src/index.ts"
else
  exec npx --yes tsx "$DIR/backend/src/index.ts"
fi
