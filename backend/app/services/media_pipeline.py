"""
Media pipeline — triggered when a video finishes uploading to R2.
Flow:
  1. SQS receives upload event
  2. Rekognition scans thumbnail/first frame (content moderation)
  3. Video uploaded to Cloudflare Stream (transcoding)
  4. Content record updated with playback URLs
  5. Creator notified via WebSocket
"""
import boto3
import structlog
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update, select

from app.core.config import get_settings
from app.models.content import Content

settings = get_settings()
logger = structlog.get_logger()


class ModerationService:
    def __init__(self):
        self.rekognition = boto3.client(
            "rekognition",
            region_name=getattr(settings, "AWS_REGION", "eu-west-1"),
            aws_access_key_id=getattr(settings, "R2_ACCESS_KEY_ID", None),
            aws_secret_access_key=getattr(settings, "R2_SECRET_ACCESS_KEY", None),
        )
        self.min_confidence = getattr(settings, "REKOGNITION_MIN_CONFIDENCE", 75.0)

    async def scan_image_url(self, image_url: str) -> dict:
        """
        Scan an image URL for inappropriate content.
        Falls back to approved if Rekognition isn't configured.
        """
        try:
            import httpx
            # Download image bytes for Rekognition
            async with httpx.AsyncClient() as client:
                resp = await client.get(image_url, timeout=10)
                image_bytes = resp.content

            response = self.rekognition.detect_moderation_labels(
                Image={"Bytes": image_bytes},
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
            logger.warning("moderation.scan.skipped", error=str(e))
            # Default to approved if moderation is not configured
            return {"approved": True, "flagged": False, "rejected": False, "labels": []}


async def process_upload(db: AsyncSession, content_id: str, r2_key: str, title: str = ""):
    """
    Main pipeline entry point.
    Called by SQS worker after video upload to R2 completes.
    """
    from app.services.transcoding_service import TranscodingService

    logger.info("pipeline.start", content_id=content_id, key=r2_key)

    # 1. Mark as processing
    await db.execute(
        update(Content)
        .where(Content.id == content_id)
        .values(processing_status="processing", s3_raw_key=r2_key)
    )
    await db.commit()

    try:
        # 2. Upload to Cloudflare Stream for transcoding
        stream_svc = TranscodingService()
        stream_result = await stream_svc.upload_from_r2(
            content_id=content_id,
            r2_bucket=settings.S3_RAW_UPLOADS,
            r2_key=r2_key,
            title=title,
        )

        stream_id = stream_result["stream_id"]

        # 3. Update content with stream info (processing state)
        await db.execute(
            update(Content)
            .where(Content.id == content_id)
            .values(
                processing_status="transcoding",
                # Store stream_id in s3_processed_key for now
                s3_processed_key=f"stream:{stream_id}",
            )
        )
        await db.commit()

        logger.info("pipeline.transcoding", content_id=content_id, stream_id=stream_id)
        return {"stream_id": stream_id, "status": "transcoding"}

    except Exception as e:
        logger.error("pipeline.error", content_id=content_id, error=str(e))
        await db.execute(
            update(Content)
            .where(Content.id == content_id)
            .values(processing_status="failed")
        )
        await db.commit()
        raise


async def on_stream_ready(db: AsyncSession, content_id: str, stream_id: str):
    """
    Called when Cloudflare Stream webhook fires (video is ready).
    Updates content record with playback URLs and notifies creator.
    """
    from app.core.websocket import ws_manager

    playback_url = f"https://videodelivery.net/{stream_id}/manifest/video.m3u8"
    thumbnail_url = f"https://videodelivery.net/{stream_id}/thumbnails/thumbnail.jpg"

    # Check thumbnail with moderation
    moderator = ModerationService()
    scan = await moderator.scan_image_url(thumbnail_url)

    moderation_status = "rejected" if scan["rejected"] else "flagged" if scan["flagged"] else "approved"
    processing_status = "ready" if moderation_status == "approved" else "failed"

    # Update content record
    await db.execute(
        update(Content)
        .where(Content.id == content_id)
        .values(
            processing_status=processing_status,
            moderation_status=moderation_status,
            hls_manifest_url=playback_url,
            quality_360p_url=playback_url,
            quality_720p_url=playback_url,
            quality_1080p_url=playback_url,
            thumbnail_url=thumbnail_url,
            s3_processed_key=f"stream:{stream_id}",
        )
    )
    await db.commit()

    # Get creator user_id to notify via WebSocket
    result = await db.execute(
        select(Content.channel_id).where(Content.id == content_id)
    )
    # Notify creator
    await ws_manager.send_to_user(
        str(content_id),
        "content_ready",
        {
            "content_id": content_id,
            "status": processing_status,
            "playback_url": playback_url,
            "thumbnail_url": thumbnail_url,
        }
    )

    logger.info("pipeline.ready", content_id=content_id, stream_id=stream_id, status=moderation_status)
