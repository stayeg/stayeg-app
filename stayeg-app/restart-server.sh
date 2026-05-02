#!/bin/bash
# Kill any existing server
fuser -k 3000/tcp 2>/dev/null
sleep 1
# Start fresh
cd /home/z/my-project
NODE_OPTIONS='--max-old-space-size=512' nohup node node_modules/.bin/next start --port 3000 -H 0.0.0.0 > /home/z/my-project/prod.log 2>&1 &
echo "Server started PID: $!"
