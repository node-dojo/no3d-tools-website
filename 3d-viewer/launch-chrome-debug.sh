#!/bin/bash
# Launch Chrome with remote debugging enabled

# Close all Chrome instances
killall "Google Chrome" 2>/dev/null
sleep 2

# Launch Chrome with remote debugging on port 9222
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --remote-allow-origins=* \
  --user-data-dir="/tmp/chrome-debug-profile" \
  "http://localhost:8080/no3d-tools-website/3d-viewer/" \
  > /dev/null 2>&1 &

echo "Chrome launched with remote debugging on port 9222"
echo "Opening 3D viewer at: http://localhost:8080/no3d-tools-website/3d-viewer/"
sleep 2

# Verify Chrome is listening on port 9222
if lsof -iTCP:9222 -sTCP:LISTEN -n -P > /dev/null 2>&1; then
  echo "✅ Chrome is listening on port 9222"
  echo "Remote debugging endpoint: http://localhost:9222/json"
else
  echo "❌ Chrome is not listening on port 9222"
  exit 1
fi
