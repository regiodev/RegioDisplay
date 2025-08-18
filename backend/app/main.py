# Cale: main.py

import asyncio
import json
import os
from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from datetime import datetime, timezone

from . import models
from .database import engine, SessionLocal
from .routers import auth_router, users_router, media_router, playlist_router, screen_router, client_router, admin_router, dashboard_router, reports_router
from .connection_manager import manager
from .routers.media_router import set_main_event_loop


models.Base.metadata.create_all(bind=engine)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    set_main_event_loop()
    yield
    # Shutdown (dacă este necesar)

app = FastAPI(
    title="Digital Signage Management API",
    description="Backend-ul pentru sistemul de management de conținut media.",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# --- MODIFICARE FINALĂ: Căi absolute și diagnosticare ---
# Folosim direct calea absolută pe care ai confirmat-o.
STATIC_DIRECTORY = "/srv/signage-app/backend/app/static"
THUMBNAIL_DIRECTORY = "/srv/signage-app/media_files/thumbnails"

# --- BLOC DE DIAGNOSTICARE LA PORNIREA SERVERULUI ---
# Aceste mesaje vor apărea în log-urile `uvicorn` și ne vor ajuta.
print("====================== DIAGNOSTICARE FIȘIERE STATICE ======================")
logo_path = os.path.join(STATIC_DIRECTORY, "logo.png")
print(f"INFO: Calea completă pentru logo este: {logo_path}")

if not os.path.isdir(STATIC_DIRECTORY):
    print(f"EROARE: Directorul static specificat NU ESTE UN DIRECTOR VALID: {STATIC_DIRECTORY}")
elif not os.path.exists(logo_path):
    print(f"EROARE: Fișierul logo.png NU A FOST GĂSIT la calea specificată.")
elif not os.access(logo_path, os.R_OK):
    print(f"EROARE DE PERMISIUNI: Serverul NU POATE CITI fișierul logo.png. Verificați permisiunile (chmod).")
else:
    print("SUCCES: Directorul static și fișierul logo.png sunt valide și pot fi citite.")
print("=========================================================================")


# Montăm directoarele statice
app.mount("/static", StaticFiles(directory=STATIC_DIRECTORY), name="static")
app.mount("/api/media/thumbnails", StaticFiles(directory=THUMBNAIL_DIRECTORY), name="thumbnails")
# --- SFÂRȘIT MODIFICARE ---


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

api_router.include_router(auth_router.router)
api_router.include_router(users_router.router)
api_router.include_router(media_router.router)
api_router.include_router(playlist_router.router)
api_router.include_router(screen_router.router)
api_router.include_router(client_router.router)
api_router.include_router(admin_router.router)
api_router.include_router(dashboard_router.router)
api_router.include_router(reports_router.router)

async def keep_alive(websocket: WebSocket):
    while True:
        await asyncio.sleep(15)
        try:
            await websocket.send_json({"type": "ping"})
        except (WebSocketDisconnect, ConnectionResetError):
            break
        except Exception:
            break

@api_router.websocket("/ws/connect/{screen_key}")
async def websocket_endpoint(websocket: WebSocket, screen_key: str):
    await manager.connect(websocket, screen_key)
    
    db = SessionLocal()
    try:
        screen = db.query(models.Screen).filter(models.Screen.unique_key == screen_key).first()
        if screen:
            screen.last_seen = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()
    
    keep_alive_task = asyncio.create_task(keep_alive(websocket))
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                msg_type = message.get("type")

                if msg_type == "device_info":
                    db = SessionLocal()
                    try:
                        screen_to_update = db.query(models.Screen).filter(models.Screen.unique_key == screen_key).first()
                        if screen_to_update:
                            screen_to_update.player_version = message.get("version")
                            screen_to_update.screen_resolution = message.get("resolution")
                            db.commit()
                            print(f"INFO: S-au primit datele pentru ecranul {screen_key}: v{message.get('version')}, res {message.get('resolution')}")
                    finally:
                        db.close()

            except json.JSONDecodeError:
                pass
            except Exception as e:
                print(f"EROARE la procesarea mesajului WebSocket: {e}")

    except WebSocketDisconnect:
        manager.disconnect(screen_key)
    finally:
        keep_alive_task.cancel()

app.include_router(api_router)

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Bun venit la Signage Management API! Documentația este la /api/docs"}
