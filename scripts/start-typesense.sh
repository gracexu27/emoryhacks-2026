#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f .env ]]; then
  echo "Missing .env. Copy .env.example and set TYPESENSE_ADMIN_KEY." >&2
  exit 1
fi
set -a
source .env
set +a
if [[ -z "${TYPESENSE_ADMIN_KEY:-}" ]]; then
  echo "TYPESENSE_ADMIN_KEY is empty in .env." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Colima first: colima start" >&2
  exit 1
fi
if docker container inspect emoryhacks-typesense >/dev/null 2>&1; then
  docker start emoryhacks-typesense >/dev/null
else
  docker volume create emoryhacks-typesense-merge-data >/dev/null
  docker run -d --name emoryhacks-typesense \
    -p 127.0.0.1:8108:8108 \
    -v emoryhacks-typesense-merge-data:/data \
    typesense/typesense:30.2 \
    --data-dir /data \
    --api-key="${TYPESENSE_ADMIN_KEY}" \
    --enable-cors >/dev/null
fi
echo "Typesense container started at http://127.0.0.1:8108"
