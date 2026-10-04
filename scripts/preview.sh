#!/usr/bin/env bash
# Deploy the working tree to a Firebase Hosting preview channel and print its URL.
# The live site is untouched. Channels expire after 7 days.
# Usage: scripts/preview.sh [channel-name]   (default: preview)
# Needs FIREBASE_SERVICE_ACCOUNT (service-account JSON) in the environment.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${FIREBASE_SERVICE_ACCOUNT:?FIREBASE_SERVICE_ACCOUNT is not set}"

key=$(mktemp)
trap 'rm -f "$key"' EXIT
printf '%s' "$FIREBASE_SERVICE_ACCOUNT" > "$key"
export GOOGLE_APPLICATION_CREDENTIALS="$key"
[ -f /root/.ccr/ca-bundle.crt ] && export NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt

npx -y firebase-tools@latest hosting:channel:deploy "${1:-preview}" \
  --expires 7d --project familygames-da3e5 --non-interactive 2>&1 \
  | grep -vi "npm warn\|npm notice"
