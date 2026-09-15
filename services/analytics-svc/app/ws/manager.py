import logging
from typing import List

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.connections: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)
        logger.info(f"WebSocket connected. Total connections: {len(self.connections)}")

    def disconnect(self, ws: WebSocket):
        if ws in self.connections:
            self.connections.remove(ws)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.connections)}")

    async def broadcast(self, data: dict):
        """Send JSON to all connected clients, drop dead connections."""
        dead = []
        for ws in self.connections:
            try:
                await ws.send_json(data)
            except Exception as exc:
                logger.warning(f"Failed to send to WebSocket client: {exc}")
                dead.append(ws)
        for ws in dead:
            if ws in self.connections:
                self.connections.remove(ws)


manager = ConnectionManager()
