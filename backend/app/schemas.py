from pydantic import BaseModel, EmailStr
from typing import Optional
from typing import List
from datetime import datetime

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

    class Config:
        from_attributes = True

# Schema pentru token-ul JWT (aceasta lipsea sau era incorectă)
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
    tags: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True

# --- Scheme pentru PlaylistItem ---
class PlaylistItemBase(BaseModel):
    mediafile_id: int
    order: int
    duration: int # în secunde

class PlaylistItemCreate(PlaylistItemBase):
    pass

class PlaylistItemPublic(PlaylistItemBase):
    id: int
    media_file: MediaFilePublic # Afișăm detaliile fișierului media

    class Config:
        from_attributes = True

# --- Scheme pentru Playlist ---
class PlaylistBase(BaseModel):
    name: str
    schedule_start: Optional[datetime] = None
    schedule_end: Optional[datetime] = None

class PlaylistCreate(PlaylistBase):
    # La creare, primim o listă de elemente
    items: List[PlaylistItemCreate]

class PlaylistPublic(PlaylistBase):
    id: int
    # Afișăm elementele complete ale playlist-ului
    items: List[PlaylistItemPublic] = []

    class Config:
        from_attributes = True

# --- Scheme pentru Screen ---
class ScreenBase(BaseModel):
    name: str
    location: Optional[str] = None

class ScreenCreate(ScreenBase):
    pass

class ScreenPublic(ScreenBase):
    id: int
    unique_key: str
    # Afișăm și playlist-ul asignat, dacă există
    assigned_playlist: Optional[PlaylistPublic] = None

    class Config:
        from_attributes = True

class PlaylistAssign(BaseModel):
    playlist_id: int

class ClientPlaylistItem(BaseModel):
    # URL-ul complet de unde clientul poate descărca fișierul
    url: str
    type: str # ex: 'image/jpeg'
    duration: int # în secunde

class ClientPlaylistResponse(BaseModel):
    name: str
    items: List[ClientPlaylistItem]
