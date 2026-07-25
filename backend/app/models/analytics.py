import uuid
from datetime import datetime, date
from sqlalchemy import String, Boolean, DateTime, Integer, BigInteger, Text, ForeignKey, Date, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.db.session import Base


class PlatformAnalyticsDaily(Base):
    __tablename__ = "platform_analytics_daily"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date: Mapped[date] = mapped_column(Date, unique=True, nullable=False)
    new_users: Mapped[int] = mapped_column(Integer, default=0)
    active_users: Mapped[int] = mapped_column(Integer, default=0)
    total_users: Mapped[int] = mapped_column(BigInteger, default=0)
    total_views: Mapped[int] = mapped_column(BigInteger, default=0)
    total_watch_minutes: Mapped[int] = mapped_column(BigInteger, default=0)
    revenue_ads_ugx: Mapped[int] = mapped_column(BigInteger, default=0)
    revenue_subscriptions: Mapped[int] = mapped_column(BigInteger, default=0)
    revenue_ppv_ugx: Mapped[int] = mapped_column(BigInteger, default=0)
    revenue_tips_ugx: Mapped[int] = mapped_column(BigInteger, default=0)
    revenue_memberships: Mapped[int] = mapped_column(BigInteger, default=0)
    revenue_coins_ugx: Mapped[int] = mapped_column(BigInteger, default=0)
    revenue_total_ugx: Mapped[int] = mapped_column(BigInteger, default=0)
    wallet_topups_ugx: Mapped[int] = mapped_column(BigInteger, default=0)
    wallet_float_ugx: Mapped[int] = mapped_column(BigInteger, default=0)
    creator_payouts_ugx: Mapped[int] = mapped_column(BigInteger, default=0)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TrendingContent(Base):
    __tablename__ = "trending_content"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("content.id", ondelete="CASCADE"))
    content_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    country: Mapped[str] = mapped_column(String(5), default="UG")
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    trending_score: Mapped[float] = mapped_column(Numeric(15, 4), default=0)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    views_last_24h: Mapped[int] = mapped_column(BigInteger, default=0)
    views_last_7d: Mapped[int] = mapped_column(BigInteger, default=0)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MissingContentRequest(Base):
    __tablename__ = "missing_content_requests"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    search_query: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    normalized_query: Mapped[str] = mapped_column(Text, nullable=False)
    request_count: Mapped[int] = mapped_column(Integer, default=1)
    last_requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    admin_notified: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="open")
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
