import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Integer, BigInteger, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.db.session import Base


class PromoCode(Base):
    __tablename__ = "promo_codes"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    promo_type: Mapped[str] = mapped_column(String(30), nullable=False)
    value_ugx: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    discount_pct: Mapped[float | None] = mapped_column(nullable=True)
    coins_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    subscription_plan: Mapped[str | None] = mapped_column(String(20), nullable=True)
    subscription_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_uses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_uses_per_user: Mapped[int] = mapped_column(Integer, default=1)
    min_topup_ugx: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    applicable_to: Mapped[str] = mapped_column(String(20), default="all")
    specific_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    total_uses: Mapped[int] = mapped_column(Integer, default=0)
    total_discount_ugx: Mapped[int] = mapped_column(BigInteger, default=0)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PromoRedemption(Base):
    __tablename__ = "promo_redemptions"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    promo_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("promo_codes.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    benefit_given: Mapped[str | None] = mapped_column(Text, nullable=True)
    benefit_value_ugx: Mapped[int] = mapped_column(BigInteger, default=0)
    redeemed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
