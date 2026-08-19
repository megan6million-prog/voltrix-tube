from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, channels, content, wallet, payments, streams, search, notifications, admin, websocket, collections, sounds, media

api_router = APIRouter()

api_router.include_router(auth.router,          prefix="/auth",          tags=["auth"])
api_router.include_router(users.router,         prefix="/users",         tags=["users"])
api_router.include_router(channels.router,      prefix="/channels",      tags=["channels"])
api_router.include_router(content.router,       prefix="/content",       tags=["content"])
api_router.include_router(wallet.router,        prefix="/wallet",        tags=["wallet"])
api_router.include_router(payments.router,      prefix="/webhooks",      tags=["webhooks"])
api_router.include_router(streams.router,       prefix="/streams",       tags=["streams"])
api_router.include_router(search.router,        prefix="/search",        tags=["search"])
api_router.include_router(notifications.router, prefix="/notifications",  tags=["notifications"])
api_router.include_router(admin.router,         prefix="/admin",         tags=["admin"])
api_router.include_router(collections.router,   prefix="/collections",   tags=["collections"])
api_router.include_router(sounds.router,        prefix="/sounds",        tags=["sounds"])
api_router.include_router(media.router,         prefix="/media",         tags=["media"])
api_router.include_router(websocket.router,                              tags=["websocket"])
