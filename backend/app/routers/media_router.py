# Cale fișier: app/routers/media_router.py

import uuid
import aiofiles
import os
import ffmpeg
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi.responses import FileResponse

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(
    prefix="/media",
    tags=["Media"]
)

MEDIA_DIRECTORY = "/srv/signage-app/media_files"
THUMBNAIL_DIRECTORY = "/srv/signage-app/media_files/thumbnails"

os.makedirs(THUMBNAIL_DIRECTORY, exist_ok=True)


def generate_thumbnail(video_path: str, thumbnail_path: str):
    try:
        (
            ffmpeg
            .input(video_path, ss=1)
            .output(thumbnail_path, vframes=1)
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        return True
    except ffmpeg.Error as e:
        print('stdout:', e.stdout.decode('utf8'))
        print('stderr:', e.stderr.decode('utf8'))
        return False


@router.post("/", response_model=List[schemas.MediaFilePublic], status_code=201)
async def upload_media_files(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # --- BLOC NOU: Verificarea cotei de spațiu ---
    
    # 1. Calculăm spațiul utilizat în prezent de utilizator (în bytes)
    current_usage_bytes = db.query(func.sum(models.MediaFile.size)).filter(
        models.MediaFile.uploaded_by_id == current_user.id
    ).scalar() or 0

    # 2. Calculăm dimensiunea totală a fișierelor noi (în bytes)
    new_files_size_bytes = sum([file.size for file in files])

    # 3. Convertim cota utilizatorului din MB în bytes
    quota_bytes = current_user.disk_quota_mb * 1024 * 1024

    # 4. Verificăm dacă spațiul nou necesar depășește cota
    if current_usage_bytes + new_files_size_bytes > quota_bytes:
        raise HTTPException(
            status_code=413, # Payload Too Large
            detail=f"Upload failed. Exceeds your disk quota of {current_user.disk_quota_mb} MB."
        )

    # --- SFÂRȘIT BLOC NOU ---

    created_files = []
    for file in files:
        file_extension = file.filename.split('.')[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = f"{MEDIA_DIRECTORY}/{unique_filename}"
        thumbnail_path_db = None
        video_duration = None

        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)

        if file.content_type and file.content_type.startswith("video/"):
            try:
                probe = ffmpeg.probe(file_path)
                video_duration = float(probe['format']['duration'])
                thumb_filename = f"{uuid.uuid4()}.jpg"
                thumbnail_full_path = f"{THUMBNAIL_DIRECTORY}/{thumb_filename}"
                if generate_thumbnail(file_path, thumbnail_full_path):
                    thumbnail_path_db = f"/thumbnails/{thumb_filename}"
            except Exception as e:
                print(f"Could not process video metadata or thumbnail: {e}")

        db_media_file = models.MediaFile(
            filename=file.filename,
            path=file_path,
            thumbnail_path=thumbnail_path_db,
            type=file.content_type,
            size=file.size,
            duration=video_duration,
            uploaded_by_id=current_user.id
        )
        db.add(db_media_file)
        db.commit()
        db.refresh(db_media_file)
        created_files.append(db_media_file)

    return created_files


@router.get("/", response_model=schemas.PaginatedResponse[schemas.MediaFilePublic])
def get_media_files(
    skip: int = 0,
    limit: int = 12,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    query = db.query(models.MediaFile).filter(models.MediaFile.uploaded_by_id == current_user.id)
    total = query.count()
    items = query.order_by(models.MediaFile.id.desc()).offset(skip).limit(limit).all()
    return {"total": total, "items": items}


@router.delete("/{media_id}", status_code=200)
def delete_media_file(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_media_file = db.query(models.MediaFile).filter(
        models.MediaFile.id == media_id,
        models.MediaFile.uploaded_by_id == current_user.id
    ).first()

    if not db_media_file:
        raise HTTPException(status_code=404, detail="File not found")

    # Verificăm dacă fișierul este utilizat într-un playlist al utilizatorului curent
    playlist_item_query = db.query(models.PlaylistItem).join(models.Playlist).filter(
        models.PlaylistItem.mediafile_id == media_id,
        models.Playlist.created_by_id == current_user.id
    )
    usage_count = playlist_item_query.count()

    if usage_count > 0:
        raise HTTPException(status_code=409, detail=f"Cannot delete file. It is currently used in {usage_count} of your playlist(s).")
    
    try:
        os.remove(db_media_file.path)
        if db_media_file.thumbnail_path:
            full_thumb_path = f"/srv/signage-app/media_files{db_media_file.thumbnail_path}"
            if os.path.exists(full_thumb_path):
                os.remove(full_thumb_path)
    except OSError as e:
        print(f"Error removing file {db_media_file.path}: {e}")
        
    db.delete(db_media_file)
    db.commit()
    return {"detail": f"File with id {media_id} deleted successfully"}

@router.get("/serve/{media_id}")
async def serve_media_file(media_id: int, db: Session = Depends(get_db)):
    # --- JURNALE PENTRU DEPANARE ---
    print(f"--- CERERE PRIMITĂ PENTRU SERVIRE MEDIA: ID {media_id} ---")
    
    db_media_file = db.query(models.MediaFile).filter(models.MediaFile.id == media_id).first()
    
    if not db_media_file:
        print(f"  EROARE: Fișierul media cu ID-ul {media_id} nu a fost găsit în baza de date.")
        raise HTTPException(status_code=404, detail="File not found")
    
    print(f"  INFO: Fișier găsit în DB. Cale pe disc: {db_media_file.path}")
    
    if not os.path.exists(db_media_file.path):
        print(f"  EROARE: Fișierul NU există la calea specificată: {db_media_file.path}")
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    print(f"  SUCCES: Se servește fișierul {db_media_file.path}")
    print("---------------------------------------------------------")
    return FileResponse(path=db_media_file.path, media_type=db_media_file.type)

@router.post("/bulk-delete", status_code=200)
def delete_bulk_media(
    payload: schemas.MediaIdList,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    ids_to_delete = payload.ids
    if not ids_to_delete:
        return {"detail": "No files selected for deletion."}

    query = db.query(models.MediaFile).filter(
        models.MediaFile.id.in_(ids_to_delete),
        models.MediaFile.uploaded_by_id == current_user.id
    )

    if query.count() != len(ids_to_delete):
        raise HTTPException(status_code=403, detail="Forbidden: You are trying to delete files that do not belong to you.")
    
    playlist_item_query = db.query(models.PlaylistItem).join(models.Playlist).filter(
        models.PlaylistItem.mediafile_id.in_(ids_to_delete),
        models.Playlist.created_by_id == current_user.id
    )
    if playlist_item_query.first():
        raise HTTPException(
            status_code=409,
            detail="One or more selected files are in use in a playlist and cannot be deleted."
        )

    files_to_delete_from_disk = query.all()
    for file in files_to_delete_from_disk:
        try:
            os.remove(file.path)
            if file.thumbnail_path:
                full_thumb_path = f"/srv/signage-app/media_files{file.thumbnail_path}"
                if os.path.exists(full_thumb_path):
                    os.remove(full_thumb_path)
        except OSError as e:
            print(f"Error removing file {file.path}: {e}")

    query.delete(synchronize_session=False)
    db.commit()

    return {"detail": f"{len(ids_to_delete)} files deleted successfully."}
