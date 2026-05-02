#!/bin/bash
cd /home/z/my-project
START_COUNT=0
while true; do
    START_COUNT=$((START_COUNT + 1))
    echo "$(date): Start #$START_COUNT" >> server-manager.log
    NODE_OPTIONS='--max-old-space-size=512' node node_modules/.bin/next start --port 3000 -H 0.0.0.0 >> server-manager.log 2>&1
    EXIT_CODE=$?
    echo "$(date): Exit code $EXIT_CODE, respawning in 2s..." >> server-manager.log
    sleep 2
done
