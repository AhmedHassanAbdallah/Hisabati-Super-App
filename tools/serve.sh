#!/usr/bin/env bash
# Serve the super app locally: http://127.0.0.1:${1:-8790}/
cd "$(dirname "$0")/.." && exec python3 -m http.server "${1:-8790}" --bind 127.0.0.1
