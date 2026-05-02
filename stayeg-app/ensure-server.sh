#!/bin/bash
# Check if next dev is running on port 3000
if ss -tlnp 2>/dev/null | grep -q ":3000 "; then
  # Server is running - verify it responds
  RESPONSE=$(curl -s --max-time 3 -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null)
  if [ "$RESPONSE" = "200" ]; then
    echo "Server healthy on :3000"
    exit 0
  fi
fi

# Server not running or not responding - start it
echo "Starting dev server..."
cd /home/z/my-project
nohup npx next dev -p 3000 > /home/z/my-project/dev.log 2>&1 &
echo "Started dev server with PID $!"
