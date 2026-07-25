import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Integer, BigInteger, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.db.session import Base


class Sound(Base):
    __tablename__ = "sounds"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_content_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("content.id"), nullable=True)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    artist_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sound_type: Mapped[str] = mapped_column(String(20), default="original")
    audio_url: Mapped[str] = mapped_column(Text, nullable=False)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cover_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    waveform_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    allows_commercial_use: Mapped[bool] = mapped_column(Boolean, default=False)
    is_copyrighted: Mapped[bool] = mapped_column(Boolean, default=False)
    copyright_owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rekognition_cleared: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SoundCategory(Base):
    __tablename__ = "sound_categories"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sound_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sounds.id", ondelete="CASCADE"))
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SoundUsage(Base):
    __tablename__ = "sound_usages"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sound_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sounds.id", ondelete="CASCADE"))
    content_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("content.id", ondelete="CASCADE"))
    used_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    start_offset_seconds: Mapped[int] = mapped_column(Integer, default=0)
    end_offset_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SoundSave(Base):
    __tablename__ = "sound_saves"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    sound_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sounds.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
