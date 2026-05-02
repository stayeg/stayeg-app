#!/bin/bash
# StayEg Dev Server Launcher
# Uses double-fork daemon pattern for persistent background process
# This prevents the server from being killed when the parent shell exits

cd /home/z/my-project

# Kill any existing dev server
pkill -f "next dev -p 3000" 2>/dev/null
sleep 2

# Double-fork daemon pattern
(
  (
    exec npx next dev -p 3000 -H 0.0.0.0 >> /home/z/my-project/dev.log 2>&1
  ) &
  echo "Next.js dev server PID: $!"
  exit 0
) &

# Wait for server to be ready
echo "Waiting for server to start..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:3000 2>/dev/null; then
    echo "SUCCESS: Next.js dev server is running on port 3000"
    exit 0
  fi
  sleep 1
done

echo "WARNING: Server may not have started in time, but process is launched"
