#!/usr/bin/env bash
# Sends a sample Telnyx delivery receipt to the local DLR endpoint.

set -euo pipefail

ENDPOINT=${1:-http://localhost:3000/api/webhooks/dlr}
MSG_ID=${2:-"carrier-123"}

curl -s -X POST "$ENDPOINT" \
  -H "content-type: application/json" \
  -d "{
    \"carrier_msg_id\": \"$MSG_ID\",
    \"status\": \"delivered\"
  }"

echo
