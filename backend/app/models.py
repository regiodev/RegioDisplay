from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)

class MediaFile(Base):
    __tablename__ = "media_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=False)
    path = Column(String, nullable=False)
    type = Column(String, nullable=False) # 'image' sau 'video'
    size = Column(Integer, nullable=False) # mărimea în bytes
    tags = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Relația cu tabelul User
    uploaded_by_id = Column(Integer, ForeignKey("users.id"))
    uploader = relationship("User")

class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)

    # Câmpuri pentru programare, opționale
    schedule_start = Column(DateTime, nullable=True)
    schedule_end = Column(DateTime, nullable=True)

    # Relația cu User (cine a creat playlist-ul)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    creator = relationship("User")

    # Relația cu PlaylistItem (elementele din playlist)
    items = relationship("PlaylistItem", back_populates="playlist", cascade="all, delete-orphan")


class PlaylistItem(Base):
    __tablename__ = "playlist_items"

    id = Column(Integer, primary_key=True, index=True)
    order = Column(Integer, nullable=False) # Ordinea elementului în listă
    duration = Column(Integer, nullable=False) # Durata în secunde

    # Legătura către playlist-ul din care face parte
    playlist_id = Column(Integer, ForeignKey("playlists.id"))
    playlist = relationship("Playlist", back_populates="items")

    # Legătura către fișierul media pe care îl afișează
    mediafile_id = Column(Integer, ForeignKey("media_files.id"))
    media_file = relationship("MediaFile")

class Screen(Base):
    __tablename__ = "screens"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    location = Column(String, nullable=True)

    # Cheia unică pentru împerecherea cu dispozitivul fizic
    unique_key = Column(String, unique=True, index=True, nullable=False)

    # Relația cu User (cine a înregistrat ecranul)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    creator = relationship("User")

    # Relația cu Playlist (ce playlist rulează pe acest ecran)
    assigned_playlist_id = Column(Integer, ForeignKey("playlists.id"), nullable=True)
    assigned_playlist = relationship("Playlist")
