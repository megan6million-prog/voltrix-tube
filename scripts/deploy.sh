#!/bin/bash
set -e

REGION="eu-west-1"
ENV="prod"
ACCOUNT_ID="991514087781"
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/voltrix-api"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     Voltrix Platform — Full Deploy       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Step 1: Store secrets ───────────────────────────────────────────────────
echo "🔐 [1/7] Storing secrets in AWS Secrets Manager..."

store_secret() {
  local key=$1
  local value=$2
  aws secretsmanager describe-secret --secret-id "voltrix/$key" --region $REGION > /dev/null 2>&1 \
    && aws secretsmanager put-secret-value --secret-id "voltrix/$key" --secret-string "$value" --region $REGION > /dev/null \
    || aws secretsmanager create-secret --name "voltrix/$key" --secret-string "$value" --region $REGION > /dev/null
  echo "  ✅ voltrix/$key stored"
}

# Generate a strong secret key
SECRET_KEY=$(openssl rand -hex 32)
store_secret "secret_key" "$SECRET_KEY"

# These will be updated via admin UI later — store placeholders
store_secret "database_url" "postgresql+asyncpg://voltrix_admin:CHANGE_ME@localhost:5432/voltrix"
store_secret "redis_url" "redis://localhost:6379/0"
store_secret "cloudfront_domain" "https://placeholder.cloudfront.net"

echo "✅ Secrets stored"

# ── Step 2: Build & push Docker image ──────────────────────────────────────
echo ""
echo "🐳 [2/7] Building and pushing Docker image..."

cd "$(dirname "$0")/../backend"

# Login to ECR
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Create ECR repo if not exists
aws ecr describe-repositories --repository-names voltrix-api --region $REGION > /dev/null 2>&1 || \
  aws ecr create-repository --repository-name voltrix-api --region $REGION > /dev/null

# Build and push
docker build -t voltrix-api:latest .
docker tag voltrix-api:latest "${ECR_URI}:latest"
docker push "${ECR_URI}:latest"

echo "✅ Docker image pushed: ${ECR_URI}:latest"
cd "$(dirname "$0")/.."

# ── Step 3: Deploy ECS ─────────────────────────────────────────────────────
echo ""
echo "🚀 [3/7] Deploying ECS Fargate + ALB..."
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/06-ecs.yaml \
  --stack-name voltrix-ecs-${ENV} \
  --parameter-overrides Environment=${ENV} \
  --region $REGION \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset

ALB_DNS=$(aws cloudformation describe-stacks --stack-name voltrix-ecs-${ENV} \
  --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`ALBDNSName`].OutputValue' --output text)
echo "✅ ECS deployed — ALB: http://${ALB_DNS}"

# ── Step 4: Deploy CloudFront ──────────────────────────────────────────────
echo ""
echo "🌐 [4/7] Deploying CloudFront CDN..."
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/07-cloudfront.yaml \
  --stack-name voltrix-cloudfront-${ENV} \
  --parameter-overrides Environment=${ENV} \
  --region $REGION \
  --no-fail-on-empty-changeset

CF_DOMAIN=$(aws cloudformation describe-stacks --stack-name voltrix-cloudfront-${ENV} \
  --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' --output text)
echo "✅ CloudFront: https://${CF_DOMAIN}"

# Update CloudFront domain secret
store_secret "cloudfront_domain" "https://${CF_DOMAIN}"

# ── Step 5: Build and deploy frontend ──────────────────────────────────────
echo ""
echo "⚛️  [5/7] Building and deploying Next.js frontend..."

cd frontend

# Update env with real CloudFront domain
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=https://${CF_DOMAIN}/v1
NEXT_PUBLIC_COGNITO_REGION=eu-west-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name voltrix-cognito-prod --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text)
NEXT_PUBLIC_COGNITO_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name voltrix-cognito-prod --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`WebClientId`].OutputValue' --output text)
NEXT_PUBLIC_CLOUDFRONT_URL=https://${CF_DOMAIN}
NEXT_PUBLIC_APP_NAME=Voltrix
NEXT_PUBLIC_CURRENCY=UGX
NEXT_PUBLIC_COUNTRY=UG
EOF

npm run build
aws s3 sync .next/static s3://voltrix-frontend-${ENV}-${ACCOUNT_ID}/_next/static --delete
aws s3 sync public s3://voltrix-frontend-${ENV}-${ACCOUNT_ID} --delete
echo "✅ Frontend deployed to S3"
cd ..

# ── Step 6: Invalidate CloudFront ──────────────────────────────────────────
echo ""
echo "🔄 [6/7] Invalidating CloudFront cache..."
CF_ID=$(aws cloudformation describe-stacks --stack-name voltrix-cloudfront-${ENV} \
  --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' --output text)
aws cloudfront create-invalidation --distribution-id $CF_ID --paths "/*" --region $REGION > /dev/null
echo "✅ Cache invalidated"

# ── Step 7: Done ───────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║           🎉 Voltrix Platform Deployed!                  ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Frontend:  https://${CF_DOMAIN}"
echo "║  API:       http://${ALB_DNS}"
echo "║  Admin:     https://${CF_DOMAIN}/admin"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Next steps:                                             ║"
echo "║  1. Open /admin/settings to add MTN/Airtel API keys      ║"
echo "║  2. Add RDS endpoint to Secrets Manager                  ║"
echo "║  3. Run: ./scripts/run-migrations.sh                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
