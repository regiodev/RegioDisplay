# Cale: main.py

from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import engine
from .routers import auth_router, users_router, media_router, playlist_router, screen_router, client_router, admin_router
from .connection_manager import manager

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Digital Signage Management API",
    description="Backend-ul pentru sistemul de management de conținut media.",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://display.regio-cloud.ro",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

# Includem toate routerele HTTP
api_router.include_router(auth_router.router)
api_router.include_router(users_router.router)
api_router.include_router(media_router.router)
api_router.include_router(playlist_router.router)
api_router.include_router(screen_router.router)
api_router.include_router(client_router.router)
api_router.include_router(admin_router.router)


# --- ENDPOINT-UL WEBSOCKET DEFINIT DIRECT AICI ---
@api_router.websocket("/ws/connect/{screen_key}")
async def websocket_endpoint(websocket: WebSocket, screen_key: str):
    """
    Acceptă necondiționat conexiunea WebSocket și o adaugă în manager.
    """
    await manager.connect(websocket, screen_key)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(screen_key)
# --- SFÂRȘIT BLOC WEBSOCKET ---


app.include_router(api_router)


@app.get("/", tags=["Root"])
def read_root():
    """Endpoint de test pentru a verifica dacă API-ul este funcțional."""
    return {"message": "Bun venit la Signage Management API! Documentația este la /api/docs"}
