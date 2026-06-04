#!/bin/bash
# Tsjaad Olifant Launcher
# Double-click this file to start the app

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_PATH="$SCRIPT_DIR/TsjaadOlifant.app"

if [ -d "$APP_PATH" ]; then
    open "$APP_PATH"
else
    echo "ERROR: TsjaadOlifant.app not found in $SCRIPT_DIR"
    read -n 1
fi
