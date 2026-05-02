#!/bin/bash
cd /home/z/my-project

# Double-fork for persistence
(
  (
    while true; do
      echo "$(date): Starting Next.js dev server..." >> /home/z/my-project/dev.log
      npx next dev -p 3000 -H 0.0.0.0 >> /home/z/my-project/dev.log 2>&1
      EXIT_CODE=$?
      echo "$(date): Next.js exited with code $EXIT_CODE, restarting in 3s..." >> /home/z/my-project/dev.log
      sleep 3
    done
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
