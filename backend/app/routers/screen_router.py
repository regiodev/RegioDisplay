# Cale: routers/screen_router.py

import asyncio
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

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
        models.Screen.pairing_code == payload.pairing_code
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
    
    # Trimitem notificarea direct către ecranul proaspăt activat
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

    # Trimitem notificarea direct către ecranul afectat
    await manager.send_to_screen("playlist_updated", db_screen.unique_key)
    
    return db_screen

# Restul funcțiilor din acest fișier (get_screens, re_pair_screen, delete_screen)
# rămân la fel ca în versiunile anterioare, dar pentru a fi siguri, iată fișierul complet:

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
        models.Screen.pairing_code == payload.new_pairing_code,
        models.Screen.is_active == False
    ).first()

    if not new_player_instance:
        raise HTTPException(status_code=404, detail="Niciun player nou cu acest cod de împerechere nu a fost găsit.")

    old_unique_key = old_screen_config.unique_key
    old_screen_config.unique_key = new_player_instance.unique_key
    old_screen_config.last_seen = datetime.utcnow()
    
    db.delete(new_player_instance)
    db.commit()
    db.refresh(old_screen_config)
    
    # Notificăm ambele playere (cel vechi, dacă mai e online, și cel nou)
    await manager.send_to_screen("playlist_updated", old_unique_key)
    await manager.send_to_screen("playlist_updated", old_screen_config.unique_key)

    return old_screen_config

@router.delete("/{screen_id}", response_model=schemas.ScreenPublic)
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
    
    # Pydantic nu poate serializa un obiect șters, deci returnăm un răspuns manual
    # sau pur și simplu nu returnăm nimic (status 204 No Content)
    from fastapi import Response
    from fastapi import status
    return Response(status_code=status.HTTP_204_NO_CONTENT)
