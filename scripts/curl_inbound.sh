#!/usr/bin/env bash
# Local harness that replays a Telnyx inbound webhook with a real HMAC.

set -euo pipefail

ENDPOINT=${1:-http://localhost:3000/api/webhooks/sms}
SECRET=${TELNYX_WEBHOOK_SECRET:-}

if [[ -z "$SECRET" ]]; then
  echo "Set TELNYX_WEBHOOK_SECRET before calling this script." >&2
  exit 1
fi

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
MSG_ID="msg-$(date +%s)"
TIMESTAMP=$(date +%s)

read -r -d '' BODY <<'JSON' || true
{
  "data": {
    "event_type": "message.received",
    "payload": {
      "id": "__MSG_ID__",
      "from": {"phone_number": "+18123498526"},
      "to": [{"phone_number": "+16465550999"}],
      "text": "I am wondering why induction is reliable.",
      "received_at": "__NOW__"
    }
  }
}
JSON

BODY=${BODY/__MSG_ID__/$MSG_ID}
BODY=${BODY/__NOW__/$NOW}

SIGNATURE=$(printf '%s' "$TIMESTAMP|$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | xxd -p -c 256)

curl -s -X POST "$ENDPOINT" \
  -H "content-type: application/json" \
  -H "telnyx-signature-sha256: v1=$SIGNATURE" \
  -H "telnyx-timestamp: $TIMESTAMP" \
  --data "$BODY"

echo
