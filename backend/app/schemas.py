# Cale fișier: app/schemas.py

from pydantic import BaseModel, EmailStr
from typing import List, Optional, Generic, TypeVar
from datetime import datetime
from pydantic.generics import GenericModel


# Schema pentru crearea unui user
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    is_admin: Optional[bool] = False

# Schema pentru citirea datelor unui user (fără parolă)
class UserPublic(BaseModel):
    id: int
    email: EmailStr
    username: str
    is_admin: bool
    disk_quota_mb: int
    current_usage_mb: float = 0.0

    class Config:
        from_attributes = True

# Schema pentru token-ul JWT
class Token(BaseModel):
    access_token: str
    token_type: str

# Schema pentru datele conținute în token
class TokenData(BaseModel):
    username: Optional[str] = None

class MediaFilePublic(BaseModel):
    id: int
    filename: str
    type: str
    size: int
    duration: Optional[float] = None
    tags: Optional[str] = None
    thumbnail_path: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True

# --- Scheme pentru PlaylistItem ---
class PlaylistItemBase(BaseModel):
    mediafile_id: int
    order: int
    duration: int

class PlaylistItemCreate(PlaylistItemBase):
    pass

class PlaylistItemPublic(PlaylistItemBase):
    id: int
    media_file: MediaFilePublic

    class Config:
        from_attributes = True

# --- Scheme pentru Playlist ---
class PlaylistBase(BaseModel):
    name: str
    schedule_start: Optional[datetime] = None
    schedule_end: Optional[datetime] = None

class PlaylistCreate(PlaylistBase):
    items: List[PlaylistItemCreate]

class PlaylistPublic(PlaylistBase):
    id: int
    items: List[PlaylistItemPublic] = []
    # --- AICI ESTE MODIFICAREA ---
    # Am făcut câmpul opțional pentru a asigura compatibilitatea
    playlist_version: Optional[str] = None

    class Config:
        from_attributes = True

# --- Scheme pentru Screen ---
class ScreenBase(BaseModel):
    name: str
    location: Optional[str] = None

class ScreenCreate(ScreenBase):
    pass

class ScreenPair(BaseModel):
    pairing_code: str
    name: str
    location: Optional[str] = None

class ScreenPublic(ScreenBase):
    id: int
    unique_key: str
    last_seen: Optional[datetime] = None
    assigned_playlist: Optional[PlaylistPublic] = None
    name: Optional[str] = None
    is_active: bool
    pairing_code: Optional[str] = None

    class Config:
        from_attributes = True

class PlaylistAssign(BaseModel):
    playlist_id: Optional[int] = None

class ClientPlaylistItem(BaseModel):
    url: str
    type: str
    duration: int

class ClientPlaylistResponse(BaseModel):
    name: str
    items: List[ClientPlaylistItem]
    playlist_version: Optional[str] = None
    screen_name: Optional[str] = None

class ClientSyncRequest(BaseModel):
    unique_key: str

class MediaIdList(BaseModel):
    ids: List[int]

class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: Optional[str] = None
    is_admin: Optional[bool] = None
    disk_quota_mb: Optional[int] = None

DataType = TypeVar('DataType')

class PaginatedResponse(GenericModel, Generic[DataType]):
    total: int
    items: List[DataType]

class ScreenRegister(BaseModel):
    unique_key: str
    pairing_code: str

class ScreenRePair(BaseModel):
    new_pairing_code: str

class ForgotPasswordSchema(BaseModel):
    email: EmailStr

class ResetPasswordSchema(BaseModel):
    token: str
    new_password: str
