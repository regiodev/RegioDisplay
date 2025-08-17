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
    dependencies=[Depends(auth.get_admin_user)]
)

@router.get("/users", response_model=List[schemas.UserPublic])
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    for user in users:
        current_usage_bytes = db.query(func.sum(models.MediaFile.size)).filter(
            models.MediaFile.uploaded_by_id == user.id
        ).scalar() or 0
        user.current_usage_mb = round(current_usage_bytes / (1024 * 1024), 2)
    return users

@router.put("/users/{user_id}", response_model=schemas.UserPublic)
def update_user_by_admin(
    user_id: int,
    user_update: schemas.AdminUserUpdate,
    db: Session = Depends(get_db)
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_update.model_dump(exclude_unset=True)
    if 'password' in update_data and update_data['password']:
        new_password = update_data.pop('password')
        db_user.password_hash = auth.get_password_hash(new_password)
    
    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/users/{user_id}", status_code=200)
def delete_user_by_admin(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if db_user.is_admin:
         raise HTTPException(status_code=403, detail="Cannot delete an admin account.")

    # --- AICI ESTE LOGICA DE ȘTERGERE COMPLET REVIZUITĂ (VERSIUNEA FINALĂ) ---
    
    # Pasul 1: Preluăm listele de obiecte care aparțin utilizatorului
    playlists_to_delete = db.query(models.Playlist).filter(models.Playlist.created_by_id == user_id).all()
    screens_to_delete = db.query(models.Screen).filter(models.Screen.created_by_id == user_id).all()
    media_files_to_delete = db.query(models.MediaFile).filter(models.MediaFile.uploaded_by_id == user_id).all()

    # Pasul 2: Ștergem fișierele fizice de pe disc
    for media_file in media_files_to_delete:
        try:
            if os.path.exists(media_file.path):
                os.remove(media_file.path)
            if media_file.thumbnail_path:
                full_thumb_path = os.path.join("/srv/signage-app/media_files/thumbnails", media_file.thumbnail_path)
                if os.path.exists(full_thumb_path):
                    os.remove(full_thumb_path)
        except OSError as e:
            print(f"Error removing file {media_file.path}: {e}")
    
    # Pasul 3 (CRITIC): Dezasignăm playlist-urile de la orice ecran.
    # Acest pas rupe legătura dintre Screen și Playlist înainte de a șterge.
    if playlists_to_delete:
        playlist_ids = [p.id for p in playlists_to_delete]
        db.query(models.Screen).filter(
            models.Screen.assigned_playlist_id.in_(playlist_ids)
        ).update({"assigned_playlist_id": None}, synchronize_session=False)

    # Pasul 4: Ștergem obiectele. Cascada se va ocupa de dependențele "în jos"
    # (ex: Playlist -> PlaylistItem și PlaybackLog; Screen -> PlaybackLog)
    for playlist in playlists_to_delete:
        db.delete(playlist)
        
    for screen in screens_to_delete:
        db.delete(screen)

    # Pasul 5: Ștergem fișierele media. PlaylistItem-urile fiind șterse, nu mai există constrângeri.
    for media in media_files_to_delete:
        db.delete(media)

    # Pasul 6: La final, ștergem utilizatorul.
    db.delete(db_user)

    db.commit()

    return {"detail": f"User '{db_user.username}' and all their resources have been deleted successfully"}
