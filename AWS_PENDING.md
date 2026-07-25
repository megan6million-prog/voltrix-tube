# Voltrix — AWS Pending Features
## Blocked until AWS Support verifies the account
## Contact: https://support.console.aws.amazon.com/support/home#/case/create
## Issue type: Account and Billing → Account Verification

---

## 1. ECS Fargate (Backend in the Cloud)
- **Stack:** `voltrix-ecs-prod`
- **Template:** `infrastructure/cloudformation/06-ecs.yaml`
- **What it does:** Runs the FastAPI backend on AWS with auto-scaling (2-20 tasks)
- **Deploy command:**
  ```bash
  cd ~/voltrix-platform && aws cloudformation deploy \
    --template-file infrastructure/cloudformation/06-ecs.yaml \
    --stack-name voltrix-ecs-prod \
    --region eu-west-1 \
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
  ```
- **Status:** Template ready, Docker image pushed to ECR ✅, blocked by account restriction

---

## 2. CloudFront CDN
- **Stack:** `voltrix-cloudfront-prod`
- **Template:** `infrastructure/cloudformation/07-cloudfront.yaml`
- **What it does:**
  - Serves videos, thumbnails, sounds globally via CDN
  - Routes /v1/* API calls to the ALB
  - Serves the Next.js frontend from S3
  - Low-latency delivery from Nairobi, Johannesburg, Lagos edge nodes
- **Deploy command:**
  ```bash
  cd ~/voltrix-platform && aws cloudformation deploy \
    --template-file infrastructure/cloudformation/07-cloudfront.yaml \
    --stack-name voltrix-cloudfront-prod \
    --region eu-west-1
  ```
- **Status:** Template ready, blocked by account restriction

---

## 3. EC2 / Compute (All Instance Types)
- **What it does:** t2.micro for dev testing, used as fallback while ECS was blocked
- **Status:** Blocked by same account restriction as ECS

---

## 4. Cognito OTP (Phone Verification)
- **What it does:** Real SMS OTP sent to +256 numbers on signup
- **Current state:** Dev mode bypasses OTP (any signup works instantly)
- **To enable in production:**
  - Change `ENVIRONMENT=production` in ECS task env vars
  - Cognito User Pool `eu-west-1_jzoGKR3ov` is already deployed and ready
  - Africa's Talking SMS (cheaper than SNS for Uganda) — swap in Phase 2
- **Files:** `backend/app/services/auth_service.py`

---

## 5. Frontend S3 + CloudFront Deployment
- **What it does:** Hosts the Next.js frontend publicly
- **Depends on:** CloudFront (#2 above)
- **Deploy command (once CloudFront is ready):**
  ```bash
  cd ~/voltrix-platform/frontend
  npm run build
  aws s3 sync .next/static s3://voltrix-frontend-prod-991514087781/_next/static --delete
  aws s3 sync public s3://voltrix-frontend-prod-991514087781 --delete
  CF_ID=$(aws cloudformation describe-stacks --stack-name voltrix-cloudfront-prod \
    --region eu-west-1 --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' --output text)
  aws cloudfront create-invalidation --distribution-id $CF_ID --paths "/*"
  ```

---

## 6. RDS Migrations (Production DB)
- **What it does:** Run alembic migrations against the live RDS instance
- **RDS endpoint:** `voltrix-db-prod.cvm4c2q8sgho.eu-west-1.rds.amazonaws.com`
- **To do:** Connect a bastion or run via ECS task after ECS is unblocked
- **Command (from bastion or ECS):**
  ```bash
  DATABASE_URL="postgresql://voltrix_admin:voltrix_prod_password_32chars_ok@voltrix-db-prod.cvm4c2q8sgho.eu-west-1.rds.amazonaws.com:5432/voltrix" \
  alembic upgrade head
  ```

---

## 7. Seed Platform Settings (Admin Payment Keys UI)
- **What it does:** Populates `platform_settings` table with defaults so the admin UI works
- **Depends on:** RDS migrations (#6)
- **Command (after migrations):**
  ```bash
  curl -X POST https://your-api/v1/admin/settings/seed \
    -H "Authorization: Bearer <admin_token>"
  ```

---

## 8. MediaConvert Video Transcoding (Auto-pipeline)
- **What it does:** When a video is uploaded to S3, auto-transcodes to HLS 360p/720p/1080p
- **Current state:** Service is written, not wired to SQS worker yet
- **Files:** `backend/app/services/mediaconvert_service.py`, `backend/app/services/media_pipeline.py`
- **To complete:** Deploy Lambda worker that listens to SQS upload-jobs queue and calls `process_upload()`
- **Needs:** MediaConvert IAM role ARN (add to ECS env vars)

---

## 9. AWS Personalize (ML Recommendations)
- **What it does:** Replaces basic trending-based feed with personalised recommendations per user
- **Current state:** Feed uses `order by view_count` — works fine for launch
- **Phase 2:** Set up Personalize dataset, feed Kinesis events, swap in campaign ARN
- **Files:** Backend `content_service.py` — `get_personalized_feed()` method has a comment to swap

---

## 10. Rekognition Content Moderation (Production)
- **What it does:** Scans every uploaded video thumbnail and ad creative for sexual content
- **Current state:** Service is written, not called in upload flow yet (blocked by no ECS)
- **Files:** `backend/app/services/media_pipeline.py` — `ModerationService`

---

## 11. AWS IVS Livestreaming (Creator Go Live)
- **What it does:** Creates IVS channels for creators to stream via OBS
- **Current state:** Endpoint written, IVS API call will work once EC2/ECS unblocked
- **Files:** `backend/app/api/v1/endpoints/streams.py`

---

## 12. Real-time WebSocket (Production)
- **What it does:** Live chat, wallet notifications, tip alerts, earnings credits
- **Current state:** WebSocket endpoint written and wired in frontend
- **To complete after ECS:** Add Redis pub/sub so multiple ECS tasks share WebSocket state
- **Files:** `backend/app/core/websocket.py`

---

## ALREADY LIVE (No compute needed) ✅
- RDS PostgreSQL 15.18 — `voltrix-db-prod.cvm4c2q8sgho.eu-west-1.rds.amazonaws.com`
- ElastiCache Redis — `voltrix-redis-prod.6nhiid.0001.euw1.cache.amazonaws.com`
- Cognito User Pool — `eu-west-1_jzoGKR3ov`
- S3 Buckets (8) — videos, thumbnails, sounds, frontend, data-lake, etc.
- SQS Queues — payments, uploads, notifications, missing-content
- ECR — Docker image pushed and ready
- Secrets Manager — all secrets stored
- ALB — created but ECS service behind it failed to start

---

## WHAT TO SAY TO AWS SUPPORT

Subject: Account Verification — Cannot launch EC2, ECS, or CloudFront

> My account (ID: 991514087781) is receiving "account is currently blocked" errors when trying 
> to launch EC2 instances, ECS Fargate tasks, and CloudFront distributions. I am building a 
> video streaming platform (Voltrix) for Uganda. All other AWS services work correctly. 
> Please verify my account to allow compute and CDN resource creation.
