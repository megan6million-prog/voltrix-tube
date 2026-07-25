from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.content import Content
from app.models.channel import Channel

router = APIRouter()

@router.get("")
async def search(
    q: str = "",
    type: Optional[str] = None,
    category: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    if not q:
        return {"success": True, "data": {"results": [], "missing_content_prompt": None}}

    query = select(Content).where(
        Content.title.ilike(f"%{q}%"),
        Content.visibility == "public",
        Content.processing_status == "ready",
    )
    if category:
        query = query.where(Content.category == category)
    if type and type != "all":
        query = query.where(Content.content_type == type)

    query = query.order_by(Content.view_count.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    # Track missing content if no results
    missing_prompt = None
    if not items and q:
        await _track_missing_content(db, q, type)
        missing_prompt = f'No results for "{q}". Want us to add it? We\'ll notify you when available.'

    return {
        "success": True,
        "data": {
            "results": [_serialize_content(c) for c in items],
            "missing_content_prompt": missing_prompt,
            "page": page,
            "total": len(items),
        },
    }

@router.get("/suggestions")
async def search_suggestions(q: str = "", db: AsyncSession = Depends(get_db)):
    if not q or len(q) < 2:
        return {"success": True, "data": {"suggestions": []}}
    result = await db.execute(
        select(Content.title).where(
            Content.title.ilike(f"{q}%"),
            Content.visibility == "public",
        ).limit(8)
    )
    suggestions = [row[0] for row in result.all()]
    return {"success": True, "data": {"suggestions": suggestions}}

@router.get("/trending")
async def get_trending_topics(country: str = "UG", db: AsyncSession = Depends(get_db)):
    from app.models.analytics import TrendingContent
    result = await db.execute(
        select(TrendingContent)
        .where(TrendingContent.country == country)
        .order_by(TrendingContent.rank)
        .limit(20)
    )
    items = result.scalars().all()
    return {"success": True, "data": {"trending": [{"content_id": str(i.content_id), "rank": i.rank} for i in items]}}

async def _track_missing_content(db: AsyncSession, query: str, content_type: str | None):
    from app.models.analytics import MissingContentRequest
    normalized = query.lower().strip()
    result = await db.execute(
        select(MissingContentRequest).where(
            MissingContentRequest.normalized_query == normalized
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.request_count += 1
        existing.last_requested_at = func.now()
    else:
        db.add(MissingContentRequest(
            search_query=query,
            normalized_query=normalized,
            content_type=content_type,
            request_count=1,
        ))
    await db.commit()

def _serialize_content(c: Content) -> dict:
    return {
        "id": str(c.id), "title": c.title,
        "content_type": c.content_type,
        "thumbnail_url": c.thumbnail_url,
        "duration_seconds": c.duration_seconds,
        "view_count": c.view_count,
        "visibility": c.visibility,
    }
