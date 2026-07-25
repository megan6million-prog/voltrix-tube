import boto3
import json
import structlog
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.config import get_settings
from app.models.content import Content
from app.services.mediaconvert_service import MediaConvertService

settings = get_settings()
logger = structlog.get_logger()


class ModerationService:
    def __init__(self):
        self.rekognition = boto3.client("rekognition", region_name=settings.REKOGNITION_REGION)
        self.min_confidence = settings.REKOGNITION_MIN_CONFIDENCE

    async def scan_image(self, s3_bucket: str, s3_key: str) -> dict:
        """Scan an image for inappropriate content."""
        try:
            response = self.rekognition.detect_moderation_labels(
                Image={"S3Object": {"Bucket": s3_bucket, "Name": s3_key}},
                MinConfidence=self.min_confidence,
            )
            labels = response.get("ModerationLabels", [])
            has_explicit = any(
                label["Name"] in [
                    "Explicit Nudity", "Nudity", "Graphic Sexual Activity",
                    "Sexual Activity", "Illustrated Explicit Nudity",
                ]
                for label in labels
            )
            has_suggestive = any(
                label["Name"] in [
                    "Suggestive", "Female Swimwear Or Underwear",
                    "Male Swimwear Or Underwear", "Revealing Clothes",
                ]
                for label in labels
            )
            return {
                "approved": not has_explicit,
                "flagged": has_suggestive and not has_explicit,
                "rejected": has_explicit,
                "labels": [{"name": l["Name"], "confidence": l["Confidence"]} for l in labels],
            }
        except Exception as e:
            logger.error("rekognition.scan.error", error=str(e))
            return {"approved": True, "flagged": False, "rejected": False, "labels": []}


async def process_upload(db: AsyncSession, content_id: str, s3_key: str):
    """
    Called by SQS worker after video upload.
    1. Scan with Rekognition
    2. Submit MediaConvert job
    3. Update content record
    """
    # 1. Update status to processing
    await db.execute(
        update(Content)
        .where(Content.id == content_id)
        .values(processing_status="processing", s3_raw_key=s3_key)
    )
    await db.commit()

    # 2. Rekognition scan (scan first frame proxy — thumbnail after transcode)
    moderator = ModerationService()

    # 3. Submit MediaConvert job
    mc = MediaConvertService()
    try:
        job_id = await mc.submit_transcode_job(
            content_id=content_id,
            s3_input_key=s3_key,
        )

        # Store job ID so we can poll it
        await db.execute(
            update(Content)
            .where(Content.id == content_id)
            .values(processing_status="transcoding")
        )
        await db.commit()

        logger.info("content.processing.started", content_id=content_id, job_id=job_id)
        return {"job_id": job_id}

    except Exception as e:
        await db.execute(
            update(Content)
            .where(Content.id == content_id)
            .values(processing_status="failed")
        )
        await db.commit()
        logger.error("content.processing.failed", content_id=content_id, error=str(e))
        raise


async def on_transcode_complete(db: AsyncSession, content_id: str):
    """Called by MediaConvert SNS notification when job completes."""
    mc = MediaConvertService()
    urls = mc.get_output_urls(content_id)

    # Scan thumbnail with Rekognition
    moderator = ModerationService()
    thumbnail_key = f"{content_id}/thumbnails/thumb.0000000.jpg"
    scan_result = await moderator.scan_image(settings.S3_PROCESSED_VIDEOS, thumbnail_key)

    status = "rejected" if scan_result["rejected"] else \
             "flagged" if scan_result["flagged"] else \
             "approved"

    await db.execute(
        update(Content)
        .where(Content.id == content_id)
        .values(
            processing_status="ready" if status == "approved" else "failed",
            moderation_status=status,
            hls_manifest_url=urls["hls_manifest_url"],
            quality_360p_url=urls["quality_360p_url"],
            quality_720p_url=urls["quality_720p_url"],
            quality_1080p_url=urls["quality_1080p_url"],
            thumbnail_url=urls["thumbnail_url"],
            s3_processed_key=f"{content_id}/hls/",
        )
    )
    await db.commit()
    logger.info("content.transcode.complete", content_id=content_id, status=status)
