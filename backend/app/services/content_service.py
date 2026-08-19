import uuid
import boto3
import structlog
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func

from app.core.config import get_settings
from app.models.content import Content, Series
from app.models.channel import Channel
from app.models.analytics import TrendingContent

settings = get_settings()
logger = structlog.get_logger()


class ContentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_upload_url(
        self,
        user_id: uuid.UUID,
        filename: str,
        content_type_mime: str,
        file_size: int,
    ) -> dict:
        if file_size > 10 * 1024 * 1024 * 1024:
            raise ValueError("File size exceeds 10GB limit")

        from app.core.storage import generate_presigned_upload_url
        content_id = uuid.uuid4()
        s3_key = f"uploads/{user_id}/{content_id}/{filename}"

        presigned_url = generate_presigned_upload_url(
            bucket=settings.S3_RAW_UPLOADS,
            key=s3_key,
            content_type=content_type_mime,
        )
        return {
            "upload_url": presigned_url,
            "content_id": str(content_id),
            "s3_key": s3_key,
        }

    async def create_content(self, user_id: uuid.UUID, data: dict) -> dict:
        # Get channel for this user
        result = await self.db.execute(select(Channel).where(Channel.user_id == user_id))
        channel = result.scalar_one_or_none()
        if not channel:
            raise ValueError("You need a channel to upload content")

        content = Content(
            channel_id=channel.id,
            title=data["title"],
            description=data.get("description"),
            content_type=data["content_type"],
            category=data.get("category"),
            tags=data.get("tags"),
            language=data.get("language", "en"),
            visibility=data.get("visibility", "public"),
            monetization_type=data.get("monetization_type"),
            ppv_price_ugx=data.get("ppv_price_ugx"),
            rental_price_ugx=data.get("rental_price_ugx"),
            purchase_price_ugx=data.get("purchase_price_ugx"),
            is_kids_safe=data.get("is_kids_safe", False),
            linked_movie_id=data.get("linked_movie_id"),
            series_id=data.get("series_id"),
            episode_number=data.get("episode_number"),
            is_premiere=data.get("is_premiere", False),
            processing_status="pending",
        )

        if data.get("published_at"):
            content.published_at = datetime.fromisoformat(data["published_at"])
        else:
            content.published_at = datetime.now(timezone.utc)

        self.db.add(content)
        await self.db.commit()

        # Auto-trigger Stream processing if s3_raw_key is provided
        if data.get("s3_key"):
            from app.services.media_pipeline import process_upload
            try:
                await process_upload(
                    db=self.db,
                    content_id=str(content.id),
                    r2_key=data["s3_key"],
                    title=data["title"],
                )
            except Exception as e:
                logger.warning("content.auto_process.failed", error=str(e))

        return self._serialize(content)

    async def get_content_detail(self, content_id: uuid.UUID, user_id: uuid.UUID) -> dict | None:
        result = await self.db.execute(
            select(Content).where(Content.id == content_id)
        )
        content = result.scalar_one_or_none()
        if not content:
            return None
        return self._serialize(content)

    async def get_playback_urls(self, content_id: uuid.UUID, user_id: uuid.UUID) -> dict:
        result = await self.db.execute(select(Content).where(Content.id == content_id))
        content = result.scalar_one_or_none()
        if not content:
            raise ValueError("Content not found")

        if content.processing_status != "ready":
            raise ValueError(f"Content is still {content.processing_status}")

        # Check access for gated content
        if content.visibility in ("ppv", "members_only"):
            has_access = await self._check_access(content_id=content_id, user_id=user_id)
            if not has_access:
                raise PermissionError("Purchase required to access this content")

        return {
            "hls_url": content.hls_manifest_url,
            "quality_360p": content.quality_360p_url,
            "quality_720p": content.quality_720p_url,
            "quality_1080p": content.quality_1080p_url,
            "has_drm": content.has_drm,
        }

    async def get_personalized_feed(
        self,
        user_id: uuid.UUID,
        page: int,
        limit: int,
        content_type: str | None,
    ) -> dict:
        # Phase 1: trending-based feed (ML Personalize added in Phase 2)
        query = select(Content).where(
            Content.visibility == "public",
            Content.processing_status == "ready",
        )
        if content_type:
            query = query.where(Content.content_type == content_type)

        query = query.order_by(Content.view_count.desc(), Content.published_at.desc())
        query = query.offset((page - 1) * limit).limit(limit)

        result = await self.db.execute(query)
        items = result.scalars().all()
        return {
            "items": [self._serialize(c) for c in items],
            "page": page,
            "limit": limit,
        }

    async def get_trending(
        self,
        category: str | None,
        country: str,
        content_type: str | None,
        limit: int,
    ) -> dict:
        query = select(Content).where(
            Content.visibility == "public",
            Content.processing_status == "ready",
        )
        if category:
            query = query.where(Content.category == category)
        if content_type:
            query = query.where(Content.content_type == content_type)

        query = query.order_by(Content.view_count.desc()).limit(limit)
        result = await self.db.execute(query)
        items = result.scalars().all()
        return {"items": [self._serialize(c) for c in items]}

    async def get_shorts(self, user_id: uuid.UUID, cursor: str | None, limit: int) -> dict:
        query = select(Content).where(
            Content.content_type == "short",
            Content.visibility == "public",
            Content.processing_status == "ready",
        ).order_by(Content.published_at.desc()).limit(limit)

        result = await self.db.execute(query)
        items = result.scalars().all()
        return {"items": [self._serialize(c) for c in items], "next_cursor": None}

    async def get_movies(
        self, genre: str | None, language: str | None, sort: str, page: int
    ) -> dict:
        query = select(Content).where(
            Content.content_type == "movie",
            Content.visibility.in_(["public", "ppv"]),
            Content.processing_status == "ready",
        )
        if genre:
            query = query.where(Content.category == genre)
        if language:
            query = query.where(Content.language == language)
        query = query.order_by(Content.view_count.desc()).offset((page - 1) * 20).limit(20)
        result = await self.db.execute(query)
        items = result.scalars().all()
        return {"items": [self._serialize(c) for c in items], "page": page}

    async def update_content(self, content_id: uuid.UUID, user_id: uuid.UUID, data: dict) -> dict:
        result = await self.db.execute(select(Content).where(Content.id == content_id))
        content = result.scalar_one_or_none()
        if not content:
            raise ValueError("Content not found")

        allowed = {"title", "description", "tags", "visibility", "thumbnail_url", "ppv_price_ugx"}
        for key, val in data.items():
            if key in allowed:
                setattr(content, key, val)

        await self.db.commit()
        return self._serialize(content)

    async def delete_content(self, content_id: uuid.UUID, user_id: uuid.UUID) -> None:
        result = await self.db.execute(select(Content).where(Content.id == content_id))
        content = result.scalar_one_or_none()
        if content:
            await self.db.delete(content)
            await self.db.commit()

    async def track_view(
        self,
        content_id: uuid.UUID,
        user_id: uuid.UUID,
        watched_seconds: int,
        completion_pct: float,
    ) -> None:
        await self.db.execute(
            update(Content)
            .where(Content.id == content_id)
            .values(view_count=Content.view_count + 1)
        )
        await self.db.commit()

    async def react(self, content_id: uuid.UUID, user_id: uuid.UUID, reaction: str) -> dict:
        from app.models.content import Content
        result = await self.db.execute(select(Content).where(Content.id == content_id))
        content = result.scalar_one_or_none()
        if not content:
            raise ValueError("Content not found")
        if reaction == "like":
            content.like_count += 1
        elif reaction == "dislike":
            content.dislike_count += 1
        await self.db.commit()
        return {"like_count": content.like_count, "dislike_count": content.dislike_count}

    async def remove_reaction(self, content_id: uuid.UUID, user_id: uuid.UUID) -> None:
        pass  # Remove from reactions table in full implementation

    async def save_content(self, content_id: uuid.UUID, user_id: uuid.UUID) -> None:
        from app.models.content import ContentSave
        save = ContentSave(user_id=user_id, content_id=content_id)
        self.db.add(save)
        await self.db.commit()

    async def share_content(
        self,
        content_id: uuid.UUID,
        user_id: uuid.UUID,
        destination: str,
        share_type: str,
    ) -> dict:
        result = await self.db.execute(select(Content).where(Content.id == content_id))
        content = result.scalar_one_or_none()
        if not content:
            raise ValueError("Content not found")
        content.share_count += 1
        await self.db.commit()

        share_url = f"https://{settings.CLOUDFRONT_DOMAIN}/watch/{content_id}"
        preview_url = f"{share_url}?preview=1"
        return {"share_url": share_url, "preview_url": preview_url}

    async def get_comments(
        self, content_id: uuid.UUID, page: int, limit: int, sort: str
    ) -> dict:
        from app.models.engagement import Comment
        query = select(Comment).where(
            Comment.content_id == content_id,
            Comment.parent_id.is_(None),
            Comment.is_deleted == False,
        )
        if sort == "top":
            query = query.order_by(Comment.like_count.desc())
        else:
            query = query.order_by(Comment.created_at.desc())
        query = query.offset((page - 1) * limit).limit(limit)
        result = await self.db.execute(query)
        comments = result.scalars().all()
        return {"comments": [
            {"id": str(c.id), "body": c.body, "like_count": c.like_count,
             "created_at": c.created_at.isoformat()}
            for c in comments
        ]}

    async def add_comment(
        self,
        content_id: uuid.UUID,
        user_id: uuid.UUID,
        body: str,
        parent_id: uuid.UUID | None,
    ) -> dict:
        from app.models.engagement import Comment
        comment = Comment(
            content_id=content_id,
            user_id=user_id,
            body=body,
            parent_id=parent_id,
        )
        self.db.add(comment)
        await self.db.execute(
            update(Content).where(Content.id == content_id)
            .values(comment_count=Content.comment_count + 1)
        )
        await self.db.commit()
        return {"id": str(comment.id), "body": comment.body}

    async def purchase_content(
        self,
        content_id: uuid.UUID,
        user_id: uuid.UUID,
        purchase_type: str,
        payment_source: str,
    ) -> dict:
        from app.models.wallet import ContentPurchase
        from app.services.wallet_service import WalletService

        result = await self.db.execute(select(Content).where(Content.id == content_id))
        content = result.scalar_one_or_none()
        if not content:
            raise ValueError("Content not found")

        if purchase_type == "rent":
            price = content.rental_price_ugx
        elif purchase_type == "buy":
            price = content.purchase_price_ugx
        else:
            price = content.ppv_price_ugx

        if not price:
            raise ValueError("This content is not available for purchase")

        # Deduct from wallet
        wallet_svc = WalletService(self.db)
        await wallet_svc.deduct(
            user_id=user_id,
            amount_ugx=price,
            description=f"{purchase_type.title()} — {content.title}",
            reference_id=str(content_id),
        )

        from datetime import timedelta
        expires = None
        if purchase_type == "rent":
            expires = datetime.now(timezone.utc) + timedelta(hours=48)

        purchase = ContentPurchase(
            user_id=user_id,
            content_id=content_id,
            purchase_type=purchase_type,
            amount_ugx=price,
            access_expires_at=expires,
        )
        self.db.add(purchase)
        await self.db.commit()

        return {
            "purchase_id": str(purchase.id),
            "access_granted": True,
            "expires_at": expires.isoformat() if expires else None,
        }

    async def generate_download_url(
        self, content_id: uuid.UUID, user_id: uuid.UUID, quality: str
    ) -> dict:
        result = await self.db.execute(select(Content).where(Content.id == content_id))
        content = result.scalar_one_or_none()
        if not content:
            raise ValueError("Content not found")

        quality_map = {
            "360p": content.quality_360p_url,
            "720p": content.quality_720p_url,
            "1080p": content.quality_1080p_url,
        }
        url = quality_map.get(quality, content.quality_360p_url)
        if not url:
            raise ValueError("Quality not available")

        from datetime import timedelta
        return {
            "download_url": url,
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
            "quality": quality,
        }

    async def report_content(
        self,
        content_id: uuid.UUID,
        reporter_id: uuid.UUID,
        reason: str,
        details: str | None,
    ) -> dict:
        from app.models.engagement import ContentReport
        report = ContentReport(
            reporter_id=reporter_id,
            content_id=content_id,
            reason=reason,
            details=details,
        )
        self.db.add(report)
        await self.db.commit()
        return {"report_id": str(report.id)}

    async def _check_access(self, content_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        from app.models.wallet import ContentPurchase
        result = await self.db.execute(
            select(ContentPurchase).where(
                ContentPurchase.content_id == content_id,
                ContentPurchase.user_id == user_id,
            )
        )
        purchase = result.scalar_one_or_none()
        if not purchase:
            return False
        if purchase.access_expires_at and purchase.access_expires_at < datetime.now(timezone.utc):
            return False
        return True

    def _serialize(self, c: Content) -> dict:
        return {
            "id": str(c.id),
            "title": c.title,
            "description": c.description,
            "content_type": c.content_type,
            "category": c.category,
            "tags": c.tags,
            "language": c.language,
            "thumbnail_url": c.thumbnail_url,
            "duration_seconds": c.duration_seconds,
            "visibility": c.visibility,
            "monetization_type": c.monetization_type,
            "ppv_price_ugx": c.ppv_price_ugx,
            "rental_price_ugx": c.rental_price_ugx,
            "purchase_price_ugx": c.purchase_price_ugx,
            "view_count": c.view_count,
            "like_count": c.like_count,
            "comment_count": c.comment_count,
            "processing_status": c.processing_status,
            "is_kids_safe": c.is_kids_safe,
            "published_at": c.published_at.isoformat() if c.published_at else None,
            "created_at": c.created_at.isoformat(),
        }
