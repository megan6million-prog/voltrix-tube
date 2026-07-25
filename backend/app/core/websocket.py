"""
WebSocket manager for real-time events.
Handles: live chat, messaging, notifications, presence.
Uses Redis to store connection state across ECS tasks.
"""
import json
import asyncio
import structlog
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect

logger = structlog.get_logger()


class ConnectionManager:
    """
    In-memory WebSocket manager.
    In production, connection IDs are also stored in Redis
    so any ECS task can send to any user.
    """

    def __init__(self):
        # user_id -> set of WebSocket connections (multiple devices)
        self.active: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active:
            self.active[user_id] = set()
        self.active[user_id].add(websocket)
        logger.info("ws.connected", user_id=user_id, total=len(self.active))

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active:
            self.active[user_id].discard(websocket)
            if not self.active[user_id]:
                del self.active[user_id]
        logger.info("ws.disconnected", user_id=user_id)

    async def send_to_user(self, user_id: str, event: str, data: dict):
        """Send an event to all connections for a user."""
        if user_id not in self.active:
            return
        message = json.dumps({"event": event, "data": data})
        dead = set()
        for ws in self.active[user_id].copy():
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.active[user_id].discard(ws)

    async def broadcast_to_stream(self, stream_id: str, event: str, data: dict):
        """Broadcast to all users watching a stream (stored in stream_viewers)."""
        # In production this reads from Redis stream_viewers:{stream_id}
        message = json.dumps({"event": event, "data": data})
        for user_id, connections in list(self.active.items()):
            for ws in connections.copy():
                try:
                    await ws.send_text(message)
                except Exception:
                    pass

    def is_online(self, user_id: str) -> bool:
        return user_id in self.active and len(self.active[user_id]) > 0

    def online_count(self) -> int:
        return len(self.active)


# Singleton instance
ws_manager = ConnectionManager()
