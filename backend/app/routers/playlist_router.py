from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(
    prefix="/playlists",
    tags=["Playlists"]
)

@router.post("/", response_model=schemas.PlaylistPublic, status_code=201)
def create_playlist(
    playlist: schemas.PlaylistCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Creează un nou playlist cu elementele sale media.
    Doar utilizatorii autentificați pot crea playlist-uri.
    """
    # 1. Creează obiectul principal Playlist
    db_playlist = models.Playlist(
        name=playlist.name,
        schedule_start=playlist.schedule_start,
        schedule_end=playlist.schedule_end,
        created_by_id=current_user.id
    )
    db.add(db_playlist)

    # 2. Creează obiectele PlaylistItem și le asociază
    for item_data in playlist.items:
        # Verifică dacă fișierul media există
        media_file = db.query(models.MediaFile).filter(models.MediaFile.id == item_data.mediafile_id).first()
        if not media_file:
            raise HTTPException(
                status_code=404, 
                detail=f"Media file with id {item_data.mediafile_id} not found."
            )

        db_item = models.PlaylistItem(
            playlist=db_playlist, # Asociază cu playlist-ul creat mai sus
            mediafile_id=item_data.mediafile_id,
            order=item_data.order,
            duration=item_data.duration
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_playlist)

    return db_playlist

@router.get("/", response_model=List[schemas.PlaylistPublic])
def get_playlists(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Returnează o listă cu toate playlist-urile.
    """
    playlists = db.query(models.Playlist).offset(skip).limit(limit).all()
    return playlists

@router.get("/{playlist_id}", response_model=schemas.PlaylistPublic)
def get_playlist(
    playlist_id: int,
    db: Session = Depends(get_db)
):
    """
    Returnează detaliile unui playlist specific, pe baza ID-ului.
    """
    db_playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if db_playlist is None:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return db_playlist

@router.delete("/{playlist_id}", status_code=200)
def delete_playlist(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Șterge un playlist și toate elementele sale.
    Doar utilizatorii autentificați pot șterge.
    """
    db_playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()

    if db_playlist is None:
        raise HTTPException(status_code=404, detail="Playlist not found")

    # TODO: Adaugă verificare ca doar admin-ul sau creatorul să poată șterge.
    
    # LINIA DE MAI JOS ESTE CEA MODIFICATĂ:
    db.delete(db_playlist) # Ștergem obiectul, nu query-ul
    db.commit()

    return {"detail": "Playlist deleted successfully"}
