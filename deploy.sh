#!/usr/bin/env bash
# One-command deploy: Firestore rules/indexes + Cloud Run.
# Reads config from .env.deploy (copy from .env.deploy.example).
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f .env.deploy ]]; then
  echo "✗ Missing .env.deploy — copy .env.deploy.example and fill it in." >&2
  exit 1
fi

# Load .env.deploy using Python so multi-line values (e.g. service-account JSON)
# are handled correctly. Python compacts any JSON object values to a single line.
eval "$(python3 - << 'PYEOF'
import json, re, sys
with open('.env.deploy') as f:
    text = f.read()
for part in re.split(r'\n(?=[A-Za-z_]+=)', text):
    part = part.strip()
    if not part or part.startswith('#'):
        continue
    k, _, v = part.partition('=')
    k = k.strip()
    v = v.strip()
    if not k or k.startswith('#'):
        continue
    if v.startswith('{'):
        try:
            v = json.dumps(json.loads(v))
        except Exception:
            pass
    print(f'export {k}={repr(v)}')
PYEOF
)"

: "${GCP_PROJECT_ID:?set GCP_PROJECT_ID in .env.deploy}"
: "${GEMINI_API_KEY:?set GEMINI_API_KEY in .env.deploy}"
REGION="${REGION:-asia-south1}"

echo "▶ Project: $GCP_PROJECT_ID   Region: $REGION"
gcloud config set project "$GCP_PROJECT_ID" >/dev/null

echo "▶ Enabling required APIs…"
gcloud services enable \
  run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com firestore.googleapis.com >/dev/null

# Deploy Firestore rules + indexes if the Firebase CLI is available.
if command -v firebase >/dev/null 2>&1; then
  echo "▶ Deploying Firestore rules + indexes…"
  firebase deploy --only firestore:rules,firestore:indexes \
    --project "$GCP_PROJECT_ID" || echo "  (skipped — run 'firebase login' first)"
else
  echo "▶ firebase CLI not found — skipping rules/indexes."
  echo "  Install: npm i -g firebase-tools && firebase login"
fi

echo "▶ Building + deploying to Cloud Run via Cloud Build…"
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_REGION="$REGION",_GEMINI_API_KEY="$GEMINI_API_KEY",_FIREBASE_API_KEY="$NEXT_PUBLIC_FIREBASE_API_KEY",_FIREBASE_AUTH_DOMAIN="$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",_FIREBASE_PROJECT_ID="$NEXT_PUBLIC_FIREBASE_PROJECT_ID",_FIREBASE_STORAGE_BUCKET="$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",_FIREBASE_MESSAGING_SENDER_ID="$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",_FIREBASE_APP_ID="$NEXT_PUBLIC_FIREBASE_APP_ID",_MAPS_API_KEY="$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",_GOOGLE_TRANSLATE_API_KEY="${GOOGLE_TRANSLATE_API_KEY:-}",_APP_URL="${NEXT_PUBLIC_APP_URL:-}",_VAPID_KEY="${NEXT_PUBLIC_FIREBASE_VAPID_KEY:-}"

# Set FIREBASE_SERVICE_ACCOUNT_JSON separately — it contains commas so it can't
# go through Cloud Build substitutions. Update the Cloud Run service directly.
if [[ -n "${FIREBASE_SERVICE_ACCOUNT_JSON:-}" ]]; then
  echo "▶ Setting FIREBASE_SERVICE_ACCOUNT_JSON on Cloud Run service…"
  gcloud run services update urbanpulse \
    --region "$REGION" \
    --update-env-vars "^|^FIREBASE_SERVICE_ACCOUNT_JSON=${FIREBASE_SERVICE_ACCOUNT_JSON}"
fi

URL=$(gcloud run services describe urbanpulse --region "$REGION" --format='value(status.url)')
echo "✓ Deployed: $URL"
echo "  Add this URL to NEXT_PUBLIC_APP_URL in .env.deploy and to your"
echo "  Firebase Auth → Authorized domains + Google Maps key referrer list."
