"""
Cloudflare Stream transcoding service.
- Uploads video from R2 to Stream for transcoding
- Stream handles: HLS generation, adaptive bitrate, thumbnail extraction
- Returns playback URL and thumbnail URL
- Free tier: 1000 minutes/month storage, unlimited encoding
"""
import httpx
import asyncio
import structlog
from app.core.config import get_settings
from app.core.storage import get_s3_client

settings = get_settings()
logger = structlog.get_logger()

STREAM_API = "https://api.cloudflare.com/client/v4/accounts"


class TranscodingService:

    def __init__(self):
        self.account_id = getattr(settings, "CF_ACCOUNT_ID", "")
        self.stream_token = getattr(settings, "CF_STREAM_TOKEN", "")
        self.headers = {
            "Authorization": f"Bearer {self.stream_token}",
        }

    async def upload_from_r2(
        self,
        content_id: str,
        r2_bucket: str,
        r2_key: str,
        title: str = "",
    ) -> dict:
        """
        Upload a video from R2 to Cloudflare Stream.
        Stream fetches it via a presigned URL — no large upload from our server.
        """
        # Generate a presigned download URL from R2 (valid 1 hour)
        from app.core.storage import generate_presigned_download_url
        presigned_url = generate_presigned_download_url(
            bucket=r2_bucket,
            key=r2_key,
            expires=3600,
        )

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{STREAM_API}/{self.account_id}/stream/copy",
                headers=self.headers,
                json={
                    "url": presigned_url,
                    "meta": {
                        "name": title or content_id,
                    },
                    "requireSignedURLs": False,
                    "allowedOrigins": ["*"],
                    "thumbnailTimestampPct": 0.1,  # thumbnail at 10% of video
                },
            )
            data = resp.json()

        if not data.get("success"):
            raise ValueError(f"Stream upload failed: {data.get('errors')}")

        video = data["result"]
        stream_id = video["uid"]

        logger.info("stream.upload.started", content_id=content_id, stream_id=stream_id)
        return {
            "stream_id": stream_id,
            "status": video.get("status", {}).get("state", "queued"),
            "playback_url": f"https://videodelivery.net/{stream_id}/manifest/video.m3u8",
            "thumbnail_url": f"https://videodelivery.net/{stream_id}/thumbnails/thumbnail.jpg",
            "embed_url": f"https://iframe.videodelivery.net/{stream_id}",
        }

    async def get_status(self, stream_id: str) -> dict:
        """Poll Stream for processing status."""
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{STREAM_API}/{self.account_id}/stream/{stream_id}",
                headers=self.headers,
            )
            data = resp.json()

        if not data.get("success"):
            return {"status": "error", "error": str(data.get("errors"))}

        video = data["result"]
        state = video.get("status", {}).get("state", "unknown")

        return {
            "stream_id": stream_id,
            "status": state,                    # queued / inprogress / ready / error
            "ready": state == "ready",
            "pct_complete": video.get("status", {}).get("pctComplete", 0),
            "playback_url": f"https://videodelivery.net/{stream_id}/manifest/video.m3u8",
            "thumbnail_url": f"https://videodelivery.net/{stream_id}/thumbnails/thumbnail.jpg",
            "duration": video.get("duration"),
            "size": video.get("size"),
        }

    async def wait_for_ready(self, stream_id: str, max_wait: int = 300) -> dict:
        """Poll until video is ready or timeout."""
        for _ in range(max_wait // 5):
            status = await self.get_status(stream_id)
            if status["ready"]:
                return status
            if status["status"] == "error":
                raise ValueError(f"Stream processing error: {status.get('error')}")
            await asyncio.sleep(5)
        raise TimeoutError(f"Stream processing timed out after {max_wait}s")

    async def delete_video(self, stream_id: str) -> None:
        """Delete a video from Stream."""
        async with httpx.AsyncClient(timeout=10) as client:
            await client.delete(
                f"{STREAM_API}/{self.account_id}/stream/{stream_id}",
                headers=self.headers,
            )

    async def create_signed_token(self, stream_id: str, expiry: int = 3600) -> str:
        """
        Create a signed playback token for protected content (PPV/members-only).
        """
        import time
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{STREAM_API}/{self.account_id}/stream/{stream_id}/token",
                headers=self.headers,
                json={"exp": int(time.time()) + expiry},
            )
            data = resp.json()

        if data.get("success"):
            return data["result"]["token"]
        raise ValueError("Failed to create signed token")
