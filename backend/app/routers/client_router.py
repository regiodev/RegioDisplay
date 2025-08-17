# Cale fișier: app/routers/client_router.py

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Response, status
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone

from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/client",
    tags=["Sincronizare Player"]
)

@router.post("/register", status_code=201)
def register_client(
    payload: schemas.ScreenRegister,
    db: Session = Depends(get_db)
):
    existing_screen = db.query(models.Screen).filter(models.Screen.unique_key == payload.unique_key).first()
    if existing_screen:
        existing_screen.pairing_code = payload.pairing_code.upper()
        db.commit()
        return {"detail": "Ecran înregistrat din nou cu succes."}

    existing_pairing_code = db.query(models.Screen).filter(models.Screen.pairing_code == payload.pairing_code.upper()).first()
    if existing_pairing_code:
        raise HTTPException(status_code=409, detail="Codul de împerechere este deja în uz. Vă rugăm reporniți aplicația pe TV pentru a genera un cod nou.")

    new_screen = models.Screen(
        unique_key=payload.unique_key,
        pairing_code=payload.pairing_code.upper(),
        is_active=False
    )
    db.add(new_screen)
    db.commit()
    db.refresh(new_screen)
    return {"detail": "Ecran înregistrat cu succes, se așteaptă împerecherea."}


@router.get("/sync", response_model=schemas.ClientPlaylistResponse)
def sync_client_playlist(
    response: Response,
    x_screen_key: str = Header(..., description="Cheia unică a player-ului TV"),
    x_playlist_version: Optional[str] = Header(None, description="Versiunea de playlist aflată în cache-ul player-ului"),
    db: Session = Depends(get_db)
):
    screen = (
        db.query(models.Screen)
        .options(joinedload(models.Screen.assigned_playlist).joinedload(models.Playlist.items).joinedload(models.PlaylistItem.media_file))
        .filter(models.Screen.unique_key == x_screen_key)
        .first()
    )

    if not screen:
        raise HTTPException(status_code=404, detail="Ecran neînregistrat")

    if not screen.is_active:
        return schemas.ClientPlaylistResponse(
            id=0, name="Ecran Neactivat", items=[], playlist_version="none",
            screen_name=screen.name, rotation=screen.rotation, rotation_updated_at=screen.rotation_updated_at
        )
    
    screen.last_seen = datetime.now(timezone.utc)
    db.commit()

    if not screen.assigned_playlist:
        return schemas.ClientPlaylistResponse(
            id=0, name="Niciun Playlist Asignat", items=[], playlist_version="none",
            screen_name=screen.name, rotation=screen.rotation, rotation_updated_at=screen.rotation_updated_at
        )
    
    playlist = screen.assigned_playlist

    # --- AICI ESTE MODIFICAREA CHEIE ---
    # Am eliminat condiția "if playlist.playlist_version != x_playlist_version:".
    # Acum, lista de itemi media este construită la fiecare apel de sincronizare.
    client_items = []
    for item in sorted(playlist.items, key=lambda x: x.order):
        media_file = item.media_file
        media_url = f"https://display.regio-cloud.ro/api/media/serve/{media_file.id}"
        client_item = schemas.ClientPlaylistItem(url=media_url, type=media_file.type, duration=item.duration)
        client_items.append(client_item)
    # --- FINAL MODIFICARE ---

    return schemas.ClientPlaylistResponse(
        id=playlist.id, name=playlist.name, items=client_items,
        playlist_version=playlist.playlist_version, screen_name=screen.name,
        rotation=screen.rotation, rotation_updated_at=screen.rotation_updated_at
    )


@router.post("/report_rotation", status_code=status.HTTP_200_OK)
def report_rotation_from_client(
    payload: schemas.ClientRotationUpdate,
    x_screen_key: str = Header(...),
    db: Session = Depends(get_db)
):
    screen = db.query(models.Screen).filter(models.Screen.unique_key == x_screen_key).first()
    if not screen or not screen.is_active:
        raise HTTPException(status_code=404, detail="Screen not found or inactive")

    if payload.timestamp > screen.rotation_updated_at:
        if payload.rotation not in [0, 90, 180, 270]:
             raise HTTPException(status_code=400, detail="Invalid rotation value.")
        
        screen.rotation = payload.rotation
        screen.rotation_updated_at = payload.timestamp
        db.commit()
        return {"detail": "Rotation updated successfully."}

    return {"detail": "Server has a newer or identical rotation value. No update performed."}
