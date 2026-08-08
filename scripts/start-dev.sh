#!/bin/bash
# Start Voltrix backend for local development
# Usage: ./scripts/start-dev.sh

set -a  # auto-export all variables

ENVIRONMENT=development
DEBUG=true
SECRET_KEY="voltrix-dev-secret-key-change-in-production-must-be-64-chars-xx"

DATABASE_URL="postgresql+asyncpg://voltrix_admin:voltrix_dev_password_change_me@localhost:5432/voltrix"
REDIS_URL="redis://localhost:6379/0"

AWS_REGION="eu-west-1"
AWS_ACCOUNT_ID="991514087781"
COGNITO_USER_POOL_ID="eu-west-1_jzoGKR3ov"
COGNITO_CLIENT_ID="45smc3rkjieh8hsmtpi7e0unsh"
COGNITO_REGION="eu-west-1"

S3_RAW_UPLOADS="voltrix-raw-uploads-prod-991514087781"
S3_PROCESSED_VIDEOS="voltrix-processed-videos-prod-991514087781"
S3_THUMBNAILS="voltrix-thumbnails-prod-991514087781"
S3_SOUNDS="voltrix-sounds-prod-991514087781"
S3_CAPTIONS="voltrix-captions-prod-991514087781"
S3_DATA_LAKE="voltrix-data-lake-prod-991514087781"
S3_EXPORTS="voltrix-exports-prod-991514087781"

SQS_PAYMENT_WEBHOOKS="https://sqs.eu-west-1.amazonaws.com/991514087781/voltrix-payment-webhooks-prod.fifo"
SQS_UPLOAD_JOBS="https://sqs.eu-west-1.amazonaws.com/991514087781/voltrix-upload-jobs-prod"
SQS_NOTIFICATIONS="https://sqs.eu-west-1.amazonaws.com/991514087781/voltrix-notifications-prod"
SQS_MISSING_CONTENT="https://sqs.eu-west-1.amazonaws.com/991514087781/voltrix-missing-content-prod"

KINESIS_EVENTS_STREAM="voltrix-events"
CLOUDFRONT_DOMAIN="http://localhost:8090"
MEDIACONVERT_ENDPOINT="https://placeholder.mediaconvert.eu-west-1.amazonaws.com"
MEDIACONVERT_ROLE_ARN="arn:aws:iam::991514087781:role/voltrix-mediaconvert-role"

ALLOWED_ORIGINS='["http://localhost:3000"]'

set +a

# Ensure PostgreSQL is running
sudo service postgresql start > /dev/null 2>&1

cd "$(dirname "$0")/../backend"
source venv/bin/activate

echo "🚀 Starting Voltrix API on http://localhost:8090"
echo "📖 API docs: http://localhost:8090/docs"
echo "🔧 Dev mode: Cognito disabled, any password works"
echo ""

uvicorn app.main:app --port 8090 --reload
