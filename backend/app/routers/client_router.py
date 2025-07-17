from typing import List
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/client",
    tags=["Client Sync"]
)

@router.get("/sync/", response_model=schemas.ClientPlaylistResponse)
def sync_client_playlist(
    x_screen_key: str = Header(...),
    db: Session = Depends(get_db)
):
    """
    Endpoint folosit de clientul TV pentru a-și sincroniza playlist-ul.
    Se autentifică folosind cheia unică a ecranului trimisă în header.
    """
    # 1. Găsește ecranul pe baza cheii unice
    screen = (
        db.query(models.Screen)
        .options(joinedload(models.Screen.assigned_playlist).joinedload(models.Playlist.items).joinedload(models.PlaylistItem.media_file))
        .filter(models.Screen.unique_key == x_screen_key)
        .first()
    )

    if not screen:
        raise HTTPException(status_code=404, detail="Screen not registered")

    # 2. Verifică dacă are un playlist asignat
    if not screen.assigned_playlist:
        # Dacă nu are playlist, returnează un răspuns gol dar valid
        return schemas.ClientPlaylistResponse(name="No Playlist Assigned", items=[])

    # 3. Construiește răspunsul în formatul cerut de client
    playlist = screen.assigned_playlist
    client_items = []
    for item in sorted(playlist.items, key=lambda x: x.order):
        media_file = item.media_file
        # Construiește URL-ul complet
        media_url = f"http://display.regio-cloud.ro/media/serve/{media_file.id}"
        
        client_item = schemas.ClientPlaylistItem(
            url=media_url,
            type=media_file.type,
            duration=item.duration
        )
        client_items.append(client_item)

    return schemas.ClientPlaylistResponse(name=playlist.name, items=client_items)
