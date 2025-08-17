# Cale: routers/playlist_router.py

import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db, SessionLocal
from ..connection_manager import manager

router = APIRouter(
    prefix="/playlists",
    tags=["Playlists"]
)

@router.post("/", response_model=schemas.PlaylistPublic, status_code=201)
async def create_playlist(
    playlist: schemas.PlaylistCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_playlist = models.Playlist(
        name=playlist.name,
        schedule_start=playlist.schedule_start,
        schedule_end=playlist.schedule_end,
        created_by_id=current_user.id,
        playlist_version=str(uuid.uuid4())
    )
    db.add(db_playlist)

    for item_data in playlist.items:
        media_file = db.query(models.MediaFile).filter(
            models.MediaFile.id == item_data.mediafile_id,
            models.MediaFile.uploaded_by_id == current_user.id
        ).first()
        if not media_file:
            raise HTTPException(
                status_code=404, 
                detail=f"Media file with id {item_data.mediafile_id} not found or does not belong to you."
            )

        db_item = models.PlaylistItem(
            playlist=db_playlist,
            mediafile_id=item_data.mediafile_id,
            order=item_data.order,
            duration=item_data.duration
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_playlist)
    
    db_session_for_ws = SessionLocal()
    try:
        await manager.broadcast_to_user_screens("playlist_updated", current_user.id, db_session_for_ws)
    finally:
        db_session_for_ws.close()
    
    return db_playlist

@router.get("/", response_model=List[schemas.PlaylistPublic])
def get_playlists(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    playlists = db.query(models.Playlist).filter(
        models.Playlist.created_by_id == current_user.id
    ).offset(skip).limit(limit).all()
    return playlists

@router.get("/{playlist_id}", response_model=schemas.PlaylistPublic)
def get_playlist(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_playlist = db.query(models.Playlist).filter(
        models.Playlist.id == playlist_id,
        models.Playlist.created_by_id == current_user.id
    ).first()

    if db_playlist is None:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return db_playlist

# --- AICI ESTE FUNCȚIA MODIFICATĂ ---
@router.delete("/{playlist_id}", status_code=204)
async def delete_playlist(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_playlist = db.query(models.Playlist).filter(
        models.Playlist.id == playlist_id,
        models.Playlist.created_by_id == current_user.id
    ).first()

    if db_playlist is None:
        raise HTTPException(status_code=404, detail="Playlist not found")

    # --- BLOC NOU: Verificăm dacă playlist-ul este asignat vreunui ecran ---
    screens_using_playlist = db.query(models.Screen).filter(
        models.Screen.assigned_playlist_id == playlist_id
    ).all()

    if screens_using_playlist:
        screen_names = [screen.name for screen in screens_using_playlist]
        raise HTTPException(
            status_code=409, # Codul 409 'Conflict' este potrivit aici
            detail=f"Cannot delete playlist. It is currently assigned to the following screen(s): {', '.join(screen_names)}."
        )
    # --- FINAL BLOC NOU ---

    # Logica de dezasignare automată a fost eliminată.
    # Ștergerea are loc doar dacă verificarea de mai sus trece.
    db.delete(db_playlist)
    db.commit()
    
    db_session_for_ws = SessionLocal()
    try:
        await manager.broadcast_to_user_screens("playlist_updated", current_user.id, db_session_for_ws)
    finally:
        db_session_for_ws.close()

@router.put("/{playlist_id}", response_model=schemas.PlaylistPublic)
async def update_playlist(
    playlist_id: int,
    playlist_data: schemas.PlaylistCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_playlist = db.query(models.Playlist).filter(
        models.Playlist.id == playlist_id,
        models.Playlist.created_by_id == current_user.id
    ).first()
    
    if not db_playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    db_playlist.name = playlist_data.name
    db_playlist.playlist_version = str(uuid.uuid4())
    
    db.query(models.PlaylistItem).filter(models.PlaylistItem.playlist_id == playlist_id).delete()

    for item_data in playlist_data.items:
        media_file = db.query(models.MediaFile).filter(
            models.MediaFile.id == item_data.mediafile_id,
            models.MediaFile.uploaded_by_id == current_user.id
        ).first()
        if not media_file:
            raise HTTPException(
                status_code=404,
                detail=f"Media file with id {item_data.mediafile_id} not found or does not belong to you."
            )

        db_item = models.PlaylistItem(
            playlist_id=playlist_id,
            mediafile_id=item_data.mediafile_id,
            order=item_data.order,
            duration=item_data.duration
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_playlist)
    
    db_session_for_ws = SessionLocal()
    try:
        await manager.broadcast_to_user_screens("playlist_updated", current_user.id, db_session_for_ws)
    finally:
        db_session_for_ws.close()
    
    return db_playlist
