import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Integer, BigInteger, Text, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cognito_sub: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    phone_primary: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    phone_secondary: Mapped[str | None] = mapped_column(String(20), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str] = mapped_column(String(5), default="UG")
    language: Mapped[str] = mapped_column(String(10), default="en")
    role: Mapped[str] = mapped_column(String(20), default="viewer")
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False)
    ban_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    banned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    kids_mode_pin: Mapped[str | None] = mapped_column(String(6), nullable=True)
    data_saver_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships — use string references to avoid circular imports
    wallet: Mapped["UserWallet"] = relationship("UserWallet", back_populates="user", uselist=False)
    channel: Mapped["Channel"] = relationship("Channel", back_populates="user", uselist=False)
