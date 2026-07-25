from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.security import get_current_user, get_current_admin

router = APIRouter()

@router.get("")
async def get_channels(db: AsyncSession = Depends(get_db)):
    return {"success": True, "data": []}

@router.post("")
async def create_channel(body: dict, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    from app.models.channel import Channel
    from app.models.wallet import CreatorWallet
    import re
    handle = body.get("handle", "").lower().strip()
    if not re.match(r"^[a-z0-9_]{3,50}$", handle):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid handle format")
    channel = Channel(
        user_id=user.id,
        channel_name=body.get("channel_name", handle),
        handle=handle,
        description=body.get("description"),
        category=body.get("category"),
    )
    db.add(channel)
    creator_wallet = CreatorWallet(user_id=user.id)
    db.add(creator_wallet)
    user.role = "creator"
    await db.commit()
    return {"success": True, "data": {"id": str(channel.id), "handle": channel.handle}}

@router.get("/me/analytics")
async def get_my_analytics(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    return {"success": True, "data": {"views": 0, "subscribers": 0, "earnings_ugx": 0}}

@router.get("/me/earnings")
async def get_my_earnings(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    from sqlalchemy import select
    from app.models.wallet import CreatorWallet, CreatorEarning
    result = await db.execute(select(CreatorWallet).where(CreatorWallet.user_id == user.id))
    wallet = result.scalar_one_or_none()
    return {"success": True, "data": {
        "available_ugx": wallet.available_ugx if wallet else 0,
        "pending_ugx": wallet.pending_ugx if wallet else 0,
        "lifetime_earned": wallet.lifetime_earned if wallet else 0,
    }}

@router.get("/{handle}")
async def get_channel(handle: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models.channel import Channel
    result = await db.execute(select(Channel).where(Channel.handle == handle))
    channel = result.scalar_one_or_none()
    if not channel:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Channel not found")
    return {"success": True, "data": {
        "id": str(channel.id), "handle": channel.handle,
        "channel_name": channel.channel_name,
        "description": channel.description,
        "subscriber_count": channel.subscriber_count,
        "is_verified": channel.is_verified,
    }}

@router.post("/{handle}/subscribe")
async def subscribe(handle: str, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    from sqlalchemy import select
    from app.models.channel import Channel, ChannelSubscription
    result = await db.execute(select(Channel).where(Channel.handle == handle))
    channel = result.scalar_one_or_none()
    if not channel:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Channel not found")
    sub = ChannelSubscription(subscriber_id=user.id, channel_id=channel.id)
    db.add(sub)
    channel.subscriber_count += 1
    await db.commit()
    return {"success": True, "data": {"subscribed": True}}

@router.delete("/{handle}/subscribe")
async def unsubscribe(handle: str, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    from sqlalchemy import select, delete
    from app.models.channel import Channel, ChannelSubscription
    result = await db.execute(select(Channel).where(Channel.handle == handle))
    channel = result.scalar_one_or_none()
    if channel:
        await db.execute(delete(ChannelSubscription).where(
            ChannelSubscription.subscriber_id == user.id,
            ChannelSubscription.channel_id == channel.id,
        ))
        channel.subscriber_count = max(0, channel.subscriber_count - 1)
        await db.commit()
    return {"success": True, "data": {"subscribed": False}}
