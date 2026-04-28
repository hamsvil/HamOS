#!/bin/bash
# ==============================================================================
# THE OUROBOROS PROTOCOL: EXTERNAL DEFIBRILLATOR (BASH VERSION)
# ==============================================================================
# Run this script on any computer (Linux/Mac/WSL) that is connected to the internet.
# It will ping your AI Studio server every 4 minutes to keep SAERE alive 24/7.

TARGET_URL="https://ais-dev-5xogkxtdovdaqskfdjmhqf-41062462252.asia-east1.run.app/api/system/heartbeat"
INTERVAL=240 # 4 minutes in seconds

echo "[Ouroboros] Starting External Defibrillator..."
echo "[Ouroboros] Target: $TARGET_URL"
echo "[Ouroboros] Interval: Every 4 minutes"
echo "--------------------------------------------------"

while true; do
    TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
    echo "[$TIMESTAMP] Pinging SAERE..."
    
    # Use curl to ping the endpoint silently, only outputting the HTTP status code
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL")
    
    if [ "$HTTP_STATUS" -eq 200 ]; then
        echo "[$TIMESTAMP] SUCCESS: SAERE is Alive and Thinking."
    else
        echo "[$TIMESTAMP] WARNING: Server returned status $HTTP_STATUS. SAERE might be sleeping."
    fi
    
    sleep $INTERVAL
done
