#!/usr/bin/env bash
set -euo pipefail

# 1. Load your values
if [[ ! -f values.env ]]; then
  echo "❌ values.env not found. Copy values.env.example → values.env and fill it out."
  exit 1
fi
export $(grep -v '^\s*#' values.env | sed 's/[[:space:]]*=[[:space:]]*/=/g')

# 2. Install git if missing
if ! command -v git &>/dev/null; then
  echo "🛠 Installing git..."
  sudo yum install -y git
else
  echo "✔ git already installed"
fi

# 3. Install Docker if missing & start it
if ! command -v docker &>/dev/null; then
  echo "🐳 Installing Docker..."
  sudo yum install -y docker
  echo "🚀 Starting Docker daemon..."
  sudo systemctl enable docker
  sudo systemctl start docker
  echo "➕ Adding $USER to docker group"
  sudo usermod -aG docker $USER
  echo "⚠️  You may need to restart your CloudShell session for group changes."
else
  echo "✔ Docker already installed"
fi

# 4. Verify AWS CLI
if ! command -v aws &>/dev/null; then
  echo "❌ aws CLI not found. CloudShell should have it preinstalled."
  exit 1
fi

AWS_REGION="${AWS_REGION:-ap-southeast-1}"
echo "🌍 Using AWS region: $AWS_REGION"

# 5. Create ECR repos (backend & frontend), robustly
backend_repo="${BACKEND_IMAGE##*/}"
frontend_repo="${FRONTEND_IMAGE##*/}"

echo "🔑 Ensuring ECR repos exist in region $AWS_REGION..."
for repo in "$backend_repo" "$frontend_repo"; do
  echo "👉 Processing repo: $repo"
  if aws ecr describe-repositories \
       --region "$AWS_REGION" \
       --repository-names "$repo" &>/dev/null; then
    echo "   📦 ECR repo '$repo' already exists"
  else
    echo "   📦 Creating ECR repo '$repo'..."
    if aws ecr create-repository \
         --region "$AWS_REGION" \
         --repository-name "$repo"; then
      echo "   ✅ Created '$repo'"
    else
      echo "   ⚠️ Failed to create '$repo'. Check your AWS credentials, region, or service quotas."
      # don’t exit — continue to next repo
    fi
  fi
done

# 6. Retrieve and inject ECR repository URIs into values.env
echo "🔧 Fetching ECR repository URIs and updating values.env..."

# Get full repository URIs
backend_uri=$(aws ecr describe-repositories \
  --region "$AWS_REGION" \
  --repository-names "$backend_repo" \
  --query "repositories[0].repositoryUri" \
  --output text)

frontend_uri=$(aws ecr describe-repositories \
  --region "$AWS_REGION" \
  --repository-names "$frontend_repo" \
  --query "repositories[0].repositoryUri" \
  --output text)

# Replace BACKEND_IMAGE and FRONTEND_IMAGE lines in values.env
sed -i "s|^BACKEND_IMAGE=.*|BACKEND_IMAGE=$backend_uri|" values.env
sed -i "s|^FRONTEND_IMAGE=.*|FRONTEND_IMAGE=$frontend_uri|" values.env

echo "✅ values.env updated with:"
echo "   BACKEND_IMAGE=$backend_uri"
echo "   FRONTEND_IMAGE=$frontend_uri"

echo "✅ Bootstrap complete! Now run:"
echo "   ./build-and-push.sh"
echo "   ./deploy.sh"