# Cale: app/connection_manager.py

from fastapi import WebSocket
from typing import Dict, List, Tuple
import asyncio
from datetime import datetime, timezone # Am adăugat timezone

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Tuple[WebSocket, datetime]] = {}

    async def connect(self, websocket: WebSocket, screen_key: str):
        await websocket.accept()
        # --- MODIFICARE: Folosim datetime.now(timezone.utc) ---
        self.active_connections[screen_key] = (websocket, datetime.now(timezone.utc))

    def disconnect(self, screen_key: str):
        if screen_key in self.active_connections:
            del self.active_connections[screen_key]

    async def send_to_screen(self, message: str, screen_key: str):
        if screen_key in self.active_connections:
            websocket, _ = self.active_connections[screen_key]
            await websocket.send_text(message)

    async def broadcast_to_user_screens(self, message: str, user_id: int, db_session):
        from . import models
        
        user_screens = db_session.query(models.Screen).filter(models.Screen.created_by_id == user_id).all()
        tasks = []
        for screen in user_screens:
            if screen.unique_key in self.active_connections:
                websocket, _ = self.active_connections[screen.unique_key]
                tasks.append(websocket.send_text(message))
        
        if tasks:
            await asyncio.gather(*tasks)

manager = ConnectionManager()
