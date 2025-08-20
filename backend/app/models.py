# Cale fișier: app/models.py

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base
import uuid
import enum

# --- ENUM NOU PENTRU STAREA DE PROCESARE ---
class ProcessingStatus(enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class EventType(enum.Enum):
    START = "START"
    END = "END"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    disk_quota_mb = Column(Integer, default=1024, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

class MediaFile(Base):
    __tablename__ = "media_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=False)
    path = Column(String, nullable=False)
    thumbnail_path = Column(String, nullable=True)
    type = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    duration = Column(Float, nullable=True)
    tags = Column(String, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    processing_status = Column(SQLAlchemyEnum(ProcessingStatus), nullable=False, server_default=ProcessingStatus.COMPLETED.name)
    processing_progress = Column(Float, default=0.0, nullable=False)  # 0-100 pentru progres procentual
    processing_eta = Column(Integer, nullable=True)  # timp estimat rămas în secunde
    processing_speed = Column(String, nullable=True)  # viteză de procesare (ex: "2.5x")
    processing_started_at = Column(DateTime(timezone=True), nullable=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"))
    uploader = relationship("User")

    # --- CÂMPURI NOI PENTRU CONȚINUT WEB ---
    web_url = Column(String, nullable=True)  # URL-ul paginii web (doar pentru type="web/html")
    web_refresh_interval = Column(Integer, nullable=True, default=30)  # interval de refresh în secunde
    # --- FINAL CÂMPURI NOI ---

    playlist_items = relationship("PlaylistItem", back_populates="media_file")

class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    playlist_version = Column(String, default=lambda: str(uuid.uuid4()), nullable=False)
    schedule_start = Column(DateTime, nullable=True)
    schedule_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))
    created_by_id = Column(Integer, ForeignKey("users.id"))
    creator = relationship("User")
    
    items = relationship("PlaylistItem", back_populates="playlist", cascade="all, delete-orphan")
    playback_logs = relationship("PlaybackLog", back_populates="playlist", cascade="all, delete-orphan")

class PlaylistItem(Base):
    __tablename__ = "playlist_items"

    id = Column(Integer, primary_key=True, index=True)
    order = Column(Integer, nullable=False)
    duration = Column(Integer, nullable=False)
    playlist_id = Column(Integer, ForeignKey("playlists.id"))
    playlist = relationship("Playlist", back_populates="items")
    mediafile_id = Column(Integer, ForeignKey("media_files.id", ondelete="CASCADE"))
    media_file = relationship("MediaFile", back_populates="playlist_items")

class Screen(Base):
    __tablename__ = "screens"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=True) 
    location = Column(String, nullable=True)
    unique_key = Column(String, unique=True, index=True, nullable=False)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    player_version = Column(String, nullable=True)
    screen_resolution = Column(String, nullable=True)
    pairing_code = Column(String, unique=True, index=True, nullable=True)
    is_active = Column(Boolean, default=False, nullable=False)
    
    # --- CÂMPURI NOI ADĂUGATE ---
    rotation = Column(Integer, nullable=False, default=0)
    rotation_updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    # --- FINAL CÂMPURI NOI ---

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    creator = relationship("User")
    assigned_playlist_id = Column(Integer, ForeignKey("playlists.id"), nullable=True)
    assigned_playlist = relationship("Playlist")
    playback_logs = relationship("PlaybackLog", back_populates="screen", cascade="all, delete-orphan")

class PlaybackLog(Base):
    __tablename__ = "playback_logs"

    id = Column(Integer, primary_key=True, index=True)
    media_file_id = Column(Integer, ForeignKey("media_files.id"), nullable=False)
    screen_id = Column(Integer, ForeignKey("screens.id"), nullable=False)
    playlist_id = Column(Integer, ForeignKey("playlists.id"), nullable=False)
    event_type = Column(SQLAlchemyEnum(EventType), nullable=False)
    played_at = Column(DateTime(timezone=True), nullable=False)
    media_file = relationship("MediaFile")
    screen = relationship("Screen", back_populates="playback_logs")
    playlist = relationship("Playlist", back_populates="playback_logs")
