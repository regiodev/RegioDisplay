from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # --- CÂMP NOU PENTRU COTA DE SPAȚIU ---
    # Stochează cota în MB. Setăm o valoare implicită de 1GB pentru toți utilizatorii.
    disk_quota_mb = Column(Integer, default=1024, nullable=False)

class MediaFile(Base):
    __tablename__ = "media_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=False)
    path = Column(String, nullable=False)
    thumbnail_path = Column(String, nullable=True)
    type = Column(String, nullable=False) # 'image' sau 'video'
    size = Column(Integer, nullable=False) # mărimea în bytes
    duration = Column(Float, nullable=True)
    tags = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Relația cu tabelul User
    uploaded_by_id = Column(Integer, ForeignKey("users.id"))
    uploader = relationship("User")

class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)

    # --- CÂMP NOU PENTRU VERSIUNE ---
    # Un UUID care se schimbă la fiecare modificare
    playlist_version = Column(String, default=lambda: str(uuid.uuid4()), nullable=False)

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

    # Numele și locația vor fi setate de admin DUPĂ împerechere, deci pot fi nule la început
    name = Column(String, index=True, nullable=True) 
    location = Column(String, nullable=True)

    # Cheia unică va fi generată de player și trimisă la înregistrare. Este obligatorie.
    unique_key = Column(String, unique=True, index=True, nullable=False)
    last_seen = Column(DateTime, nullable=True)

    # --- CÂMPURI NOI PENTRU NOUL PROCES DE ÎMPERECHERE ---
    # Codul scurt, vizibil pe TV. Este unic și temporar (poate deveni null după activare).
    pairing_code = Column(String, unique=True, index=True, nullable=True)
    # Un flag care ne spune dacă un admin a revendicat acest ecran.
    is_active = Column(Boolean, default=False, nullable=False)
    # --- SFÂRȘIT CÂMPURI NOI ---

    # Relația cu User (cine a înregistrat ecranul). Poate fi nulă până la revendicare.
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    creator = relationship("User")

    # Relația cu Playlist (ce playlist rulează pe acest ecran)
    assigned_playlist_id = Column(Integer, ForeignKey("playlists.id"), nullable=True)
    assigned_playlist = relationship("Playlist")
