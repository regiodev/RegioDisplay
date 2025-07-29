# Cale: connection_manager.py

from fastapi import WebSocket
from typing import Dict, List
import asyncio

class ConnectionManager:
    def __init__(self):
        # Stocăm conexiunea folosind screen_key (string) ca și cheie unică
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, screen_key: str):
        await websocket.accept()
        self.active_connections[screen_key] = websocket

    def disconnect(self, screen_key: str):
        if screen_key in self.active_connections:
            del self.active_connections[screen_key]

    async def send_to_screen(self, message: str, screen_key: str):
        """Trimite un mesaj direct către un ecran specific."""
        if screen_key in self.active_connections:
            websocket = self.active_connections[screen_key]
            await websocket.send_text(message)

    async def broadcast_to_user_screens(self, message: str, user_id: int, db_session):
        """Trimite un mesaj tuturor ecranelor active ale unui utilizator."""
        from . import models # Import local pentru a evita dependențe circulare
        
        user_screens = db_session.query(models.Screen).filter(models.Screen.created_by_id == user_id).all()
        tasks = []
        for screen in user_screens:
            if screen.unique_key in self.active_connections:
                websocket = self.active_connections[screen.unique_key]
                tasks.append(websocket.send_text(message))
        
        if tasks:
            await asyncio.gather(*tasks)

manager = ConnectionManager()
