#!/bin/bash
set -e

REPO_NAME=$1

# 1. Google'dan servis URL'ini al
RUN_URL=$(gcloud run services describe $REPO_NAME \
  --region=europe-west1 \
  --format='value(status.url)' \
  | sed 's|https://||')

echo "Cloud Run URL: $RUN_URL"

SUBDOMAIN="$REPO_NAME"
ZONE_ID="$CF_ZONE_ID"
CF_TOKEN="$CF_API_TOKEN"
FULL_DOMAIN="$SUBDOMAIN.letstart.io"

# 2. Mevcut DNS Kaydini Bul
RECORD_ID=$(curl -s -X GET \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=CNAME&name=$FULL_DOMAIN" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  | python3 -c "import sys,json; data=json.load(sys.stdin); print(data['result'][0]['id'] if data['result'] else '')")

# 3. DNS Kaydini Olustur veya Guncelle
if [ -z "$RECORD_ID" ]; then
  echo "Yeni CNAME kaydi olusturuluyor..."
  curl -s -X POST \
    "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
    -H "Authorization: Bearer $CF_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{
      \"type\": \"CNAME\",
      \"name\": \"$SUBDOMAIN\",
      \"content\": \"$RUN_URL\",
      \"ttl\": 1,
      \"proxied\": true
    }"
else
  echo "Mevcut CNAME kaydi guncelleniyor: $RECORD_ID"
  curl -s -X PUT \
    "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
    -H "Authorization: Bearer $CF_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{
      \"type\": \"CNAME\",
      \"name\": \"$SUBDOMAIN\",
      \"content\": \"$RUN_URL\",
      \"ttl\": 1,
      \"proxied\": true
    }"
fi

# 4. Host Header Rewrite (Origin Rule)
echo "Origin Rule (Host Header Override) ayarlaniyor..."
curl -s -X POST \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/phases/http_request_origin_obj/entry" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{
    \"action\": \"route\",
    \"action_parameters\": {
      \"origin\": {
        \"host\": \"$RUN_URL\"
      }
    },
    \"expression\": \"(http.host eq \\\"$FULL_DOMAIN\\\")\",
    \"description\": \"Host override for $REPO_NAME\"
  }"

echo "CloudFlare DNS ve Origin Rule guncellendi! $FULL_DOMAIN hazir."