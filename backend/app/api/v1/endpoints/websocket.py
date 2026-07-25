from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError
import json
import structlog

from app.core.config import get_settings
from app.core.websocket import ws_manager

settings = get_settings()
router = APIRouter()
logger = structlog.get_logger()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    """
    Main WebSocket endpoint.
    Client connects with: ws://api/ws?token=<access_token>

    Incoming events from client:
      { "action": "subscribe_stream",   "data": { "stream_id": "..." } }
      { "action": "subscribe_chat",     "data": { "conversation_id": "..." } }
      { "action": "typing_start",       "data": { "conversation_id": "..." } }
      { "action": "presence_ping" }

    Outgoing events to client:
      { "event": "notification",        "data": { ... } }
      { "event": "new_message",         "data": { ... } }
      { "event": "stream_chat_message", "data": { ... } }
      { "event": "wallet_credited",     "data": { "amount": ..., "new_balance": ... } }
      { "event": "earning_credited",    "data": { ... } }
      { "event": "viewer_count",        "data": { "stream_id": ..., "count": ... } }
      { "event": "presence_update",     "data": { "user_id": ..., "status": ... } }
    """
    # Authenticate token
    user_id = None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
    except JWTError:
        await websocket.close(code=4001, reason="Invalid token")
        return

    if not user_id:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await ws_manager.connect(websocket, user_id)

    # Send welcome message
    await websocket.send_text(json.dumps({
        "event": "connected",
        "data": {
            "user_id": user_id,
            "online_count": ws_manager.online_count(),
        }
    }))

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
                action = msg.get("action")
                data = msg.get("data", {})

                if action == "presence_ping":
                    await websocket.send_text(json.dumps({
                        "event": "presence_pong",
                        "data": {"online_count": ws_manager.online_count()}
                    }))

                elif action == "typing_start":
                    # Broadcast typing indicator to conversation members
                    # In full impl: look up conversation members and notify them
                    pass

                elif action == "subscribe_stream":
                    # Mark user as watching this stream (Redis in production)
                    await websocket.send_text(json.dumps({
                        "event": "stream_subscribed",
                        "data": {"stream_id": data.get("stream_id")}
                    }))

                elif action == "watch_party_sync":
                    # Relay sync event to other party members
                    pass

            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id)
        logger.info("ws.client.disconnected", user_id=user_id)
