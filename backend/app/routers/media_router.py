# Cale fișier: app/routers/media_router.py

import uuid
import aiofiles
import os
import ffmpeg
import subprocess
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi.responses import FileResponse

from .. import models, schemas, auth
from ..database import get_db, SessionLocal
from ..models import ProcessingStatus

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
        print(f"EROARE la generarea thumbnail-ului: {e.stderr.decode('utf8')}")
        return False

def process_video_background_task(media_file_id: int, original_path: str):
    """
    Gestionează întregul proces de post-upload pentru un video:
    1. Setează statusul la PROCESSING.
    2. Generează thumbnail.
    3. Re-encodează video.
    4. Setează statusul la COMPLETED sau FAILED.
    """
    db = SessionLocal()
    media_file_to_update = db.query(models.MediaFile).filter(models.MediaFile.id == media_file_id).first()
    if not media_file_to_update:
        print(f"EROARE: Nu s-a găsit media_file cu ID {media_file_id} pentru procesare.")
        db.close()
        return

    temp_output_path = original_path + "_processed.mp4"

    try:
        # Pasul 1: Setează statusul la PROCESSING
        media_file_to_update.processing_status = ProcessingStatus.PROCESSING
        db.commit()
        print(f"INFO: Pornire procesare pentru fișierul: {original_path}")

        # Pasul 2: Generează thumbnail
        thumb_filename = f"{uuid.uuid4()}.jpg"
        thumbnail_full_path = f"{THUMBNAIL_DIRECTORY}/{thumb_filename}"
        if generate_thumbnail(original_path, thumbnail_full_path):
            media_file_to_update.thumbnail_path = thumb_filename
            db.commit()
            print(f"INFO: Thumbnail generat pentru media ID {media_file_id}.")

        # Pasul 3: Re-encodează video
        command = [
            "ffmpeg",
            "-i", original_path,
            "-c:v", "libx264",
            "-profile:v", "main",
            "-level", "4.0",
            "-preset", "medium",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            "-y",
            temp_output_path
        ]
        subprocess.run(command, check=True, capture_output=True, text=True)
        
        new_size = os.path.getsize(temp_output_path)
        shutil.move(temp_output_path, original_path)
        print(f"SUCCES: Fișierul video {original_path} a fost re-encodat.")

        # Pasul 4: Setează statusul la FINALIZAT și actualizează dimensiunea
        media_file_to_update.size = new_size
        media_file_to_update.processing_status = ProcessingStatus.COMPLETED
        db.commit()
        print(f"INFO: Statusul pentru media ID {media_file_id} a fost setat la FINALIZAT.")

    except subprocess.CalledProcessError as e:
        print(f"EROARE: Procesarea FFmpeg a eșuat pentru {original_path}. FFmpeg stderr: {e.stderr.decode('utf-8', errors='ignore')}")
        media_file_to_update.processing_status = ProcessingStatus.FAILED
        db.commit()
    except Exception as e:
        print(f"EROARE NECUNOSCUTĂ în timpul procesării video pentru {original_path}: {e}")
        media_file_to_update.processing_status = ProcessingStatus.FAILED
        db.commit()
    finally:
        # Ștergem fișierul temporar dacă a rămas agățat
        if os.path.exists(temp_output_path):
            os.remove(temp_output_path)
        db.close()

@router.post("/", response_model=List[schemas.MediaFilePublic], status_code=201)
async def upload_media_files(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    current_usage_bytes = db.query(func.sum(models.MediaFile.size)).filter(
        models.MediaFile.uploaded_by_id == current_user.id
    ).scalar() or 0
    new_files_size_bytes = sum([file.size for file in files if file.size])
    quota_bytes = current_user.disk_quota_mb * 1024 * 1024
    if current_usage_bytes + new_files_size_bytes > quota_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Upload failed. Exceeds your disk quota of {current_user.disk_quota_mb} MB."
        )

    created_files = []
    for file in files:
        file_extension = file.filename.split('.')[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = f"{MEDIA_DIRECTORY}/{unique_filename}"
        
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)

        is_video = file.content_type and file.content_type.startswith("video/")
        
        video_duration = None
        if is_video:
            try:
                probe = ffmpeg.probe(file_path)
                video_duration = float(probe['format']['duration'])
            except Exception:
                pass

        db_media_file = models.MediaFile(
            filename=file.filename,
            path=file_path,
            thumbnail_path=None,
            type=file.content_type,
            size=file.size,
            duration=video_duration,
            uploaded_by_id=current_user.id,
            processing_status=ProcessingStatus.PENDING if is_video else ProcessingStatus.COMPLETED
        )
        db.add(db_media_file)
        db.commit()
        db.refresh(db_media_file)
        created_files.append(db_media_file)

        if is_video:
            background_tasks.add_task(process_video_background_task, db_media_file.id, file_path)

    return created_files


@router.get("/", response_model=schemas.PaginatedResponse[schemas.MediaFilePublic])
def get_media_files(
    skip: int = 0,
    limit: int = 12,
    search: Optional[str] = None,
    sort_by: Optional[str] = 'id',
    sort_dir: Optional[str] = 'desc',
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    query = db.query(models.MediaFile).filter(models.MediaFile.uploaded_by_id == current_user.id)

    if search:
        query = query.filter(models.MediaFile.filename.ilike(f"%{search}%"))

    total = query.count()

    sortable_columns = {
        "filename": models.MediaFile.filename,
        "size": models.MediaFile.size,
        "duration": models.MediaFile.duration,
        "id": models.MediaFile.id
    }
    sort_column = sortable_columns.get(sort_by, models.MediaFile.id)

    if sort_dir == 'asc':
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    items = query.offset(skip).limit(limit).all()
    
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

    playlist_item_query = db.query(models.PlaylistItem).join(models.Playlist).filter(
        models.PlaylistItem.mediafile_id == media_id,
        models.Playlist.created_by_id == current_user.id
    )
    usage_count = playlist_item_query.count()

    if usage_count > 0:
        raise HTTPException(status_code=409, detail=f"Cannot delete file. It is currently used in {usage_count} of your playlist(s).")
    
    try:
        if os.path.exists(db_media_file.path):
            os.remove(db_media_file.path)
        if db_media_file.thumbnail_path:
            full_thumb_path = os.path.join(THUMBNAIL_DIRECTORY, db_media_file.thumbnail_path)
            if os.path.exists(full_thumb_path):
                os.remove(full_thumb_path)
    except OSError as e:
        print(f"Error removing file {db_media_file.path}: {e}")
        
    db.delete(db_media_file)
    db.commit()
    return {"detail": f"File with id {media_id} deleted successfully"}


@router.get("/serve/{media_id}")
async def serve_media_file(media_id: int, db: Session = Depends(get_db)):
    db_media_file = db.query(models.MediaFile).filter(models.MediaFile.id == media_id).first()
    if not db_media_file:
        raise HTTPException(status_code=404, detail="File not found")
    if not os.path.exists(db_media_file.path):
        raise HTTPException(status_code=404, detail="File not found on disk")
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
    media_files_to_delete = query.all()

    if len(media_files_to_delete) != len(ids_to_delete):
        raise HTTPException(status_code=403, detail="Forbidden: You are trying to delete files that do not belong to you.")
    
    playlist_item_query = db.query(models.PlaylistItem).join(models.Playlist).filter(
        models.PlaylistItem.mediafile_id.in_(ids_to_delete),
        models.Playlist.created_by_id == current_user.id
    )
    if playlist_item_query.first():
        raise HTTPException(status_code=409, detail="One or more selected files are in use in a playlist and cannot be deleted.")

    for file in media_files_to_delete:
        try:
            if os.path.exists(file.path):
                os.remove(file.path)
            if file.thumbnail_path:
                full_thumb_path = os.path.join(THUMBNAIL_DIRECTORY, file.thumbnail_path)
                if os.path.exists(full_thumb_path):
                    os.remove(full_thumb_path)
        except OSError as e:
            print(f"Error removing file {file.path}: {e}")
        
        db.delete(file)

    db.commit()
    return {"detail": f"{len(ids_to_delete)} files deleted successfully."}
