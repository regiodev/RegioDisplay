# Cale: app/routers/dashboard_router.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from datetime import datetime, timedelta, timezone
import psutil
import os

from .. import models, auth
from ..database import get_db
from ..connection_manager import manager

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(auth.get_current_user)]
)

def get_server_uptime():
    boot_time_timestamp = psutil.boot_time()
    boot_time = datetime.fromtimestamp(boot_time_timestamp)
    now = datetime.now()
    uptime = now - boot_time
    return str(uptime).split('.')[0]

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # 1. Starea playerelor
    screens = db.query(models.Screen).filter(models.Screen.created_by_id == current_user.id).all()
    online_count = sum(1 for screen in screens if screen.unique_key in manager.active_connections)
    
    # 2. Spațiu de stocare
    total_usage_bytes = db.query(func.sum(models.MediaFile.size)).filter(models.MediaFile.uploaded_by_id == current_user.id).scalar() or 0
    total_usage_mb = round(total_usage_bytes / (1024 * 1024), 2)
    large_files_count = db.query(models.MediaFile).filter(
        models.MediaFile.uploaded_by_id == current_user.id,
        models.MediaFile.size > 50 * 1024 * 1024 # Peste 50MB
    ).count()

    # 3. Notificări și Alerte
    latest_player_version = os.getenv("LATEST_PLAYER_VERSION", "N/A")
    outdated_players = [
        screen.name for screen in screens 
        if screen.player_version and screen.player_version != latest_player_version
    ]
    
    # Construim răspunsul parțial
    response = {
        "screens": {
            "total": len(screens),
            "online": online_count,
            "offline": len(screens) - online_count,
            "list": [{"name": s.name, "last_seen": s.last_seen, "is_online": s.unique_key in manager.active_connections} for s in screens[:5]]
        },
        "storage": {
            "used_mb": total_usage_mb,
            "quota_mb": current_user.disk_quota_mb,
            "large_files": large_files_count
        },
        "user": {
            "last_login_at": current_user.last_login_at
        },
        "alerts": {
            "latest_player_version": latest_player_version,
            "outdated_players": outdated_players
        }
    }

    # --- BLOC CORECTAT: Calculăm statisticile Proof of Play pentru ultimele 7 zile ---
    pop_summary = {}
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=7)

    start_events_query = db.query(models.PlaybackLog).join(models.Screen).filter(
        models.Screen.created_by_id == current_user.id,
        models.PlaybackLog.played_at >= start_date,
        models.PlaybackLog.played_at <= end_date,
        models.PlaybackLog.event_type == models.EventType.START
    )

    pop_summary["total_playbacks"] = start_events_query.count()
    
    # Interogarea corectă pentru a obține numele distincte ale ecranelor
    # Fără a adăuga un JOIN duplicat
    active_screens_names_query = start_events_query.with_entities(models.Screen.name).distinct()
    active_screens_list = active_screens_names_query.all()
    
    pop_summary["active_screens_names"] = [name for name, in active_screens_list]
    pop_summary["active_screens_count"] = len(pop_summary["active_screens_names"])

    subquery = start_events_query.subquery()
    total_duration = db.query(func.sum(models.MediaFile.duration)).join(
        subquery, models.MediaFile.id == subquery.c.media_file_id
    ).scalar() or 0
    pop_summary["total_playback_time_seconds"] = int(total_duration)

    response["proof_of_play_summary"] = pop_summary
    # --- FINAL BLOC CORECTAT ---

    # Secțiunea pentru Admin
    if current_user.is_admin:
        response["system"] = {
            "status": "Activ",
            "uptime": get_server_uptime()
        }
        
    return response
