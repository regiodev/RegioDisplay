# Cale fișier: app/routers/reports_router.py
# VERSIUNE CURATĂ, FĂRĂ PRINT-URI DE DEBUG

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from datetime import datetime

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(
    prefix="/reports",
    tags=["Reports & Logs"],
)

@router.post("/player-logs/", status_code=201)
def receive_player_logs(
    logs: list[schemas.PlaybackLogCreate],
    x_screen_key: str = Header(..., description="Cheia unică a player-ului TV"),
    db: Session = Depends(get_db)
):
    screen = db.query(models.Screen).filter(models.Screen.unique_key == x_screen_key).first()
    if not screen or not screen.is_active:
        raise HTTPException(status_code=403, detail="Screen not registered or inactive")

    for log_data in logs:
        media_file = db.query(models.MediaFile).filter(models.MediaFile.id == log_data.media_id).first()
        playlist = db.query(models.Playlist).filter(models.Playlist.id == log_data.playlist_id).first()

        if not media_file or not playlist:
            continue
        
        new_log = models.PlaybackLog(
            media_file_id=log_data.media_id,
            screen_id=screen.id,
            playlist_id=log_data.playlist_id,
            event_type=log_data.event_type,
            played_at=log_data.timestamp
        )
        db.add(new_log)
    
    db.commit()
    return {"detail": f"{len(logs)} logs received and processed successfully."}


@router.get("/proof-of-play", response_model=schemas.ProofOfPlayReport)
def get_proof_of_play_report(
    start_date: datetime,
    end_date: datetime,
    limit: int = Query(50, ge=0, le=500),
    screen_id: str = None, 
    media_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    base_query = db.query(models.PlaybackLog).join(models.Screen).filter(
        models.Screen.created_by_id == current_user.id,
        models.PlaybackLog.played_at >= start_date,
        models.PlaybackLog.played_at <= end_date
    )

    if screen_id and screen_id != 'all':
        base_query = base_query.filter(models.PlaybackLog.screen_id == int(screen_id))
    if media_id:
        base_query = base_query.filter(models.PlaybackLog.media_file_id == media_id)

    start_events_query = base_query.filter(models.PlaybackLog.event_type == models.EventType.START)

    total_playbacks = start_events_query.count()
    active_screens_count = start_events_query.with_entities(func.count(distinct(models.PlaybackLog.screen_id))).scalar() or 0
    
    start_events_subquery = start_events_query.subquery()
    
    total_playback_time_seconds_query = db.query(
        func.sum(models.PlaylistItem.duration)
    ).select_from(start_events_subquery).join(
        models.PlaylistItem,
        (models.PlaylistItem.playlist_id == start_events_subquery.c.playlist_id) &
        (models.PlaylistItem.mediafile_id == start_events_subquery.c.media_file_id)
    )
    total_playback_time_seconds = total_playback_time_seconds_query.scalar() or 0

    playbacks_by_hour_query = db.query(
        func.extract('hour', start_events_subquery.c.played_at).label('hour'),
        func.count().label('count')
    ).group_by('hour').order_by('hour').all()
    playbacks_by_hour = [{"hour": int(h), "count": c} for h, c in playbacks_by_hour_query]

    playbacks_by_screen_query = db.query(
        models.Screen.name.label('screen_name'),
        func.count().label('count')
    ).join(start_events_subquery, models.Screen.id == start_events_subquery.c.screen_id).group_by('screen_name').all()
    playbacks_by_screen = [{"screen_name": n, "count": c} for n, c in playbacks_by_screen_query]

    timeline = []
    if limit > 0:
        timeline_query = db.query(
            start_events_subquery.c.played_at,
            models.MediaFile.filename,
            models.Screen.name,
            models.PlaylistItem.duration
        ).select_from(start_events_subquery).join(
            models.Screen, models.Screen.id == start_events_subquery.c.screen_id
        ).join(
            models.MediaFile, models.MediaFile.id == start_events_subquery.c.media_file_id
        ).join(
            models.PlaylistItem,
            (models.PlaylistItem.playlist_id == start_events_subquery.c.playlist_id) &
            (models.PlaylistItem.mediafile_id == start_events_subquery.c.media_file_id)
        ).order_by(start_events_subquery.c.played_at.desc()).limit(limit)

        results = timeline_query.all()
        timeline = [
            {
                "played_at": row[0],
                "media_filename": row[1],
                "screen_name": row[2],
                "duration_seconds": int(row[3] or 0)
            } for row in results
        ]

    return {
        "total_playbacks": total_playbacks,
        "total_playback_time_seconds": int(total_playback_time_seconds),
        "active_screens_count": active_screens_count,
        "playbacks_by_hour": playbacks_by_hour,
        "playbacks_by_screen": playbacks_by_screen,
        "timeline": timeline
    }
