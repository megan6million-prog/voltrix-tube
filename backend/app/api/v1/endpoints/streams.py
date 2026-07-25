from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.security import get_current_user

router = APIRouter()

@router.post("")
async def create_stream(body: dict, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    import boto3
    from app.core.config import get_settings
    from app.models.livestream import Livestream
    settings = get_settings()
    ivs = boto3.client("ivs", region_name=settings.IVS_REGION)

    # Create IVS channel
    response = ivs.create_channel(
        name=f"voltrix-{user.id}",
        type="STANDARD",
        latencyMode="LOW",
    )
    channel_data = response["channel"]
    stream_key = response["streamKey"]["value"]

    from app.models.channel import Channel
    from sqlalchemy import select
    ch_result = await db.execute(select(Channel).where(Channel.user_id == user.id))
    channel = ch_result.scalar_one_or_none()

    stream = Livestream(
        channel_id=channel.id if channel else None,
        title=body.get("title", "Live Stream"),
        description=body.get("description"),
        stream_type=body.get("stream_type", "regular"),
        ivs_channel_arn=channel_data["arn"],
        ivs_stream_key=stream_key,
        ivs_playback_url=channel_data["playbackUrl"],
        status="scheduled",
        ppv_price_ugx=body.get("ppv_price_ugx"),
    )
    db.add(stream)
    await db.commit()

    return {"success": True, "data": {
        "stream_id": str(stream.id),
        "stream_key": stream_key,
        "rtmp_endpoint": channel_data["ingestEndpoint"],
        "playback_url": channel_data["playbackUrl"],
    }}

@router.get("/live")
async def get_live_streams(
    category: str = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.livestream import Livestream
    query = select(Livestream).where(Livestream.status == "live")
    if category:
        query = query.where(Livestream.stream_type == category)
    query = query.order_by(Livestream.peak_viewers.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    streams = result.scalars().all()
    return {"success": True, "data": [
        {"id": str(s.id), "title": s.title, "playback_url": s.ivs_playback_url,
         "viewer_count": s.total_viewers, "stream_type": s.stream_type}
        for s in streams
    ]}

@router.get("/{stream_id}")
async def get_stream(stream_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    import uuid
    from app.models.livestream import Livestream
    result = await db.execute(select(Livestream).where(Livestream.id == uuid.UUID(stream_id)))
    stream = result.scalar_one_or_none()
    if not stream:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Stream not found")
    return {"success": True, "data": {
        "id": str(stream.id), "title": stream.title,
        "playback_url": stream.ivs_playback_url,
        "status": stream.status,
        "ppv_price_ugx": stream.ppv_price_ugx,
    }}

@router.post("/{stream_id}/start")
async def start_stream(stream_id: str, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    from sqlalchemy import select
    import uuid
    from app.models.livestream import Livestream
    from datetime import datetime, timezone
    result = await db.execute(select(Livestream).where(Livestream.id == uuid.UUID(stream_id)))
    stream = result.scalar_one_or_none()
    if stream:
        stream.status = "live"
        stream.started_at = datetime.now(timezone.utc)
        await db.commit()
    return {"success": True, "data": {"stream_key": stream.ivs_stream_key if stream else None}}

@router.post("/{stream_id}/end")
async def end_stream(stream_id: str, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    from sqlalchemy import select
    import uuid
    from app.models.livestream import Livestream
    from datetime import datetime, timezone
    result = await db.execute(select(Livestream).where(Livestream.id == uuid.UUID(stream_id)))
    stream = result.scalar_one_or_none()
    if stream:
        stream.status = "ended"
        stream.ended_at = datetime.now(timezone.utc)
        await db.commit()
    return {"success": True, "data": {"message": "Stream ended"}}
