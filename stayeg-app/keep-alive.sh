#!/bin/bash
while true; do
  cd /home/z/my-project
  echo "[$(date)] Starting dev server..." >> /home/z/my-project/dev.log
  bun run dev >> /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Dev server exited, restarting in 3s..." >> /home/z/my-project/dev.log
  sleep 3
done
