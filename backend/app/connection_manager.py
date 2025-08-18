# Cale: app/connection_manager.py

from fastapi import WebSocket
from typing import Dict, List, Tuple
import asyncio
from datetime import datetime, timezone # Am adăugat timezone

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Tuple[WebSocket, datetime]] = {}
        self.user_connections: Dict[int, List[WebSocket]] = {}  # user_id -> lista WebSocket-uri pentru progress updates

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
    
    async def connect_user_progress(self, websocket: WebSocket, user_id: int):
        """Conectează un WebSocket pentru progress updates pentru un utilizator"""
        await websocket.accept()
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)
    
    def disconnect_user_progress(self, websocket: WebSocket, user_id: int):
        """Deconectează WebSocket-ul de progress pentru un utilizator"""
        if user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
    
    async def send_progress_update(self, user_id: int, media_file_data: dict):
        """Trimite update de progress către toate conexiunile unui utilizator"""
        if user_id in self.user_connections:
            message = {
                "type": "media_progress",
                "data": media_file_data
            }
            tasks = []
            for websocket in self.user_connections[user_id].copy():  # copy pentru thread safety
                try:
                    tasks.append(websocket.send_json(message))
                except Exception:
                    # Conexiunea s-a închis, o eliminăm
                    self.user_connections[user_id].remove(websocket)
            
            if tasks:
                try:
                    await asyncio.gather(*tasks, return_exceptions=True)
                except Exception as e:
                    print(f"Eroare la trimiterea progress update pentru user {user_id}: {e}")

manager = ConnectionManager()
