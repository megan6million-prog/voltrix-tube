"""
S3-compatible client that works with both AWS S3 and Cloudflare R2.
R2 is used in production (Railway), AWS S3 when deployed on AWS.
"""
import boto3
from botocore.config import Config
from app.core.config import get_settings

settings = get_settings()


def get_s3_client():
    """Return an S3-compatible client — R2 if configured, otherwise AWS S3."""
    if settings.R2_ENDPOINT and settings.R2_ACCESS_KEY_ID:
        return boto3.client(
            's3',
            endpoint_url=settings.R2_ENDPOINT,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=Config(signature_version='s3v4'),
            region_name='auto',
        )
    else:
        return boto3.client('s3', region_name=settings.AWS_REGION)


def generate_presigned_upload_url(bucket: str, key: str, content_type: str, expires: int = 3600) -> str:
    """Generate a presigned URL for direct client upload."""
    s3 = get_s3_client()
    return s3.generate_presigned_url(
        'put_object',
        Params={'Bucket': bucket, 'Key': key, 'ContentType': content_type},
        ExpiresIn=expires,
    )


def generate_presigned_download_url(bucket: str, key: str, expires: int = 3600) -> str:
    """Generate a presigned URL for download."""
    s3 = get_s3_client()
    return s3.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket, 'Key': key},
        ExpiresIn=expires,
    )


def get_public_url(bucket: str, key: str) -> str:
    """Get public URL for an object."""
    if settings.R2_ENDPOINT:
        # R2 public URL via Cloudflare CDN (if bucket is public)
        # For now use the R2 endpoint directly
        return f"{settings.R2_ENDPOINT}/{bucket}/{key}"
    else:
        return f"https://{settings.CLOUDFRONT_DOMAIN}/{key}"


def upload_bytes(bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream"):
    """Upload bytes directly to storage."""
    s3 = get_s3_client()
    s3.put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
