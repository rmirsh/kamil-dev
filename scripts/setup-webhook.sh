#!/bin/bash
# Register Telegram webhook for kamil.dev blog sync
# Usage: ./scripts/setup-webhook.sh

set -e

BOT_TOKEN="${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN not set}"
SECRET="${TELEGRAM_WEBHOOK_SECRET:?TELEGRAM_WEBHOOK_SECRET not set}"
SITE_URL="${SITE_URL:-https://kamil.dev}"

WEBHOOK_URL="${SITE_URL}/api/telegram-webhook"

echo "Registering webhook: $WEBHOOK_URL"

curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL}\",
    \"secret_token\": \"${SECRET}\",
    \"allowed_updates\": [\"channel_post\"]
  }" | jq .

echo ""
echo "Verify:"
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq .
