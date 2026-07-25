from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
import uuid

from app.db.session import get_db
from app.services.content_service import ContentService
from app.core.security import get_current_user

router = APIRouter()
security = HTTPBearer()


class CreateContentRequest(BaseModel):
    title: str
    description: Optional[str] = None
    content_type: str  # video / short / movie / series_episode / clip
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    visibility: str = "public"
    monetization_type: Optional[str] = None
    ppv_price_ugx: Optional[int] = None
    rental_price_ugx: Optional[int] = None
    purchase_price_ugx: Optional[int] = None
    is_kids_safe: bool = False
    linked_movie_id: Optional[uuid.UUID] = None
    series_id: Optional[uuid.UUID] = None
    episode_number: Optional[int] = None
    published_at: Optional[str] = None
    is_premiere: bool = False
    language: str = "en"


class UploadURLRequest(BaseModel):
    filename: str
    content_type_mime: str
    file_size: int


class ViewEventRequest(BaseModel):
    watched_seconds: int
    completion_pct: float
    session_id: Optional[uuid.UUID] = None


class ReactRequest(BaseModel):
    reaction: str  # like / dislike


class ShareRequest(BaseModel):
    destination: str
    share_type: str = "full"


class CommentRequest(BaseModel):
    body: str
    parent_id: Optional[uuid.UUID] = None


class PurchaseRequest(BaseModel):
    purchase_type: str  # rent / buy / ppv
    payment_source: str = "wallet"


# ── Upload ────────────────────────────────────────────────────────────────────
@router.post("/upload-url")
async def get_upload_url(
    body: UploadURLRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = ContentService(db)
    result = await svc.generate_upload_url(
        user_id=user.id,
        filename=body.filename,
        content_type_mime=body.content_type_mime,
        file_size=body.file_size,
    )
    return {"success": True, "data": result}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_content(
    body: CreateContentRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = ContentService(db)
    content = await svc.create_content(user_id=user.id, data=body.model_dump())
    return {"success": True, "data": content}


# ── Discovery ─────────────────────────────────────────────────────────────────
@router.get("/feed")
async def get_feed(
    page: int = 1,
    limit: int = 20,
    content_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = ContentService(db)
    result = await svc.get_personalized_feed(
        user_id=user.id,
        page=page,
        limit=limit,
        content_type=content_type,
    )
    return {"success": True, "data": result}


@router.get("/trending")
async def get_trending(
    category: Optional[str] = None,
    country: str = "UG",
    content_type: Optional[str] = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    svc = ContentService(db)
    result = await svc.get_trending(
        category=category,
        country=country,
        content_type=content_type,
        limit=limit,
    )
    return {"success": True, "data": result}


@router.get("/shorts")
async def get_shorts(
    cursor: Optional[str] = None,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = ContentService(db)
    result = await svc.get_shorts(user_id=user.id, cursor=cursor, limit=limit)
    return {"success": True, "data": result}


@router.get("/movies")
async def get_movies(
    genre: Optional[str] = None,
    language: Optional[str] = None,
    sort: str = "trending",
    page: int = 1,
    db: AsyncSession = Depends(get_db),
):
    svc = ContentService(db)
    result = await svc.get_movies(genre=genre, language=language, sort=sort, page=page)
    return {"success": True, "data": result}


# ── Single content ────────────────────────────────────────────────────────────
@router.get("/{content_id}")
async def get_content(
    content_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = ContentService(db)
    result = await svc.get_content_detail(content_id=content_id, user_id=user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Content not found")
    return {"success": True, "data": result}


@router.get("/{content_id}/playback")
async def get_playback(
    content_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = ContentService(db)
    result = await svc.get_playback_urls(content_id=content_id, user_id=user.id)
    return {"success": True, "data": result}


@router.patch("/{content_id}")
async def update_content(
    content_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = ContentService(db)
    result = await svc.update_content(content_id=content_id, user_id=user.id, data=body)
    return {"success": True, "data": result}


@router.delete("/{content_id}")
async def delete_content(
    content_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = ContentService(db)
    await svc.delete_content(content_id=content_id, user_id=user.id)
    return {"success": True, "data": {"message": "Content deleted"}}


# ── Engagement ────────────────────────────────────────────────────────────────
@router.post("/{content_id}/view")
async def track_view(
    content_id: uuid.UUID,
    body: ViewEventRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = ContentService(db)
    await svc.track_view(
        content_id=content_id,
        user_id=user.id,
        watched_seconds=body.watched_seconds,
        completion_pct=body.completion_pct,
    )
    return {"success": True, "data": {"ok": True}}


@router.post("/{content_id}/react")
async def react(
    content_id: uuid.UUID,
    body: ReactRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = ContentService(db)
    result = await svc.react(content_id=content_id, user_id=user.id, reaction=body.reaction)
    return {"success": True, "data": result}


@router.delete("/{content_id}/react")
async def remove_react(
    content_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = ContentService(db)
    await svc.remove_reaction(content_id=content_id, user_id=user.id)
    return {"success": True, "data": {"ok": True}}


@router.post("/{content_id}/save")
async def save_content(
    content_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = ContentService(db)
    await svc.save_content(content_id=content_id, user_id=user.id)
    return {"success": True, "data": {"saved": True}}


@router.post("/{content_id}/share")
async def share_content(
    content_id: uuid.UUID,
    body: ShareRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = ContentService(db)
    result = await svc.share_content(
        content_id=content_id,
        user_id=user.id,
        destination=body.destination,
        share_type=body.share_type,
    )
    return {"success": True, "data": result}


# ── Comments ──────────────────────────────────────────────────────────────────
@router.get("/{content_id}/comments")
async def get_comments(
    content_id: uuid.UUID,
    page: int = 1,
    limit: int = 20,
    sort: str = "top",
    db: AsyncSession = Depends(get_db),
):
    svc = ContentService(db)
    result = await svc.get_comments(content_id=content_id, page=page, limit=limit, sort=sort)
    return {"success": True, "data": result}


@router.post("/{content_id}/comments")
async def add_comment(
    content_id: uuid.UUID,
    body: CommentRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = ContentService(db)
    result = await svc.add_comment(
        content_id=content_id,
        user_id=user.id,
        body=body.body,
        parent_id=body.parent_id,
    )
    return {"success": True, "data": result}


# ── Purchase / PPV ────────────────────────────────────────────────────────────
@router.post("/{content_id}/purchase")
async def purchase_content(
    content_id: uuid.UUID,
    body: PurchaseRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = ContentService(db)
    result = await svc.purchase_content(
        content_id=content_id,
        user_id=user.id,
        purchase_type=body.purchase_type,
        payment_source=body.payment_source,
    )
    return {"success": True, "data": result}


# ── Download ──────────────────────────────────────────────────────────────────
@router.post("/{content_id}/download")
async def download_content(
    content_id: uuid.UUID,
    quality: str = "720p",
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = ContentService(db)
    result = await svc.generate_download_url(
        content_id=content_id,
        user_id=user.id,
        quality=quality,
    )
    return {"success": True, "data": result}


# ── Report ────────────────────────────────────────────────────────────────────
@router.post("/{content_id}/report")
async def report_content(
    content_id: uuid.UUID,
    reason: str,
    details: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = ContentService(db)
    result = await svc.report_content(
        content_id=content_id,
        reporter_id=user.id,
        reason=reason,
        details=details,
    )
    return {"success": True, "data": result}
