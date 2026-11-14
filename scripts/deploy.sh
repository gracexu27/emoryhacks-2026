#!/usr/bin/env bash
# Build the game with .env.production.local and upload it to the Vultr server.
# Usage: npm run deploy
set -euo pipefail
cd "$(dirname "$0")/.."

SERVER="${DEPLOY_SERVER:-root@64.177.55.92}"

if [[ ! -f .env.production.local ]]; then
  echo "Missing .env.production.local (production Typesense host, path and search-only key)." >&2
  exit 1
fi

npm run build

# Refuse to ship if any admin key ended up in the bundle.
for envfile in .env .env.deploy; do
  key=$(grep '^TYPESENSE_ADMIN_KEY=' "$envfile" 2>/dev/null | cut -d= -f2 || true)
  if [[ -n "$key" ]] && grep -rqF "$key" dist; then
    echo "An admin key from $envfile is in dist/. Aborting deploy." >&2
    exit 1
  fi
done

rsync -az --delete dist/ "$SERVER:/var/www/lantern-bay/"
# nginx must be able to read the files regardless of local umask.
ssh "$SERVER" 'find /var/www/lantern-bay -type d -exec chmod 755 {} + && find /var/www/lantern-bay -type f -exec chmod 644 {} +'
echo "Deployed to $SERVER"
