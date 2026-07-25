import uuid
from datetime import datetime, date
from sqlalchemy import String, Boolean, DateTime, Integer, BigInteger, Text, ForeignKey, Date, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.db.session import Base


class PlatformSetting(Base):
    __tablename__ = "platform_settings"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    setting_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    setting_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    setting_type: Mapped[str] = mapped_column(String(20), default="string")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_sensitive: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PlatformCostRecord(Base):
    __tablename__ = "platform_cost_records"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_name: Mapped[str] = mapped_column(String(100), nullable=False)
    cost_category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    amount_usd: Mapped[float] = mapped_column(Numeric(10, 4), default=0)
    usage_quantity: Mapped[float | None] = mapped_column(Numeric(15, 4), nullable=True)
    usage_unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PlatformBudget(Base):
    __tablename__ = "platform_budgets"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    budget_name: Mapped[str] = mapped_column(String(100), nullable=False)
    service_filter: Mapped[str | None] = mapped_column(String(100), nullable=True)
    monthly_limit_usd: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    alert_at_50: Mapped[bool] = mapped_column(Boolean, default=True)
    alert_at_75: Mapped[bool] = mapped_column(Boolean, default=True)
    alert_at_90: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_action_at_90: Mapped[str | None] = mapped_column(Text, nullable=True)
    auto_action_at_95: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
