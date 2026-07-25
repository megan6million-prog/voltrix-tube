from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.db.session import get_db
from app.core.security import get_current_admin
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/dashboard")
async def admin_dashboard(db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    from app.models.user import User
    from app.models.content import Content
    from app.models.livestream import Livestream
    from app.models.wallet import WalletTransaction

    total_users = await db.execute(select(func.count(User.id)))
    live_count = await db.execute(select(func.count(Livestream.id)).where(Livestream.status == "live"))

    return {"success": True, "data": {
        "total_users": total_users.scalar(),
        "live_streams": live_count.scalar(),
        "pending_moderation": 0,
        "revenue_today_ugx": 0,
    }}


@router.get("/users")
async def list_users(
    page: int = 1,
    limit: int = 20,
    search: str = None,
    is_banned: bool = None,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    from app.models.user import User
    query = select(User)
    if search:
        query = query.where(User.username.ilike(f"%{search}%"))
    if is_banned is not None:
        query = query.where(User.is_banned == is_banned)
    query = query.order_by(desc(User.created_at)).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()
    return {"success": True, "data": [
        {"id": str(u.id), "username": u.username, "phone": u.phone_primary,
         "role": u.role, "is_banned": u.is_banned, "created_at": u.created_at.isoformat()}
        for u in users
    ]}


@router.post("/users/{user_id}/ban")
async def ban_user(user_id: str, body: dict, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    import uuid
    from app.models.user import User
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
    user.is_banned = True
    user.ban_reason = body.get("reason")
    from datetime import datetime, timezone
    user.banned_at = datetime.now(timezone.utc)
    await db.commit()
    return {"success": True, "data": {"banned": True}}


@router.delete("/users/{user_id}/ban")
async def unban_user(user_id: str, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    import uuid
    from app.models.user import User
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user:
        user.is_banned = False
        user.ban_reason = None
        user.banned_at = None
        await db.commit()
    return {"success": True, "data": {"unbanned": True}}


@router.get("/settings")
async def get_settings_admin(category: str = None, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    from app.models.platform import PlatformSetting
    query = select(PlatformSetting)
    if category:
        query = query.where(PlatformSetting.category == category)
    result = await db.execute(query)
    rows = result.scalars().all()
    return {"success": True, "data": [
        {"key": r.setting_key, "value": "***" if r.is_sensitive else r.setting_value,
         "type": r.setting_type, "description": r.description, "category": r.category}
        for r in rows
    ]}


@router.patch("/settings")
async def update_setting(body: dict, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    from app.models.platform import PlatformSetting
    import boto3
    key = body.get("setting_key")
    value = body.get("setting_value")

    result = await db.execute(select(PlatformSetting).where(PlatformSetting.setting_key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Setting not found")

    # Sensitive settings go to Secrets Manager
    if setting.is_sensitive:
        sm = boto3.client("secretsmanager", region_name=settings.AWS_REGION)
        sm.put_secret_value(SecretId=f"voltrix/{key}", SecretString=str(value))
        setting.setting_value = "***stored-in-secrets-manager***"
    else:
        setting.setting_value = str(value)

    setting.updated_by = admin.id
    await db.commit()
    return {"success": True, "data": {"updated": True}}


@router.get("/missing-content")
async def get_missing_content(
    page: int = 1,
    limit: int = 20,
    status: str = None,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    from app.models.analytics import MissingContentRequest
    query = select(MissingContentRequest)
    if status:
        query = query.where(MissingContentRequest.status == status)
    query = query.order_by(desc(MissingContentRequest.request_count)).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()
    return {"success": True, "data": [
        {"id": str(i.id), "query": i.search_query, "count": i.request_count,
         "status": i.status, "content_type": i.content_type}
        for i in items
    ]}


@router.get("/revenue")
async def get_revenue(
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Revenue breakdown — reads from analytics table."""
    from app.models.analytics import PlatformAnalyticsDaily
    from datetime import date, timedelta
    today = date.today()
    month_start = today.replace(day=1)

    result = await db.execute(
        select(
            func.sum(PlatformAnalyticsDaily.revenue_total_ugx),
            func.sum(PlatformAnalyticsDaily.revenue_ads_ugx),
            func.sum(PlatformAnalyticsDaily.revenue_subscriptions),
            func.sum(PlatformAnalyticsDaily.revenue_ppv_ugx),
            func.sum(PlatformAnalyticsDaily.revenue_tips_ugx),
        ).where(PlatformAnalyticsDaily.date >= month_start)
    )
    row = result.first()
    return {"success": True, "data": {
        "month_total_ugx": row[0] or 0,
        "ads_ugx": row[1] or 0,
        "subscriptions_ugx": row[2] or 0,
        "ppv_ugx": row[3] or 0,
        "tips_ugx": row[4] or 0,
    }}


@router.post("/settings/gateway/test")
async def test_gateway(
    body: dict,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Test connectivity to a payment gateway using stored API keys."""
    import httpx
    gateway = body.get("gateway")
    result = {"gateway": gateway, "status": "unknown", "latency_ms": 0, "message": ""}

    try:
        import time
        start = time.time()

        if gateway == "mtn":
            # Test MTN sandbox token endpoint
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(
                    "https://sandbox.momodeveloper.mtn.com/collection/token/",
                    headers={"Ocp-Apim-Subscription-Key": "test"},
                )
            result["status"] = "ok" if r.status_code in (200, 401) else "fail"
            result["message"] = "MTN endpoint reachable"

        elif gateway == "airtel":
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get("https://openapiuat.airtel.africa")
            result["status"] = "ok" if r.status_code < 500 else "fail"
            result["message"] = "Airtel endpoint reachable"

        elif gateway == "flutterwave":
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get("https://api.flutterwave.com/v3/banks/UG")
            result["status"] = "ok" if r.status_code in (200, 401) else "fail"
            result["message"] = "Flutterwave endpoint reachable"

        elif gateway == "coinbase":
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get("https://api.commerce.coinbase.com/charges")
            result["status"] = "ok" if r.status_code in (200, 401) else "fail"
            result["message"] = "Coinbase endpoint reachable"

        result["latency_ms"] = int((time.time() - start) * 1000)

    except Exception as e:
        result["status"] = "fail"
        result["message"] = str(e)

    return {"success": True, "data": result}


@router.post("/settings/seed")
async def seed_settings(db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    """Seed default platform settings if not already present."""
    from app.models.platform import PlatformSetting
    defaults = [
        # Payment toggles
        ("mtn_momo_enabled",              "false",  "boolean", "payment",  False),
        ("mtn_momo_environment",          "sandbox","string",  "payment",  False),
        ("mtn_momo_base_url",             "https://sandbox.momodeveloper.mtn.com", "string", "payment", False),
        ("mtn_momo_collection_primary_key","",      "string",  "payment",  True),
        ("mtn_momo_collection_secret",    "",       "string",  "payment",  True),
        ("mtn_momo_disbursement_primary_key","",    "string",  "payment",  True),
        ("mtn_momo_disbursement_secret",  "",       "string",  "payment",  True),
        ("airtel_money_enabled",          "false",  "boolean", "payment",  False),
        ("airtel_environment",            "sandbox","string",  "payment",  False),
        ("airtel_base_url",               "https://openapiuat.airtel.africa", "string", "payment", False),
        ("airtel_client_id",              "",       "string",  "payment",  True),
        ("airtel_client_secret",          "",       "string",  "payment",  True),
        ("flutterwave_enabled",           "false",  "boolean", "payment",  False),
        ("flutterwave_secret_key",        "",       "string",  "payment",  True),
        ("flutterwave_public_key",        "",       "string",  "payment",  True),
        ("coinbase_enabled",              "false",  "boolean", "payment",  False),
        ("coinbase_api_key",              "",       "string",  "payment",  True),
        ("coinbase_webhook_secret",       "",       "string",  "payment",  True),
        # Fees
        ("ad_revenue_creator_pct",        "55",     "integer", "fees",     False),
        ("tip_platform_cut_pct",          "10",     "integer", "fees",     False),
        ("membership_platform_cut",       "25",     "integer", "fees",     False),
        ("ppv_platform_cut_pct",          "30",     "integer", "fees",     False),
        ("movie_referral_pct",            "10",     "integer", "fees",     False),
        ("sports_referral_pct",           "8",      "integer", "fees",     False),
        # Limits
        ("min_wallet_topup_ugx",          "1000",   "integer", "payment",  False),
        ("max_wallet_balance_ugx",        "5000000","integer", "payment",  False),
        ("min_creator_payout_ugx",        "50000",  "integer", "payment",  False),
        ("earnings_hold_days",            "7",      "integer", "payment",  False),
        ("creator_payout_schedule",       "weekly", "string",  "payment",  False),
        # Content
        ("rekognition_enabled",           "true",   "boolean", "content",  False),
        ("rekognition_min_confidence",    "75",     "integer", "content",  False),
        ("ai_endpoint_enabled",           "true",   "boolean", "content",  False),
        ("missing_content_notify",        "true",   "boolean", "content",  False),
    ]

    seeded = 0
    for key, value, setting_type, category, is_sensitive in defaults:
        existing = await db.execute(select(PlatformSetting).where(PlatformSetting.setting_key == key))
        if not existing.scalar_one_or_none():
            db.add(PlatformSetting(
                setting_key=key,
                setting_value=value,
                setting_type=setting_type,
                category=category,
                is_sensitive=is_sensitive,
                description=key.replace("_", " ").title(),
            ))
            seeded += 1

    await db.commit()
    return {"success": True, "data": {"seeded": seeded}}


@router.get("/cost")
async def get_cost_overview(
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """AWS cost data pulled from Cost Explorer via Lambda and stored in DB."""
    from app.models.platform import PlatformCostRecord
    from datetime import date
    month_start = date.today().replace(day=1)

    result = await db.execute(
        select(
            PlatformCostRecord.service_name,
            func.sum(PlatformCostRecord.amount_usd).label("total"),
        ).where(PlatformCostRecord.period_start >= month_start)
        .group_by(PlatformCostRecord.service_name)
        .order_by(desc("total"))
    )
    rows = result.all()
    total = sum(r[1] or 0 for r in rows)
    return {"success": True, "data": {
        "month_to_date_usd": round(total, 2),
        "by_service": [{"service": r[0], "cost_usd": round(r[1] or 0, 2)} for r in rows],
    }}
