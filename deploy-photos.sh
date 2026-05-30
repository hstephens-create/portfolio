#!/bin/bash
set -e
cd "$(dirname "$0")"
git add photos/
git commit -m "Add photos $(date '+%Y-%m-%d %H:%M')" || echo "Nothing new to commit."
git push origin main
echo "Done — Railway is redeploying now."
