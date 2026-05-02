#!/bin/bash
# StayEg Dev Server Launcher
# Uses double-fork to fully detach from parent process
# This prevents the server from being killed when the parent shell exits

cd /home/z/my-project

# Double-fork daemon pattern for persistent background process
(
  (
    exec npx next dev -p 3000 -H 0.0.0.0 >> /home/z/my-project/dev.log 2>&1
  ) &
  exit 0
) &

# Wait for server to be ready
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:3000 2>/dev/null; then
    echo "Next.js dev server is running on port 3000"
    exit 0
  fi
  sleep 1
done

echo "WARNING: Server may not have started in time, but process is launched"
