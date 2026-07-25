#!/bin/bash
set -e

REGION="eu-west-1"
ENV="prod"
ACCOUNT_ID="991514087781"

echo "🚀 Deploying Voltrix Platform Infrastructure"
echo "Region: $REGION | Environment: $ENV | Account: $ACCOUNT_ID"

# ── Step 1: VPC ──────────────────────────────────────────────────────────────
echo ""
echo "📡 [1/4] Deploying VPC & Networking..."
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/01-vpc.yaml \
  --stack-name voltrix-vpc-$ENV \
  --parameter-overrides Environment=$ENV \
  --region $REGION \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset

echo "✅ VPC deployed"

# ── Step 2: S3 Buckets ────────────────────────────────────────────────────────
echo ""
echo "🪣 [2/4] Deploying S3 Buckets..."
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/02-s3.yaml \
  --stack-name voltrix-s3-$ENV \
  --parameter-overrides Environment=$ENV \
  --region $REGION \
  --no-fail-on-empty-changeset

echo "✅ S3 buckets deployed"

# ── Step 3: Cognito ───────────────────────────────────────────────────────────
echo ""
echo "🔐 [3/4] Deploying Cognito User Pool..."
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/04-cognito.yaml \
  --stack-name voltrix-cognito-$ENV \
  --parameter-overrides Environment=$ENV \
  --region $REGION \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset

echo "✅ Cognito deployed"

# ── Step 4: SQS Queues ────────────────────────────────────────────────────────
echo ""
echo "📬 [4/4] Deploying SQS Queues..."
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/05-sqs.yaml \
  --stack-name voltrix-sqs-$ENV \
  --parameter-overrides Environment=$ENV \
  --region $REGION \
  --no-fail-on-empty-changeset

echo "✅ SQS queues deployed"

echo ""
echo "🎉 Phase 1 infrastructure deployed successfully!"
echo ""
echo "Next steps:"
echo "  1. Get Cognito Pool ID:  aws cognito-idp list-user-pools --max-results 10 --region $REGION"
echo "  2. Update backend/.env with the Cognito and S3 values"
echo "  3. Run: docker-compose up --build"
