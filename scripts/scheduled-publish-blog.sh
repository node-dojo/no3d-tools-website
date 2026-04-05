#!/bin/bash
# Scheduled blog publisher — runs daily via launchd.
# Sleeps a random 0-225 minutes (targeting 8:00–11:45 AM) then publishes.

LOG="/Users/joebowers/.blog-publish/publish.log"
mkdir -p "$(dirname "$LOG")"

DELAY=$((RANDOM % 226))
FIRE_TIME=$(date -v+"${DELAY}M" "+%H:%M")
echo "[$(date '+%Y-%m-%d %H:%M')] Sleeping ${DELAY}m — will publish at ~${FIRE_TIME}" >> "$LOG"
sleep "${DELAY}m"

cd "/Users/joebowers/Library/CloudStorage/Dropbox/Caveman Creative/THE WELL_Digital Assets/The Well Code/solvet-global/no3d-tools-website" || exit 1

echo "[$(date '+%Y-%m-%d %H:%M')] Running publish-blog..." >> "$LOG"
/opt/homebrew/bin/doppler run -- /opt/homebrew/bin/node scripts/publish-blog.mjs >> "$LOG" 2>&1
echo "[$(date '+%Y-%m-%d %H:%M')] Done (exit $?)" >> "$LOG"
echo "---" >> "$LOG"
