import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Integer, BigInteger, Text, ForeignKey, Numeric, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.session import Base


class Content(Base):
    __tablename__ = "content"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("channels.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_type: Mapped[str] = mapped_column(String(20), nullable=False)  # video/short/movie/series_episode/clip
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    language: Mapped[str] = mapped_column(String(10), default="en")
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    trailer_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Storage
    s3_raw_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    s3_processed_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    hls_manifest_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Quality variants
    quality_360p_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    quality_720p_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    quality_1080p_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    quality_4k_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Processing
    processing_status: Mapped[str] = mapped_column(String(20), default="pending")

    # Visibility
    visibility: Mapped[str] = mapped_column(String(20), default="public")

    # Monetization
    is_monetized: Mapped[bool] = mapped_column(Boolean, default=False)
    monetization_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ppv_price_ugx: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rental_price_ugx: Mapped[int | None] = mapped_column(Integer, nullable=True)
    purchase_price_ugx: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Movie specific
    series_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("series.id"), nullable=True)
    episode_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    season_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    release_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rating: Mapped[str | None] = mapped_column(String(10), nullable=True)
    is_kids_safe: Mapped[bool] = mapped_column(Boolean, default=False)
    has_drm: Mapped[bool] = mapped_column(Boolean, default=False)

    # Referral
    linked_movie_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("content.id"), nullable=True)

    # Stats (denormalized)
    view_count: Mapped[int] = mapped_column(BigInteger, default=0)
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    dislike_count: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)
    share_count: Mapped[int] = mapped_column(Integer, default=0)

    # Moderation
    moderation_status: Mapped[str] = mapped_column(String(20), default="approved")
    moderation_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Scheduling
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_premiere: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    channel: Mapped["Channel"] = relationship("Channel", back_populates="content")


class Series(Base):
    __tablename__ = "series"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("channels.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    genre: Mapped[str | None] = mapped_column(String(50), nullable=True)
    language: Mapped[str | None] = mapped_column(String(10), nullable=True)
    total_seasons: Mapped[int] = mapped_column(Integer, default=1)
    is_kids_safe: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="ongoing")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
