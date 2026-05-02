#!/bin/bash
# StayEg Dev Server Watchdog
# Monitors and restarts the dev server if it crashes
# Uses double-fork pattern to prevent process from being killed with parent

LOG="/tmp/stayeg-watchdog.log"
PIDFILE="/tmp/nextjs-dev.pid"
cd /home/z/my-project

start_server() {
  echo "$(date): Starting dev server..." >> "$LOG"

  # Double-fork for persistence
  (
    (
      exec npx next dev -p 3000 -H 0.0.0.0 >> /home/z/my-project/dev.log 2>&1
    ) &
    # Record PID of the grandchild
    echo $! > "$PIDFILE"
    exit 0
  ) &

  # Wait for server to be ready
  for i in $(seq 1 30); do
    if curl -s -o /dev/null http://localhost:3000 2>/dev/null; then
      echo "$(date): Dev server is ready" >> "$LOG"
      return 0
    fi
    sleep 1
  done
  echo "$(date): WARNING: Server may not be ready yet" >> "$LOG"
  return 1
}

check_server() {
  curl -s -o /dev/null --connect-timeout 5 --max-time 10 http://localhost:3000 2>/dev/null
}

# Start initially
start_server

# Watchdog loop
while true; do
  sleep 10
  if ! check_server; then
    echo "$(date): Server not responding, restarting..." >> "$LOG"
    # Kill any leftover processes
    pkill -f "next dev -p 3000" 2>/dev/null
    sleep 2
    start_server
  fi
done
