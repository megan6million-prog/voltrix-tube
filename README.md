# Voltrix Platform

Uganda's video platform — movies, sports, gaming, creator economy.

## Project Structure

```
voltrix-platform/
├── infrastructure/     # AWS CloudFormation templates
├── backend/            # Python FastAPI backend
├── frontend/           # Next.js 14 web app
├── mobile/             # React Native (Expo) mobile app
└── scripts/            # Deployment and utility scripts
```

## Phase 1 — MVP

- User auth (Cognito — phone + password + social login)
- Video upload, transcode, playback
- Creator channels
- Basic feed (trending + subscriptions)
- Platform wallet (MTN + Airtel top-up)
- Premium subscription
- Pre-roll ads (Google Ad Manager)
- Gaming livestreams (AWS IVS)
- Admin dashboard
- Content moderation (Rekognition)

## Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, Zustand, TanStack Query
- **Mobile**: React Native (Expo)
- **Backend**: Python FastAPI on ECS Fargate
- **Database**: PostgreSQL (RDS) + Redis (ElastiCache)
- **Search**: OpenSearch
- **Storage**: S3 + CloudFront
- **Auth**: AWS Cognito
- **Video**: MediaConvert + AWS IVS
- **ML**: AWS Personalize
- **Payments**: MTN MoMo API + Airtel Money API

## Region

`eu-west-1` (Ireland) — primary until `af-south-1` (Cape Town) is enabled.
