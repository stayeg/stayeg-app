#!/bin/bash
# Auto-restart Next.js dev server if it dies
if ! ss -tlnp 2>/dev/null | grep -q ":3000 "; then
  cd /home/z/my-project
  nohup npx next dev -p 3000 > /tmp/nextdev.log 2>&1 &
  echo "$(date): Restarted server PID $!" >> /tmp/server-restarts.log
fi
