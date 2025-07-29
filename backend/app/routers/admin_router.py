# Cale fișier: app/routers/admin_router.py

import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func 

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    # Toate endpoint-urile din acest router necesită drepturi de admin
    dependencies=[Depends(auth.get_admin_user)]
)

@router.get("/users", response_model=List[schemas.UserPublic])
def get_all_users(db: Session = Depends(get_db)):
    """
    Returnează o listă cu toți utilizatorii și spațiul de stocare utilizat.
    Accesibil doar pentru admini.
    """
    users = db.query(models.User).all()

    # Calculăm spațiul utilizat pentru fiecare utilizator
    for user in users:
        current_usage_bytes = db.query(func.sum(models.MediaFile.size)).filter(
            models.MediaFile.uploaded_by_id == user.id
        ).scalar() or 0

        # Adăugăm valoarea calculată la obiectul user (în MB)
        user.current_usage_mb = round(current_usage_bytes / (1024 * 1024), 2)

    return users

@router.put("/users/{user_id}", response_model=schemas.UserPublic)
def update_user_by_admin(
    user_id: int,
    user_update: schemas.AdminUserUpdate,
    db: Session = Depends(get_db)
):
    """
    Actualizează detaliile unui utilizator, inclusiv parola.
    Accesibil doar pentru admini.
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_update.model_dump(exclude_unset=True)

    # --- BLOC NOU: GESTIONARE SPECIALĂ PENTRU PAROLĂ ---
    if 'password' in update_data and update_data['password']:
        new_password = update_data.pop('password')
        db_user.password_hash = auth.get_password_hash(new_password)
    # --- SFÂRȘIT BLOC NOU ---

    # Actualizăm restul câmpurilor
    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/users/{user_id}", status_code=200)
def delete_user_by_admin(user_id: int, db: Session = Depends(get_db)):
    """
    Șterge un utilizator și toate resursele asociate acestuia (media, playlists, screens).
    Accesibil doar pentru admini.
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if db_user.is_admin:
         raise HTTPException(status_code=403, detail="Cannot delete an admin account.")

    # --- LOGICA DE ȘTERGERE ÎN CASCADĂ (VERSIUNEA FINALĂ) ---

    # Pasul 1: Găsește și șterge fișierele fizice de pe disc
    media_files_to_delete = db.query(models.MediaFile).filter(models.MediaFile.uploaded_by_id == user_id).all()
    for media_file in media_files_to_delete:
        try:
            if os.path.exists(media_file.path):
                os.remove(media_file.path)
            if media_file.thumbnail_path:
                full_thumb_path = f"/srv/signage-app/media_files{media_file.thumbnail_path}"
                if os.path.exists(full_thumb_path):
                    os.remove(full_thumb_path)
        except OSError as e:
            print(f"Error removing file {media_file.path}: {e}")
            
    # Pasul 2: Identifică toate playlist-urile utilizatorului
    user_playlists = db.query(models.Playlist).filter(models.Playlist.created_by_id == user_id).all()
    if user_playlists:
        user_playlist_ids = [p.id for p in user_playlists]
        
        # Pasul 2a: Dezasignează aceste playlist-uri de la orice ecran (fix-ul anterior)
        db.query(models.Screen).filter(
            models.Screen.assigned_playlist_id.in_(user_playlist_ids)
        ).update({"assigned_playlist_id": None}, synchronize_session=False)
        
        # --- BLOC NOU ȘI CRITIC ---
        # Pasul 2b: Șterge explicit TOATE PlaylistItem-urile care aparțin acestor playlist-uri.
        # Acest pas rupe legătura dintre PlaylistItem și MediaFile.
        db.query(models.PlaylistItem).filter(
            models.PlaylistItem.playlist_id.in_(user_playlist_ids)
        ).delete(synchronize_session=False)
        # --- SFÂRȘIT BLOC NOU ---

    # Pasul 3: Acum, cu toate dependențele rezolvate, putem șterge înregistrările principale.
    db.query(models.Playlist).filter(models.Playlist.created_by_id == user_id).delete(synchronize_session=False)
    db.query(models.Screen).filter(models.Screen.created_by_id == user_id).delete(synchronize_session=False)
    db.query(models.MediaFile).filter(models.MediaFile.uploaded_by_id == user_id).delete(synchronize_session=False)

    # Pasul 4: La final, șterge utilizatorul
    db.delete(db_user)

    db.commit()

    return {"detail": f"User '{db_user.username}' and all their resources have been deleted successfully"}
