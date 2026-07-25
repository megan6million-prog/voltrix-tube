from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import uuid
from app.db.session import get_db
from app.core.security import get_current_user

router = APIRouter()


@router.get("")
async def list_sounds(
    category: Optional[str] = None,
    sort: str = "trending",
    page: int = 1,
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
):
    from app.models.sound import Sound
    query = select(Sound).where(Sound.status == "active", Sound.is_public == True)
    if category and category != "All":
        from app.models.sound import SoundCategory
        query = query.join(SoundCategory, Sound.id == SoundCategory.sound_id).where(
            SoundCategory.category == category)
    if sort == "trending":
        query = query.order_by(Sound.usage_count.desc())
    elif sort == "newest":
        query = query.order_by(Sound.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    sounds = result.scalars().all()
    return {"success": True, "data": {"sounds": [_serialize(s) for s in sounds]}}


@router.get("/trending")
async def trending_sounds(limit: int = 10, db: AsyncSession = Depends(get_db)):
    from app.models.sound import Sound
    result = await db.execute(
        select(Sound).where(Sound.status == "active", Sound.is_public == True)
        .order_by(Sound.usage_count.desc()).limit(limit)
    )
    sounds = result.scalars().all()
    return {"success": True, "data": {"sounds": [_serialize(s) for s in sounds]}}


@router.get("/saved")
async def saved_sounds(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    from app.models.sound import Sound, SoundSave
    result = await db.execute(
        select(Sound).join(SoundSave, Sound.id == SoundSave.sound_id)
        .where(SoundSave.user_id == user.id)
    )
    sounds = result.scalars().all()
    return {"success": True, "data": {"sounds": [_serialize(s) for s in sounds]}}


@router.get("/{sound_id}")
async def get_sound(sound_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from app.models.sound import Sound
    result = await db.execute(select(Sound).where(Sound.id == sound_id))
    sound = result.scalar_one_or_none()
    if not sound:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Sound not found")
    return {"success": True, "data": _serialize(sound)}


@router.post("/{sound_id}/save")
async def save_sound(sound_id: uuid.UUID, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    from app.models.sound import SoundSave
    save = SoundSave(user_id=user.id, sound_id=sound_id)
    db.add(save)
    await db.commit()
    return {"success": True, "data": {"saved": True}}


@router.delete("/{sound_id}/save")
async def unsave_sound(sound_id: uuid.UUID, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    from sqlalchemy import delete
    from app.models.sound import SoundSave
    await db.execute(delete(SoundSave).where(SoundSave.user_id == user.id, SoundSave.sound_id == sound_id))
    await db.commit()
    return {"success": True, "data": {"saved": False}}


def _serialize(s) -> dict:
    return {
        "id": str(s.id),
        "title": s.title,
        "artist_name": s.artist_name,
        "sound_type": s.sound_type,
        "audio_url": s.audio_url,
        "duration_seconds": s.duration_seconds,
        "usage_count": s.usage_count or 0,
        "is_public": s.is_public,
        "allows_commercial_use": s.allows_commercial_use,
        "status": s.status,
    }
