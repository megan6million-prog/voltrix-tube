from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Voltrix"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # API
    API_V1_PREFIX: str = "/v1"
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Database
    DATABASE_URL: str
    DATABASE_REPLICA_URL: Optional[str] = None
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 40

    # Redis
    REDIS_URL: str

    # AWS
    AWS_REGION: str = "eu-west-1"
    AWS_ACCOUNT_ID: str = "000000000000"

    # Cloudflare R2 (S3-compatible storage)
    R2_ENDPOINT: Optional[str] = None
    R2_ACCESS_KEY_ID: Optional[str] = None
    R2_SECRET_ACCESS_KEY: Optional[str] = None
    CF_ACCOUNT_ID: Optional[str] = None

    # S3 Buckets
    S3_RAW_UPLOADS: str
    S3_PROCESSED_VIDEOS: str
    S3_THUMBNAILS: str
    S3_SOUNDS: str
    S3_CAPTIONS: str
    S3_FRONTEND: str
    S3_DATA_LAKE: str
    S3_EXPORTS: str

    # CloudFront
    CLOUDFRONT_DOMAIN: str
    CLOUDFRONT_KEY_PAIR_ID: Optional[str] = None
    CLOUDFRONT_PRIVATE_KEY: Optional[str] = None

    # Cognito
    COGNITO_USER_POOL_ID: str
    COGNITO_CLIENT_ID: str
    COGNITO_REGION: str = "eu-west-1"

    # MediaConvert
    MEDIACONVERT_ENDPOINT: str
    MEDIACONVERT_ROLE_ARN: str

    # AWS IVS
    IVS_REGION: str = "eu-west-1"

    # Payments — MTN MoMo
    MTN_MOMO_BASE_URL: str = "https://sandbox.momodeveloper.mtn.com"
    MTN_MOMO_COLLECTION_PRIMARY_KEY: Optional[str] = None
    MTN_MOMO_COLLECTION_SECRET: Optional[str] = None
    MTN_MOMO_DISBURSEMENT_PRIMARY_KEY: Optional[str] = None
    MTN_MOMO_DISBURSEMENT_SECRET: Optional[str] = None
    MTN_MOMO_ENVIRONMENT: str = "sandbox"

    # Payments — Airtel Money
    AIRTEL_BASE_URL: str = "https://openapiuat.airtel.africa"
    AIRTEL_CLIENT_ID: Optional[str] = None
    AIRTEL_CLIENT_SECRET: Optional[str] = None
    AIRTEL_ENVIRONMENT: str = "sandbox"

    # Coinbase Commerce
    COINBASE_API_KEY: Optional[str] = None
    COINBASE_WEBHOOK_SECRET: Optional[str] = None

    # Google Ad Manager
    GAM_NETWORK_CODE: Optional[str] = None

    # Rekognition
    REKOGNITION_REGION: str = "eu-west-1"
    REKOGNITION_MIN_CONFIDENCE: float = 75.0

    # AWS Personalize
    PERSONALIZE_CAMPAIGN_ARN: Optional[str] = None

    # SNS (notifications)
    SNS_PLATFORM_APPLICATION_ARN: Optional[str] = None

    # SQS Queues
    SQS_PAYMENT_WEBHOOKS: str
    SQS_UPLOAD_JOBS: str
    SQS_NOTIFICATIONS: str
    SQS_MISSING_CONTENT: str

    # Kinesis
    KINESIS_EVENTS_STREAM: str = "voltrix-events"

    # Platform config
    MIN_WALLET_TOPUP_UGX: int = 1000
    MAX_WALLET_BALANCE_UGX: int = 5000000
    MIN_CREATOR_PAYOUT_UGX: int = 50000
    EARNINGS_HOLD_DAYS: int = 7
    AD_REVENUE_CREATOR_PCT: float = 55.0
    TIP_PLATFORM_CUT_PCT: float = 10.0
    MEMBERSHIP_PLATFORM_CUT_PCT: float = 25.0
    PPV_PLATFORM_CUT_PCT: float = 30.0
    MOVIE_REFERRAL_PCT: float = 10.0
    SPORTS_REFERRAL_PCT: float = 8.0

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


def _fix_db_url(url: str) -> str:
    """Convert postgresql:// to postgresql+asyncpg:// if needed."""
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url
