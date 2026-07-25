from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.security import get_current_user

router = APIRouter()

@router.get("")
async def get_notifications(
    page: int = 1,
    limit: int = 20,
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    from sqlalchemy import select
    from app.models.notification import Notification
    query = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    query = query.order_by(Notification.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    notifs = result.scalars().all()
    return {"success": True, "data": {
        "notifications": [
            {"id": str(n.id), "type": n.type, "title": n.title,
             "body": n.body, "is_read": n.is_read, "created_at": n.created_at.isoformat()}
            for n in notifs
        ],
        "unread_count": sum(1 for n in notifs if not n.is_read),
    }}

@router.post("/read")
async def mark_read(body: dict, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    from sqlalchemy import update
    from app.models.notification import Notification
    ids = body.get("notification_ids", "all")
    if ids == "all":
        await db.execute(
            update(Notification).where(Notification.user_id == user.id).values(is_read=True)
        )
    else:
        import uuid
        await db.execute(
            update(Notification).where(
                Notification.user_id == user.id,
                Notification.id.in_([uuid.UUID(i) for i in ids]),
            ).values(is_read=True)
        )
    await db.commit()
    return {"success": True, "data": {"ok": True}}
