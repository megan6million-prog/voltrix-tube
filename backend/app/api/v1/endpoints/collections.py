from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import uuid

from app.db.session import get_db
from app.core.security import get_current_user

router = APIRouter()


@router.get("")
async def list_collections(
    collection_type: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    from app.models.collection import PaidCollection
    query = select(PaidCollection).where(PaidCollection.is_published == True)
    if collection_type:
        query = query.where(PaidCollection.collection_type == collection_type)
    query = query.order_by(PaidCollection.enrollment_count.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()
    return {"success": True, "data": {
        "items": [_serialize(c) for c in items],
        "page": page,
    }}


@router.post("")
async def create_collection(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    from app.models.collection import PaidCollection
    from app.models.channel import Channel
    ch = await db.execute(select(Channel).where(Channel.user_id == user.id))
    channel = ch.scalar_one_or_none()
    if not channel:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="You need a channel first")

    collection = PaidCollection(
        channel_id=channel.id,
        title=body.get("title"),
        description=body.get("description"),
        collection_type=body.get("collection_type", "course"),
        pricing_model=body.get("pricing_model", "free"),
        price_ugx=body.get("price_ugx"),
        subscription_price_ugx=body.get("subscription_price_ugx"),
        subscription_period=body.get("subscription_period", "monthly"),
        free_preview_lessons=body.get("free_preview_lessons", 0),
        certificate_on_complete=body.get("certificate_on_complete", False),
        institution_name=body.get("institution_name"),
        institution_type=body.get("institution_type"),
        is_kids_safe=body.get("is_kids_safe", False),
        is_published=False,
    )
    db.add(collection)
    await db.commit()
    return {"success": True, "data": _serialize(collection)}


@router.get("/{collection_id}")
async def get_collection(
    collection_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    from app.models.collection import PaidCollection, CollectionEnrollment
    result = await db.execute(select(PaidCollection).where(PaidCollection.id == collection_id))
    collection = result.scalar_one_or_none()
    if not collection:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Collection not found")

    # Check enrollment status
    enrollment_status = None
    try:
        enr = await db.execute(
            select(CollectionEnrollment).where(
                CollectionEnrollment.collection_id == collection_id,
                CollectionEnrollment.user_id == user.id,
            )
        )
        enrollment = enr.scalar_one_or_none()
        enrollment_status = enrollment.status if enrollment else None
    except Exception:
        pass

    data = _serialize(collection)
    data["user_enrollment_status"] = enrollment_status
    return {"success": True, "data": data}


@router.get("/{collection_id}/lessons")
async def get_lessons(
    collection_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    from app.models.collection import CollectionLesson, LessonProgress
    result = await db.execute(
        select(CollectionLesson)
        .where(CollectionLesson.collection_id == collection_id)
        .order_by(CollectionLesson.lesson_number)
    )
    lessons = result.scalars().all()
    return {"success": True, "data": {
        "lessons": [
            {
                "id": str(l.id),
                "lesson_number": l.lesson_number,
                "title": l.title,
                "content_id": str(l.content_id) if l.content_id else None,
                "duration_seconds": l.duration_seconds,
                "is_free_preview": l.is_free_preview,
            }
            for l in lessons
        ],
        "user_progress": {},
    }}


@router.post("/{collection_id}/enroll")
async def enroll(
    collection_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    from app.models.collection import PaidCollection, CollectionEnrollment
    from app.services.wallet_service import WalletService
    from datetime import datetime, timezone, timedelta

    result = await db.execute(select(PaidCollection).where(PaidCollection.id == collection_id))
    collection = result.scalar_one_or_none()
    if not collection:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Collection not found")

    price = collection.price_ugx or 0
    if price > 0:
        svc = WalletService(db)
        await svc.deduct(
            user_id=user.id,
            amount_ugx=price,
            description=f"Enrolled in: {collection.title}",
            reference_id=str(collection_id),
        )

    expires_at = None
    if collection.pricing_model == "subscription":
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    enrollment = CollectionEnrollment(
        user_id=user.id,
        collection_id=collection_id,
        enrollment_type=collection.pricing_model,
        amount_paid_ugx=price,
        expires_at=expires_at,
        status="active",
    )
    db.add(enrollment)
    collection.enrollment_count = (collection.enrollment_count or 0) + 1
    await db.commit()
    return {"success": True, "data": {"enrolled": True, "expires_at": expires_at.isoformat() if expires_at else None}}


@router.get("/{collection_id}/reviews")
async def get_reviews(
    collection_id: uuid.UUID,
    page: int = 1,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
):
    from app.models.collection import CollectionReview
    result = await db.execute(
        select(CollectionReview)
        .where(CollectionReview.collection_id == collection_id)
        .order_by(CollectionReview.created_at.desc())
        .offset((page - 1) * limit).limit(limit)
    )
    reviews = result.scalars().all()
    return {"success": True, "data": {
        "reviews": [
            {"id": str(r.id), "rating": r.rating, "review_text": r.review_text,
             "is_verified_purchase": r.is_verified_purchase}
            for r in reviews
        ]
    }}


def _serialize(c) -> dict:
    return {
        "id": str(c.id),
        "title": c.title,
        "description": c.description,
        "collection_type": c.collection_type,
        "pricing_model": c.pricing_model,
        "price_ugx": c.price_ugx,
        "subscription_price_ugx": c.subscription_price_ugx,
        "subscription_period": c.subscription_period,
        "free_preview_lessons": c.free_preview_lessons,
        "certificate_on_complete": c.certificate_on_complete,
        "institution_name": c.institution_name,
        "institution_type": c.institution_type,
        "is_kids_safe": c.is_kids_safe,
        "enrollment_count": c.enrollment_count or 0,
        "rating": float(c.rating) if c.rating else 0.0,
        "total_ratings": c.total_ratings or 0,
        "total_lessons": c.total_lessons or 0,
        "is_published": c.is_published,
    }
