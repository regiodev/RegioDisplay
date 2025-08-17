# Cale fișier: app/schemas.py
from pydantic import BaseModel, EmailStr, conint
from typing import List, Optional, Generic, TypeVar
from datetime import datetime
from pydantic.generics import GenericModel
from .models import EventType
from .models import EventType, ProcessingStatus # Adăugăm ProcessingStatus

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    is_admin: Optional[bool] = False

class UserPublic(BaseModel):
    id: int
    email: EmailStr
    username: str
    is_admin: bool
    disk_quota_mb: int
    current_usage_mb: float = 0.0
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PlaybackLogCreate(BaseModel):
    media_id: int
    playlist_id: int
    event_type: EventType
    timestamp: datetime

class PlaybackLogPublic(BaseModel):
    played_at: datetime
    media_filename: str
    screen_name: str
    duration_seconds: int

    class Config:
        from_attributes = True

class HourlyPlayback(BaseModel):
    hour: int
    count: int

class ScreenPlayback(BaseModel):
    screen_name: str
    count: int

class ProofOfPlayReport(BaseModel):
    total_playbacks: int
    total_playback_time_seconds: int
    active_screens_count: int
    playbacks_by_hour: List[HourlyPlayback]
    playbacks_by_screen: List[ScreenPlayback]
    timeline: List[PlaybackLogPublic]

class Token(BaseModel):
    access_token: str
    token_type: str

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
    processing_status: ProcessingStatus

    class Config:
        from_attributes = True

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

class PlaylistBase(BaseModel):
    name: str
    schedule_start: Optional[datetime] = None
    schedule_end: Optional[datetime] = None

class PlaylistCreate(PlaylistBase):
    items: List[PlaylistItemCreate]

class PlaylistPublic(PlaylistBase):
    id: int
    items: List[PlaylistItemPublic] = []
    playlist_version: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

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
    is_online: bool = False
    connected_since: Optional[datetime] = None
    player_version: Optional[str] = None
    screen_resolution: Optional[str] = None
    # --- CÂMP NOU ADĂUGAT ---
    rotation: int

    class Config:
        from_attributes = True

class ScreenUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    rotation: Optional[int] = None
    pairing_code: Optional[str] = None
    assigned_playlist_id: Optional[int] = None

class PlaylistAssign(BaseModel):
    playlist_id: Optional[int] = None

class ClientPlaylistItem(BaseModel):
    url: str
    type: str
    duration: int

class ClientPlaylistResponse(BaseModel):
    id: int
    name: str
    items: List[ClientPlaylistItem]
    playlist_version: Optional[str] = None
    screen_name: Optional[str] = None
    # --- CÂMPURI NOI ADĂUGATE ---
    rotation: Optional[int] = None
    rotation_updated_at: Optional[datetime] = None

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

# --- SCHEME NOI ADĂUGATE ---
class ScreenRotationUpdateWeb(BaseModel):
    rotation: conint(ge=0, le=270) # Validează ca rotația să fie 0, 90, 180 sau 270

class ClientRotationUpdate(BaseModel):
    rotation: conint(ge=0, le=270)
    timestamp: datetime
