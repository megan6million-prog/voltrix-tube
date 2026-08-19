"""
Media processing endpoints:
- POST /media/webhooks/stream  — Cloudflare Stream calls this when video is ready
- GET  /content/:id/status     — Frontend polls this for processing progress
- POST /content/:id/process    — Manually trigger processing (admin)
"""
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import uuid, hmac, hashlib

from app.db.session import get_db
from app.core.security import get_current_user, get_current_admin
from app.core.config import get_settings
from app.models.content import Content

settings = get_settings()
router = APIRouter()


@router.post("/webhooks/stream")
async def stream_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Cloudflare Stream calls this URL when a video finishes processing.
    Configure webhook URL in Cloudflare Stream dashboard:
    https://dash.cloudflare.com -> Stream -> Webhooks
    -> URL: https://voltrix-api-production.up.railway.app/v1/media/webhooks/stream
    """
    body = await request.json()

    # Verify webhook signature (optional but recommended)
    cf_signature = request.headers.get("Webhook-Signature", "")
    webhook_secret = getattr(settings, "CF_STREAM_WEBHOOK_SECRET", "")
    if webhook_secret and cf_signature:
        expected = hmac.new(webhook_secret.encode(), await request.body(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, cf_signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    # Parse Stream webhook payload
    # Cloudflare sends: {"uid": "stream_id", "status": {"state": "ready"}, "meta": {"name": "content_id"}}
    stream_id = body.get("uid")
    state = body.get("status", {}).get("state")
    content_id = body.get("meta", {}).get("name")  # we set this as content_id on upload

    if not stream_id or not content_id:
        return {"ok": True}

    if state == "ready":
        from app.services.media_pipeline import on_stream_ready
        try:
            await on_stream_ready(db=db, content_id=content_id, stream_id=stream_id)
        except Exception as e:
            import structlog
            structlog.get_logger().error("webhook.stream.error", error=str(e))

    elif state == "error":
        await db.execute(
            update(Content)
            .where(Content.id == uuid.UUID(content_id))
            .values(processing_status="failed")
        )
        await db.commit()

    return {"ok": True}


@router.get("/content/{content_id}/processing-status")
async def get_processing_status(
    content_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Frontend polls this to show upload progress.
    Also checks Cloudflare Stream directly if still processing.
    """
    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    response = {
        "content_id": str(content_id),
        "processing_status": content.processing_status,
        "moderation_status": content.moderation_status,
        "ready": content.processing_status == "ready",
        "playback_url": content.hls_manifest_url,
        "thumbnail_url": content.thumbnail_url,
    }

    # If still transcoding, check Stream API for live progress
    if content.processing_status == "transcoding" and content.s3_processed_key:
        stream_id = content.s3_processed_key.replace("stream:", "")
        if stream_id:
            try:
                from app.services.transcoding_service import TranscodingService
                svc = TranscodingService()
                status = await svc.get_status(stream_id)
                response["stream_pct"] = status.get("pct_complete", 0)

                # If Stream says ready but DB not updated yet, update now
                if status["ready"] and content.processing_status != "ready":
                    from app.services.media_pipeline import on_stream_ready
                    await on_stream_ready(db=db, content_id=str(content_id), stream_id=stream_id)
                    response["processing_status"] = "ready"
                    response["ready"] = True
                    response["playback_url"] = status["playback_url"]
                    response["thumbnail_url"] = status["thumbnail_url"]
            except Exception:
                pass

    return {"success": True, "data": response}


@router.post("/content/{content_id}/process")
async def trigger_processing(
    content_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Admin endpoint to manually trigger processing for a stuck upload."""
    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    if not content.s3_raw_key:
        raise HTTPException(status_code=400, detail="No raw file uploaded yet")

    from app.services.media_pipeline import process_upload
    result = await process_upload(
        db=db,
        content_id=str(content_id),
        r2_key=content.s3_raw_key,
        title=content.title,
    )
    return {"success": True, "data": result}
