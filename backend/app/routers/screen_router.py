# Cale: routers/screen_router.py

import asyncio
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone # Am adăugat timezone

from .. import models, schemas, auth
from ..database import get_db, SessionLocal
from ..connection_manager import manager

router = APIRouter(
    prefix="/screens",
    tags=["Screens"]
)

@router.post("/pair", response_model=schemas.ScreenPublic)
async def pair_screen(
    payload: schemas.ScreenPair,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    screen_to_pair = db.query(models.Screen).filter(
        models.Screen.pairing_code == payload.pairing_code.upper()
    ).first()

    if not screen_to_pair:
        raise HTTPException(status_code=404, detail="Screen with this pairing code not found.")

    if screen_to_pair.is_active:
        raise HTTPException(status_code=400, detail="This screen has already been paired.")

    db.query(models.Screen).filter(models.Screen.id == screen_to_pair.id).update({
        models.Screen.name: payload.name,
        models.Screen.location: payload.location,
        models.Screen.is_active: True,
        models.Screen.created_by_id: current_user.id,
        models.Screen.pairing_code: None
    })
    db.commit()
    db.refresh(screen_to_pair)
    
    await manager.send_to_screen("playlist_updated", screen_to_pair.unique_key)
    
    return screen_to_pair

@router.post("/{screen_id}/assign_playlist", response_model=schemas.ScreenPublic)
async def assign_playlist_to_screen(
    screen_id: int,
    assignment: schemas.PlaylistAssign,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_screen = db.query(models.Screen).filter(
        models.Screen.id == screen_id,
        models.Screen.created_by_id == current_user.id
    ).first()
    
    if not db_screen:
        raise HTTPException(status_code=404, detail="Screen not found")

    if assignment.playlist_id is None:
        db_screen.assigned_playlist_id = None
    else:
        db_playlist = db.query(models.Playlist).filter(
            models.Playlist.id == assignment.playlist_id,
            models.Playlist.created_by_id == current_user.id
        ).first()
        if not db_playlist:
            raise HTTPException(status_code=404, detail="Playlist not found")
        db_screen.assigned_playlist_id = assignment.playlist_id

    db.commit()
    db.refresh(db_screen)

    await manager.send_to_screen("playlist_updated", db_screen.unique_key)
    
    return db_screen

# --- ENDPOINT NOU ADĂUGAT ---
@router.put("/{screen_id}/rotation", response_model=schemas.ScreenPublic)
async def set_screen_rotation(
    screen_id: int,
    payload: schemas.ScreenRotationUpdateWeb,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_screen = db.query(models.Screen).filter(
        models.Screen.id == screen_id,
        models.Screen.created_by_id == current_user.id
    ).first()
    
    if not db_screen:
        raise HTTPException(status_code=404, detail="Screen not found")

    if payload.rotation not in [0, 90, 180, 270]:
        raise HTTPException(status_code=400, detail="Invalid rotation value. Must be 0, 90, 180, or 270.")

    db_screen.rotation = payload.rotation
    db_screen.rotation_updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_screen)

    await manager.send_to_screen("playlist_updated", db_screen.unique_key)
    
    return db_screen
# --- FINAL ENDPOINT NOU ---

@router.get("/{screen_id}", response_model=schemas.ScreenPublic)
def get_screen(
    screen_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_screen = db.query(models.Screen).filter(
        models.Screen.id == screen_id,
        models.Screen.created_by_id == current_user.id
    ).first()

    if not db_screen:
        raise HTTPException(status_code=404, detail="Screen not found")

    if db_screen.unique_key in manager.active_connections:
        db_screen.is_online = True
        _, start_time = manager.active_connections[db_screen.unique_key]
        db_screen.connected_since = start_time

    return db_screen


@router.put("/{screen_id}", response_model=schemas.ScreenPublic)
async def update_screen(
    screen_id: int,
    screen_update: schemas.ScreenUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_screen = db.query(models.Screen).filter(
        models.Screen.id == screen_id,
        models.Screen.created_by_id == current_user.id
    ).first()

    if not db_screen:
        raise HTTPException(status_code=404, detail="Screen not found")

    update_data = screen_update.dict(exclude_unset=True)
    
    if 'rotation' in update_data and update_data['rotation'] not in [0, 90, 180, 270]:
        raise HTTPException(status_code=400, detail="Invalid rotation value.")

    # Handle manual playlist assignment
    if "assigned_playlist_id" in update_data:
        if update_data["assigned_playlist_id"] is None:
            db_screen.assigned_playlist_id = None
        else:
            playlist_id = update_data["assigned_playlist_id"]
            db_playlist = db.query(models.Playlist).filter(
                models.Playlist.id == playlist_id,
                models.Playlist.created_by_id == current_user.id
            ).first()
            if not db_playlist:
                raise HTTPException(status_code=404, detail=f"Playlist with id {playlist_id} not found.")
            db_screen.assigned_playlist_id = playlist_id
        # Remove from update_data to avoid setting it again
        del update_data["assigned_playlist_id"]

    for key, value in update_data.items():
        setattr(db_screen, key, value)

    db.commit()
    db.refresh(db_screen)

    await manager.send_to_screen("playlist_updated", db_screen.unique_key)

    return db_screen


@router.get("/", response_model=List[schemas.ScreenPublic])
def get_screens(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    screens = db.query(models.Screen).filter(
        models.Screen.created_by_id == current_user.id
    ).offset(skip).limit(limit).all()

    for screen in screens:
        if screen.unique_key in manager.active_connections:
            screen.is_online = True
            _, start_time = manager.active_connections[screen.unique_key]
            screen.connected_since = start_time

    return screens

@router.put("/{screen_id}/re-pair", response_model=schemas.ScreenPublic)
async def re_pair_screen(
    screen_id: int,
    payload: schemas.ScreenRePair,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    old_screen_config = db.query(models.Screen).filter(
        models.Screen.id == screen_id,
        models.Screen.created_by_id == current_user.id
    ).first()

    if not old_screen_config:
        raise HTTPException(status_code=404, detail="Ecranul de configurat nu a fost găsit.")

    new_player_instance = db.query(models.Screen).filter(
        models.Screen.pairing_code == payload.new_pairing_code.upper(),
        models.Screen.is_active == False
    ).first()

    if not new_player_instance:
        raise HTTPException(status_code=404, detail="Niciun player nou cu acest cod de împerechere nu a fost găsit.")

    new_player_instance.name = old_screen_config.name
    new_player_instance.location = old_screen_config.location
    new_player_instance.created_by_id = old_screen_config.created_by_id
    new_player_instance.assigned_playlist_id = old_screen_config.assigned_playlist_id
    new_player_instance.is_active = True
    new_player_instance.pairing_code = None
    new_player_instance.last_seen = datetime.now(timezone.utc)
    
    old_unique_key = old_screen_config.unique_key
    db.delete(old_screen_config)
    db.commit()
    db.refresh(new_player_instance)
    
    await manager.send_to_screen("screen_deleted", old_unique_key)
    await manager.send_to_screen("playlist_updated", new_player_instance.unique_key)

    return new_player_instance

@router.delete("/{screen_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_screen(
    screen_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_screen = db.query(models.Screen).filter(
        models.Screen.id == screen_id,
        models.Screen.created_by_id == current_user.id
    ).first()

    if not db_screen:
        raise HTTPException(status_code=404, detail="Screen not found")

    unique_key = db_screen.unique_key
    db.delete(db_screen)
    db.commit()
    
    await manager.send_to_screen("screen_deleted", unique_key)
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)
