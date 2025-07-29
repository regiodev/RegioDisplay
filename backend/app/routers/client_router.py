from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Response
from sqlalchemy.orm import Session, joinedload
from datetime import datetime

from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/client",
    tags=["Client Sync"]
)

@router.post("/register", status_code=201)
def register_client(
    payload: schemas.ScreenRegister,
    db: Session = Depends(get_db)
):

    # --- LOGGING PENTRU DEPANARE ---
    print("--- CERERE DE ÎNREGISTRARE PLAYER PRIMITĂ ---")
    print(f"  Unique Key: {payload.unique_key}")
    print(f"  Pairing Code: {payload.pairing_code}")
    # --- SFÂRȘIT LOGGING ---

    """
    Endpoint folosit de un player nou pentru a se auto-înregistra în sistem.
    Creează o intrare de ecran inactivă, în așteptarea revendicării de către un admin.
    """
    # Verificăm dacă nu cumva există deja un ecran cu această cheie unică
    existing_screen = db.query(models.Screen).filter(models.Screen.unique_key == payload.unique_key).first()
    if existing_screen:
        # Dacă există deja, doar ne asigurăm că are codul de împerechere corect.
        # Acest lucru gestionează cazul în care aplicația este reinstalată.
        existing_screen.pairing_code = payload.pairing_code
        db.commit()

        print("--- ÎNREGISTRARE FINALIZATĂ (RE-ÎNREGISTRARE) ---")

        return {"detail": "Screen re-registered successfully."}

    # Verificăm dacă codul de împerechere nu este deja folosit
    existing_pairing_code = db.query(models.Screen).filter(models.Screen.pairing_code == payload.pairing_code).first()
    if existing_pairing_code:

        print(f"  EROARE: Codul de împerechere {payload.pairing_code} este deja în uz.")

        raise HTTPException(status_code=409, detail="Pairing code already in use. Please restart the app on the TV to generate a new one.")

    # Creăm noul ecran, care este inactiv by default
    new_screen = models.Screen(
        unique_key=payload.unique_key,
        pairing_code=payload.pairing_code,
        is_active=False # Important: ecranul nu este încă activ
    )
    db.add(new_screen)
    db.commit()
    db.refresh(new_screen)

    print("  STATUS: S-a creat un nou ecran inactiv în baza de date.")
    print("--- ÎNREGISTRARE FINALIZATĂ (SUCCES) ---")

    return {"detail": "Screen registered successfully, waiting for pairing."}

@router.get("/sync", response_model=schemas.ClientPlaylistResponse)
def sync_client_playlist(
    response: Response,
    x_screen_key: str = Header(...),
    x_playlist_version: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    screen = (
        db.query(models.Screen)
        .options(joinedload(models.Screen.assigned_playlist).joinedload(models.Playlist.items).joinedload(models.PlaylistItem.media_file))
        .filter(models.Screen.unique_key == x_screen_key)
        .first()
    )

    if not screen:
        raise HTTPException(status_code=404, detail="Screen not registered")

    if not screen.is_active:
        return schemas.ClientPlaylistResponse(
            name="Screen Not Activated", 
            items=[], 
            playlist_version="none",
            # --- MODIFICARE AICI: Trimitem și numele ecranului, dacă există ---
            screen_name=screen.name
        )

    screen.last_seen = datetime.utcnow()
    db.commit()

    if not screen.assigned_playlist:
        return schemas.ClientPlaylistResponse(
            name="No Playlist Assigned", 
            items=[], 
            playlist_version="none",
            screen_name=screen.name
        )
    
    playlist = screen.assigned_playlist

    if playlist.playlist_version == x_playlist_version:
        response.status_code = 304
        return response

    client_items = []
    for item in sorted(playlist.items, key=lambda x: x.order):
        media_file = item.media_file
        media_url = f"https://display.regio-cloud.ro/api/media/serve/{media_file.id}"
        client_item = schemas.ClientPlaylistItem(
            url=media_url,
            type=media_file.type,
            duration=item.duration
        )
        client_items.append(client_item)

    return schemas.ClientPlaylistResponse(
        name=playlist.name, 
        items=client_items,
        playlist_version=playlist.playlist_version,
        screen_name=screen.name
    )
