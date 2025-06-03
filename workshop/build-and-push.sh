#!/usr/bin/env bash
set -euo pipefail

# 1. Load workshop variables
if [[ ! -f values.env ]]; then
  echo "❌ values.env not found – copy values.env.example → values.env and edit."
  exit 1
fi
export $(grep -v '^#' values.env | xargs)

# 2. Derive registry and login
REGISTRY="${BACKEND_IMAGE%%/*}"
echo "🔑 Logging in to ECR registry $REGISTRY..."
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"

# 3. Build & push backend (context=backend/)
echo "🐳 Building backend image $BACKEND_IMAGE:$BACKEND_IMAGE_TAG..."
docker build -t "$BACKEND_IMAGE:$BACKEND_IMAGE_TAG" -f ../backend/Dockerfile ../backend
echo "🚀 Pushing backend image..."
docker push "$BACKEND_IMAGE:$BACKEND_IMAGE_TAG"

# 4. Build & push frontend (context=frontend/)
echo "🐳 Building frontend image $FRONTEND_IMAGE:$FRONTEND_IMAGE_TAG..."
docker build -t "$FRONTEND_IMAGE:$FRONTEND_IMAGE_TAG" -f ../frontend/Dockerfile ../frontend
echo "🚀 Pushing frontend image..."
docker push "$FRONTEND_IMAGE:$FRONTEND_IMAGE_TAG"

echo "✅ All images built & pushed!"