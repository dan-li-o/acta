#!/usr/bin/env bash

set -euo pipefail

ENDPOINT=${1:-http://localhost:3000/api/webhooks/sms}
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
MSG_ID="msg-$(date +%s)"

curl -s -X POST "$ENDPOINT" \
  -H "content-type: application/json" \
  -H "telnyx-signature-sha256: v1=dummysignature" \
  -H "telnyx-timestamp: $(date +%s)" \
  -d "{
    \"data\": {
      \"event_type\": \"message.received\",
      \"payload\": {
        \"id\": \"$MSG_ID\",
        \"from\": {\"phone_number\": \"+18123498526\"},
        \"to\": [{\"phone_number\": \"+16465550999\"}],
        \"text\": \"I am wondering why induction is reliable.\",
        \"received_at\": \"$NOW\"
      }
    }
  }"

echo
