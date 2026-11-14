#!/usr/bin/env bash
# Re-import content/records.json and content/synonyms.json into the server's Typesense.
# Typesense on the server only listens on 127.0.0.1, so this opens a temporary SSH tunnel
# (local 18108 -> server 8108) and runs the normal import script against it with .env.deploy.
# Usage: npm run deploy:import
set -euo pipefail
cd "$(dirname "$0")/.."

SERVER="${DEPLOY_SERVER:-root@64.177.55.92}"

if [[ ! -f .env.deploy ]]; then
  echo "Missing .env.deploy (server admin key, tunnel host/port)." >&2
  exit 1
fi

ssh -N -o ExitOnForwardFailure=yes -L 18108:127.0.0.1:8108 "$SERVER" &
tunnel=$!
trap 'kill $tunnel 2>/dev/null || true' EXIT
for _ in $(seq 1 20); do
  curl -s localhost:18108/health | grep -q true && break
  sleep 0.5
done

ENV_FILE=.env.deploy npx tsx scripts/import.ts
