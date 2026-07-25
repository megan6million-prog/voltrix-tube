from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.db.session import get_db
from app.core.security import get_current_user

router = APIRouter()

@router.get("/me")
async def get_me(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    return {"success": True, "data": {
        "id": str(user.id), "username": user.username,
        "phone_primary": user.phone_primary, "role": user.role,
        "avatar_url": user.avatar_url,
        "bio": user.bio if user.bio and not user.bio.startswith("__pwd:") else None,
        "country": user.country, "language": user.language,
        "is_verified": user.is_verified, "created_at": user.created_at.isoformat(),
    }}

@router.patch("/me")
async def update_me(body: dict, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    allowed = {"username", "bio", "avatar_url", "language", "data_saver_mode"}
    for key, val in body.items():
        if key in allowed:
            setattr(user, key, val)
    await db.commit()
    return {"success": True, "data": {"updated": True}}

@router.get("/{username}")
async def get_user_profile(username: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models.user import User
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "data": {
        "id": str(user.id), "username": user.username,
        "avatar_url": user.avatar_url, "bio": user.bio,
    }}

@router.get("/me/referral")
async def get_referral(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    return {"success": True, "data": {
        "referral_code": str(user.id)[:8].upper(),
        "total_referred": 0, "earnings_ugx": 0,
    }}

@router.post("/me/promo-code")
async def redeem_promo(body: dict, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    from sqlalchemy import select
    from app.models.promo import PromoCode, PromoRedemption
    code = body.get("code", "").upper()
    result = await db.execute(select(PromoCode).where(PromoCode.code == code, PromoCode.is_active == True))
    promo = result.scalar_one_or_none()
    if not promo:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid or expired promo code")
    redemption = PromoRedemption(promo_id=promo.id, user_id=user.id, benefit_value_ugx=promo.value_ugx or 0)
    db.add(redemption)
    promo.total_uses += 1
    await db.commit()
    return {"success": True, "data": {"benefit": promo.promo_type, "value_ugx": promo.value_ugx}}
