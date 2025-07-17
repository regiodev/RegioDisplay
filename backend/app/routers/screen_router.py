import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(
    prefix="/screens",
    tags=["Screens"]
)

@router.post("/", response_model=schemas.ScreenPublic, status_code=201)
def create_screen(
    screen: schemas.ScreenCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Înregistrează un ecran nou în sistem.
    O cheie unică este generată automat pentru împerechere.
    """
    unique_key = str(uuid.uuid4())
    db_screen = models.Screen(
        **screen.model_dump(),
        unique_key=unique_key,
        created_by_id=current_user.id
    )
    db.add(db_screen)
    db.commit()
    db.refresh(db_screen)
    return db_screen

@router.get("/", response_model=List[schemas.ScreenPublic])
def get_screens(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Returnează o listă cu toate ecranele înregistrate.
    """
    screens = db.query(models.Screen).offset(skip).limit(limit).all()
    return screens

@router.post("/{screen_id}/assign_playlist", response_model=schemas.ScreenPublic)
def assign_playlist_to_screen(
    screen_id: int,
    assignment: schemas.PlaylistAssign,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Asignează un playlist existent unui ecran existent.
    """
    # Verifică dacă ecranul există
    db_screen = db.query(models.Screen).filter(models.Screen.id == screen_id).first()
    if not db_screen:
        raise HTTPException(status_code=404, detail="Screen not found")

    # Verifică dacă playlist-ul există
    db_playlist = db.query(models.Playlist).filter(models.Playlist.id == assignment.playlist_id).first()
    if not db_playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    # Asignează ID-ul playlist-ului și salvează
    db_screen.assigned_playlist_id = assignment.playlist_id
    db.commit()
    db.refresh(db_screen)

    return db_screen
