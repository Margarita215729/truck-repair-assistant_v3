#!/bin/bash

# Auto-sync script: Fetches and pulls changes from remote every 30 seconds
# Useful when working in GitHub VFS and want to sync changes to local clone

set -e

REPO_PATH="${1:-.}"

cd "$REPO_PATH"

echo "🔄 Auto-sync started for: $(pwd)"
echo "📡 Checking for changes every 30 seconds..."
echo "Press Ctrl+C to stop"
echo ""

while true; do
  # Fetch from remote
  git fetch origin main --quiet 2>/dev/null || {
    echo "❌ Failed to fetch from remote"
    sleep 30
    continue
  }
  
  # Check if there are changes
  LOCAL=$(git rev-parse @)
  REMOTE=$(git rev-parse @{u})
  
  if [ "$LOCAL" != "$REMOTE" ]; then
    echo "🔽 [$(date '+%H:%M:%S')] Changes detected, pulling..."
    
    # Check for uncommitted changes
    if [[ -n $(git status -s) ]]; then
      echo "⚠️  Uncommitted changes detected, skipping pull"
    else
      git pull origin main --quiet && echo "✅ Synced successfully"
    fi
  fi
  
  sleep 30
done
