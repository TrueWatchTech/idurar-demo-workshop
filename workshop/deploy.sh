#!/usr/bin/env bash
set -euo pipefail

# 1. Load variables
if [[ ! -f values.env ]]; then
  echo "❌ values.env not found – copy values.env.example → values.env and edit."
  exit 1
fi
export $(grep -v '^#' values.env | xargs)

# 2. Ensure envsubst is available
if ! command -v envsubst &>/dev/null; then
  echo "⚙️ Installing envsubst..."
  sudo yum install -y gettext
fi

# 3. Render the full manifest
echo "🔄 Rendering manifests.yaml with your environment variables..."
RENDERED=$(mktemp)
envsubst < manifests.yaml > "$RENDERED"

# 4. Split at the Frontend marker into two chunks
csplit -sz "$RENDERED" '/^# Frontend Deployment/' '{*}' >/dev/null

# 5. Apply the first chunk: Namespace, Mongo, Backend
echo "⏳ Deploying Namespace, MongoDB, and Backend..."
kubectl apply -f xx00

# 6. Wait for Backend LoadBalancer’s hostname
echo -n "⏳ Waiting for Backend LoadBalancer ingress"
until LB_HOST=$(kubectl get svc idurar-backend -n "$NAMESPACE" \
    -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null) \
      && [[ -n "$LB_HOST" ]]; do
  echo -n "."
  sleep 5
done
echo -e "\n✅ Backend LB hostname: $LB_HOST"

# 7. Apply the second chunk: Frontend Service & Deployment
echo "🚀 Deploying Frontend Service and Deployment..."
kubectl apply -f xx01

# 8. Dynamically patch Frontend Deployment’s API_URL
API_URL="http://$LB_HOST:8888/"
echo "🔧 Patching Frontend Deployment env REACT_APP_API_URL=$API_URL..."
kubectl set env deployment/idurar-frontend \
  -n idurar-demo \
  VITE_DEV_REMOTE=remote \
  VITE_BACKEND_SERVER="http://$LB_HOST:8888/"

# Roll out a restart so the Vite dev server picks up the new env var
kubectl rollout restart deployment/idurar-frontend -n "$NAMESPACE"

# 9. Clean up temp files
rm xx00 xx01 "$RENDERED"

echo "✅ All resources deployed. Verify with:"
echo "   kubectl get all -n $NAMESPACE"