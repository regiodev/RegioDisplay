import uuid
import aiofiles
import os
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(
    prefix="/media",
    tags=["Media"]
)

MEDIA_DIRECTORY = "/srv/signage-app/media_files"

@router.post("/", response_model=schemas.MediaFilePublic, status_code=201)
async def upload_media_file(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Încarcă un fișier media (imagine sau video).
    Doar utilizatorii autentificați pot încărca fișiere.
    """
    # Generează un nume de fișier unic pentru a evita conflictele
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = f"{MEDIA_DIRECTORY}/{unique_filename}"

    # Salvează fișierul pe disc în mod asincron
    try:
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")

    # Salvează metadatele în baza de date
    db_media_file = models.MediaFile(
        filename=file.filename, # Numele original
        path=file_path, # Calea pe server
        type=file.content_type, # ex: 'image/jpeg'
        size=file.size,
        uploaded_by_id=current_user.id
    )
    db.add(db_media_file)
    db.commit()
    db.refresh(db_media_file)

    return db_media_file

@router.get("/", response_model=List[schemas.MediaFilePublic])
def get_media_files(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Returnează o listă cu fișierele media încărcate.
    """
    media_files = db.query(models.MediaFile).offset(skip).limit(limit).all()
    return media_files

@router.delete("/{media_id}", status_code=200)
def delete_media_file(
    media_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Șterge un fișier media.
    Doar utilizatorii autentificați pot șterge fișiere.
    TODO: Adaugă verificare ca doar admin-ul sau uploader-ul să poată șterge.
    """
    # 1. Găsește fișierul în baza de date
    media_file_query = db.query(models.MediaFile).filter(models.MediaFile.id == media_id)
    db_media_file = media_file_query.first()

    if not db_media_file:
        raise HTTPException(status_code=404, detail="File not found")

    # 2. Șterge fișierul fizic de pe disc
    try:
        os.remove(db_media_file.path)
    except OSError as e:
        # Poate fișierul a fost șters manual, dar continuăm să ștergem din DB
        print(f"Error removing file {db_media_file.path}: {e}")

    # 3. Șterge înregistrarea din baza de date
    media_file_query.delete(synchronize_session=False)
    db.commit()

    return {"detail": f"File with id {media_id} deleted successfully"}

@router.get("/serve/{media_id}")
async def serve_media_file(media_id: int, db: Session = Depends(get_db)):
    """
    Servește un fișier media pentru a putea fi afișat în browser.
    Returnează direct fișierul, nu un răspuns JSON.
    """
    db_media_file = db.query(models.MediaFile).filter(models.MediaFile.id == media_id).first()

    if not db_media_file:
        raise HTTPException(status_code=404, detail="File not found")

    # Verifică dacă fișierul fizic există înainte de a-l servi
    if not os.path.exists(db_media_file.path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(path=db_media_file.path, media_type=db_media_file.type)
