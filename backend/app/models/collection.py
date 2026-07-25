import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Integer, BigInteger, Text, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.db.session import Base


class PaidCollection(Base):
    __tablename__ = "paid_collections"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("channels.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    collection_type: Mapped[str] = mapped_column(String(30), nullable=False, default="course")
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    trailer_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    pricing_model: Mapped[str] = mapped_column(String(20), nullable=False, default="free")
    price_ugx: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    subscription_price_ugx: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    subscription_period: Mapped[str | None] = mapped_column(String(10), nullable=True)
    total_lessons: Mapped[int] = mapped_column(Integer, default=0)
    free_preview_lessons: Mapped[int] = mapped_column(Integer, default=0)
    certificate_on_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    institution_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    institution_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    is_accredited: Mapped[bool] = mapped_column(Boolean, default=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_kids_safe: Mapped[bool] = mapped_column(Boolean, default=False)
    moderation_status: Mapped[str] = mapped_column(String(20), default="pending")
    enrollment_count: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    total_ratings: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CollectionLesson(Base):
    __tablename__ = "collection_lessons"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    collection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("paid_collections.id", ondelete="CASCADE"))
    content_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("content.id", ondelete="CASCADE"), nullable=True)
    lesson_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_free_preview: Mapped[bool] = mapped_column(Boolean, default=False)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)


class CollectionEnrollment(Base):
    __tablename__ = "collection_enrollments"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    collection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("paid_collections.id", ondelete="CASCADE"))
    enrollment_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    amount_paid_ugx: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    payment_source: Mapped[str] = mapped_column(String(20), default="wallet")
    progress_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    lessons_completed: Mapped[int] = mapped_column(Integer, default=0)
    certificate_issued: Mapped[bool] = mapped_column(Boolean, default=False)
    certificate_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    lesson_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("collection_lessons.id", ondelete="CASCADE"))
    watched_seconds: Mapped[int] = mapped_column(Integer, default=0)
    completion_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class CollectionReview(Base):
    __tablename__ = "collection_reviews"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    collection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("paid_collections.id", ondelete="CASCADE"))
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    review_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_verified_purchase: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
