# Cale fișier: app/routers/media_router.py

import uuid
import aiofiles
import os
import ffmpeg
import subprocess
import shutil
import asyncio
import multiprocessing
import time
import re
import threading
from datetime import datetime, timezone
from concurrent.futures import ProcessPoolExecutor, as_completed
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi.responses import FileResponse

from .. import models, schemas, auth
from ..database import get_db, SessionLocal
from ..models import ProcessingStatus
from ..connection_manager import manager
from fastapi import WebSocket, WebSocketDisconnect

router = APIRouter(
    prefix="/media",
    tags=["Media"]
)

MEDIA_DIRECTORY = "/srv/signage-app/media_files"
THUMBNAIL_DIRECTORY = "/srv/signage-app/media_files/thumbnails"

# Configurări optimizare video (pot fi modificate prin API)
# Calculează procesele paralele optime bazat pe numărul de core-uri
def calculate_optimal_processes():
    cpu_count = multiprocessing.cpu_count()
    if cpu_count <= 4:
        return cpu_count
    elif cpu_count <= 8:
        return cpu_count - 1  # Lasă 1 core pentru sistem
    elif cpu_count <= 16:
        return cpu_count // 2  # Jumătate din core-uri
    else:
        return min(cpu_count // 3, 12)  # Pentru servere mari, max 12 procese paralele

MAX_PARALLEL_PROCESSES = calculate_optimal_processes()
USE_HARDWARE_ACCELERATION = True
FFMPEG_THREADS = 0  # 0 = utilizează toate core-urile disponibile
FFMPEG_PRESET = "faster"  # ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
FFMPEG_CRF = "23"  # 18-28 (mai mic = calitate mai bună, fișier mai mare)

def validate_ffmpeg_installation():
    """Validează că FFmpeg este instalat și funcțional"""
    try:
        result = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            version_line = result.stdout.split('\n')[0]
            print(f"INFO: FFmpeg detectat: {version_line}")
            return True
        else:
            print(f"EROARE: FFmpeg nu funcționează corect (exit code: {result.returncode})")
            return False
    except (FileNotFoundError, subprocess.TimeoutExpired, Exception) as e:
        print(f"EROARE: FFmpeg nu este instalat sau nu este în PATH: {e}")
        return False

# Validează FFmpeg la startup
if not validate_ffmpeg_installation():
    print("AVERTISMENT: FFmpeg nu funcționează corect. Re-encodingul video nu va funcționa!")

print(f"INFO: Configurație video encoding inițializată:")
print(f"  - CPU cores disponibile: {multiprocessing.cpu_count()}")
print(f"  - Max procese paralele: {MAX_PARALLEL_PROCESSES}")
print(f"  - Threads per proces FFmpeg: toate core-urile ({multiprocessing.cpu_count()})")
print(f"  - Accelerare hardware: {'Activată' if USE_HARDWARE_ACCELERATION else 'Dezactivată'}")
print(f"  - FFmpeg preset: {FFMPEG_PRESET}")
print(f"  - FFmpeg CRF: {FFMPEG_CRF}")
print(f"  - Scalabilitate estimată: {MAX_PARALLEL_PROCESSES * multiprocessing.cpu_count()} total threads")

# Salvează o referință la event loop-ul principal pentru WebSocket updates
_main_event_loop = None

def set_main_event_loop():
    """Salvează event loop-ul principal pentru utilizare din thread-uri"""
    global _main_event_loop
    try:
        _main_event_loop = asyncio.get_running_loop()
        print(f"DEBUG: Event loop principal salvat pentru WebSocket updates")
    except RuntimeError:
        print(f"DEBUG: Nu s-a putut salva event loop-ul principal")

os.makedirs(THUMBNAIL_DIRECTORY, exist_ok=True)

def detect_hardware_acceleration():
    """Detectează dacă accelerarea hardware este disponibilă"""
    print("INFO: Testez accelerarea hardware...")
    
    try:
        # Test VAAPI
        result = subprocess.run(
            ["ffmpeg", "-f", "lavfi", "-i", "testsrc=duration=1:size=320x240:rate=1", 
             "-f", "null", "-c:v", "h264_vaapi", "-"], 
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            print("INFO: VAAPI hardware acceleration detectată și disponibilă")
            return "vaapi"
        else:
            print(f"INFO: VAAPI nu este disponibil (exit code: {result.returncode})")
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
        print(f"INFO: VAAPI test eșuat: {e}")
    
    try:
        # Test NVENC
        result = subprocess.run(
            ["ffmpeg", "-f", "lavfi", "-i", "testsrc=duration=1:size=320x240:rate=1", 
             "-f", "null", "-c:v", "h264_nvenc", "-"], 
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            print("INFO: NVENC hardware acceleration detectată și disponibilă")
            return "nvenc"
        else:
            print(f"INFO: NVENC nu este disponibil (exit code: {result.returncode})")
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
        print(f"INFO: NVENC test eșuat: {e}")
    
    print("INFO: Nicio accelerare hardware detectată, se va folosi CPU")
    return None

# Cache pentru detectarea accelerării hardware
_hardware_accel_cache = None

def get_hardware_acceleration():
    global _hardware_accel_cache
    if _hardware_accel_cache is None:
        _hardware_accel_cache = detect_hardware_acceleration() if USE_HARDWARE_ACCELERATION else None
    return _hardware_accel_cache

def parse_ffmpeg_progress(line: str, total_duration: float):
    """Parsează o linie de progres FFmpeg și returnează progresul procentual"""
    # FFmpeg output format: frame=  123 fps= 45 q=28.0 size=    1024kB time=00:00:12.34 bitrate=1234.5kbits/s speed=1.23x
    time_match = re.search(r'time=(\d+):(\d+):(\d+\.\d+)', line)
    speed_match = re.search(r'speed=([0-9.]+)x', line)
    
    if time_match and total_duration > 0:
        hours = float(time_match.group(1))
        minutes = float(time_match.group(2))
        seconds = float(time_match.group(3))
        current_time = hours * 3600 + minutes * 60 + seconds
        
        progress = (current_time / total_duration) * 100
        speed = speed_match.group(1) + 'x' if speed_match else None
        
        # Calculează ETA
        eta = None
        if speed_match and progress > 0:
            speed_factor = float(speed_match.group(1))
            if speed_factor > 0:
                remaining_time = (total_duration - current_time) / speed_factor
                eta = int(remaining_time)
        
        return progress, eta, speed
    
    return None, None, None

def parse_ffmpeg_stderr(line: str, total_duration: float):
    """
    Parsează stderr-ul FFmpeg pentru informații de progress
    FFmpeg progress pe stderr arată ca:
    frame= 1234 fps= 25 q=28.0 size=    2048kB time=00:01:30.40 bitrate= 185.3kbits/s speed=1.23x
    """
    line = line.strip()
    
    # Verificare rapidă: linia trebuie să conțină toate elementele necesare
    if not ('frame=' in line and 'time=' in line and ('speed=' in line or 'fps=' in line)):
        return None, None, None
    
    try:
        # Extrage timpul curent (time=HH:MM:SS.ss)
        # Pattern mai flexibil pentru diferite formate de timp
        time_match = re.search(r'time=(\d{1,2}):(\d{2}):(\d{2}\.\d{2})', line)
        if not time_match or total_duration <= 0:
            return None, None, None
            
        hours = int(time_match.group(1))
        minutes = int(time_match.group(2))
        seconds = float(time_match.group(3))
        current_time = hours * 3600 + minutes * 60 + seconds
        
        # Calculează progresul procentual
        progress = min((current_time / total_duration) * 100, 100.0)
        if progress < 0:
            return None, None, None
        
        # Extrage viteza (speed=X.XXx) - pattern mai flexibil
        speed = None
        speed_match = re.search(r'speed=\s*([0-9.]+)x', line)
        if speed_match:
            speed_value = float(speed_match.group(1))
            # Formatare frumoasă pentru speed
            if speed_value >= 10:
                speed = f"{speed_value:.0f}x"
            elif speed_value >= 1:
                speed = f"{speed_value:.1f}x"
            else:
                speed = f"{speed_value:.2f}x"
        
        # Calculează ETA doar pentru progress semnificativ
        eta = None
        if speed_match and 5 <= progress < 99:  # Doar între 5% și 99%
            try:
                speed_factor = float(speed_match.group(1))
                if speed_factor > 0.1:  # Evită diviziunea cu valori foarte mici
                    remaining_duration = total_duration - current_time
                    if remaining_duration > 0:
                        eta_seconds = remaining_duration / speed_factor
                        # Limitează ETA la valori rezonabile (max 24 ore)
                        eta = int(min(eta_seconds, 24 * 3600))
            except (ValueError, ZeroDivisionError):
                pass
        
        return progress, eta, speed
        
    except (ValueError, AttributeError, TypeError):
        # Returnează None pentru linii care nu pot fi parsate
        return None, None, None

def update_progress(media_file_id: int, progress: float, eta: int = None, speed: str = None):
    """Actualizează progresul unui fișier în baza de date și trimite WebSocket update"""
    db = SessionLocal()
    try:
        media_file = db.query(models.MediaFile).filter(models.MediaFile.id == media_file_id).first()
        if media_file:
            media_file.processing_progress = min(progress, 100.0)
            if eta is not None:
                media_file.processing_eta = eta
            if speed is not None:
                media_file.processing_speed = speed
            db.commit()
            
            # Trimite WebSocket update
            progress_data = {
                "id": media_file.id,
                "filename": media_file.filename,
                "processing_status": media_file.processing_status.value,
                "processing_progress": media_file.processing_progress,
                "processing_eta": media_file.processing_eta,
                "processing_speed": media_file.processing_speed
            }
            
            # Trimite WebSocket update asincron din thread
            if _main_event_loop and not _main_event_loop.is_closed():
                try:
                    asyncio.run_coroutine_threadsafe(
                        manager.send_progress_update(media_file.uploaded_by_id, progress_data),
                        _main_event_loop
                    )
                except Exception as websocket_error:
                    print(f"DEBUG: Eroare WebSocket update: {websocket_error}")
            else:
                print(f"DEBUG: Nu pot trimite WebSocket update - event loop principal nu este disponibil")
            
    except Exception as e:
        print(f"EROARE la actualizarea progresului pentru media ID {media_file_id}: {e}")
    finally:
        db.close()

def parse_ffmpeg_progress(line: str, total_duration: float):
    """Parsează o linie de progres FFmpeg și returnează progresul procentual"""
    # FFmpeg output format: frame=  123 fps= 45 q=28.0 size=    1024kB time=00:00:12.34 bitrate=1234.5kbits/s speed=1.23x
    time_match = re.search(r'time=(\d+):(\d+):(\d+\.\d+)', line)
    speed_match = re.search(r'speed=([0-9.]+)x', line)
    
    if time_match and total_duration > 0:
        hours = float(time_match.group(1))
        minutes = float(time_match.group(2))
        seconds = float(time_match.group(3))
        current_time = hours * 3600 + minutes * 60 + seconds
        
        progress = (current_time / total_duration) * 100
        speed = speed_match.group(1) + 'x' if speed_match else None
        
        # Calculează ETA
        eta = None
        if speed_match and progress > 0:
            speed_factor = float(speed_match.group(1))
            if speed_factor > 0:
                remaining_time = (total_duration - current_time) / speed_factor
                eta = int(remaining_time)
        
        return progress, eta, speed
    
    return None, None, None

def run_ffmpeg_with_progress(command: list, media_file_id: int, total_duration: float):
    """Rulez FFmpeg cu tracking progress în timp real"""
    print(f"DEBUG: Pornesc FFmpeg cu progress tracking pentru media ID {media_file_id}, durată: {total_duration}s")
    
    # Adaugă parametrii pentru progres la comanda FFmpeg
    progress_command = command.copy()
    progress_command.insert(-2, '-progress')
    progress_command.insert(-1, 'pipe:1')
    
    process = subprocess.Popen(
        progress_command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        universal_newlines=True
    )
    
    last_update_time = time.time()
    
    # Citește output-ul în timp real
    for line in iter(process.stdout.readline, ''):
        line = line.strip()
        if not line:
            continue
            
        # Actualizează progresul doar la fiecare 2 secunde pentru a evita spam-ul
        current_time = time.time()
        if current_time - last_update_time >= 2.0:
            progress, eta, speed = parse_ffmpeg_progress(line, total_duration)
            if progress is not None:
                update_progress(media_file_id, progress, eta, speed)
                print(f"INFO: Progress media ID {media_file_id}: {progress:.1f}%, speed: {speed}, ETA: {eta}s")
                last_update_time = current_time
    
    # Așteaptă finalizarea procesului
    stdout, stderr = process.communicate()
    
    if process.returncode != 0:
        raise subprocess.CalledProcessError(process.returncode, progress_command, stdout, stderr)
    
    return subprocess.CompletedProcess(progress_command, process.returncode, stdout, stderr)

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

def run_ffmpeg_with_progress(command: list, media_file_id: int, total_duration: float):
    """Rulează FFmpeg cu progress tracking în timp real din stderr"""
    print(f"DEBUG: Pornesc FFmpeg cu progress tracking REAL pentru media ID {media_file_id}, durată: {total_duration}s")
    
    # Pornește procesul FFmpeg
    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        universal_newlines=True
    )
    
    last_progress_update = 0
    last_update_time = time.time()
    
    # Citește stderr în timp real pentru progress
    import threading
    def monitor_stderr():
        nonlocal last_progress_update, last_update_time
        
        while process.poll() is None:
            try:
                # Citește o linie din stderr
                line = process.stderr.readline()
                if not line:
                    continue
                    
                # Parsează linia pentru informații de progress
                progress, eta, speed = parse_ffmpeg_stderr(line, total_duration)
                
                current_time = time.time()
                # Actualizează progresul doar dacă:
                # 1. S-a schimbat cu cel puțin 1% SAU
                # 2. Au trecut cel puțin 3 secunde de la ultima actualizare
                if (progress is not None and 
                    (abs(progress - last_progress_update) >= 1.0 or 
                     current_time - last_update_time >= 3.0)):
                    
                    update_progress(media_file_id, progress, eta, speed)
                    print(f"INFO: Progress REAL media ID {media_file_id}: {progress:.1f}%, speed: {speed}, ETA: {eta}s")
                    last_progress_update = progress
                    last_update_time = current_time
                    
            except Exception as e:
                print(f"DEBUG: Eroare la citirea stderr FFmpeg: {e}")
                break
    
    # Pornește thread-ul de monitoring stderr
    stderr_thread = threading.Thread(target=monitor_stderr, daemon=True)
    stderr_thread.start()
    
    # Așteaptă finalizarea procesului principal
    stdout, stderr = process.communicate()
    
    # Așteaptă și thread-ul de monitoring să se termine
    stderr_thread.join(timeout=5)
    
    if process.returncode != 0:
        # Analizează ultima linie de stderr pentru informații de debugging
        if stderr:
            lines = stderr.strip().split('\n')
            for line in reversed(lines[-10:]):  # Ultimele 10 linii
                progress, eta, speed = parse_ffmpeg_stderr(line, total_duration)
                if progress is not None:
                    print(f"DEBUG: Ultima linie de progress detectată: {progress:.1f}% - {line}")
                    break
        
        raise subprocess.CalledProcessError(process.returncode, command, stdout, stderr)
    
    return subprocess.CompletedProcess(command, process.returncode, stdout, stderr)

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
        # Pasul 1: Setează statusul la PROCESSING și inițializează progress
        media_file_to_update.processing_status = ProcessingStatus.PROCESSING
        media_file_to_update.processing_progress = 0.0
        media_file_to_update.processing_started_at = datetime.now(timezone.utc)
        media_file_to_update.processing_eta = None
        media_file_to_update.processing_speed = None
        db.commit()
        print(f"INFO: Pornire procesare pentru fișierul: {original_path}")

        # Pasul 2: Generează thumbnail
        thumb_filename = f"{uuid.uuid4()}.jpg"
        thumbnail_full_path = f"{THUMBNAIL_DIRECTORY}/{thumb_filename}"
        if generate_thumbnail(original_path, thumbnail_full_path):
            media_file_to_update.thumbnail_path = thumb_filename
            db.commit()
            print(f"INFO: Thumbnail generat pentru media ID {media_file_id}.")

        # Pasul 3: Re-encodează video cu optimizări
        hw_accel = get_hardware_acceleration()
        
        # Verificăm dacă fișierul nu este deja în format optim
        try:
            probe = ffmpeg.probe(original_path)
            video_stream = next((stream for stream in probe['streams'] if stream['codec_type'] == 'video'), None)
            if video_stream:
                current_codec = video_stream.get('codec_name', '').lower()
                if current_codec == 'h264':
                    # Fișierul este deja H.264, verificăm dacă este nevoie de re-encoding
                    current_level = video_stream.get('level', 0)
                    current_profile = video_stream.get('profile', '').lower()
                    if current_profile in ['main', 'high'] and current_level <= 40:
                        print(f"INFO: Fișierul {original_path} este deja optimizat (H.264 {current_profile} level {current_level}), se sare re-encoding-ul")
                        # Mutăm fișierul la finalizar ea procesului fără re-encoding
                        media_file_to_update.processing_status = ProcessingStatus.COMPLETED
                        db.commit()
                        print(f"INFO: Statusul pentru media ID {media_file_id} a fost setat la FINALIZAT (fără re-encoding).")
                        return
        except Exception as probe_error:
            print(f"AVERTISMENT: Nu pot analiza fișierul {original_path}: {probe_error}. Continui cu re-encoding-ul.")
        
        if hw_accel == "vaapi":
            command = [
                "ffmpeg",
                "-hwaccel", "vaapi",
                "-hwaccel_device", "/dev/dri/renderD128",
                "-i", original_path,
                "-c:v", "h264_vaapi",
                "-profile:v", "main",
                "-level", "4.0",
                "-qp", FFMPEG_CRF,
                "-c:a", "aac",
                "-b:a", "128k",
                "-movflags", "+faststart",
                "-y",
                temp_output_path
            ]
        elif hw_accel == "nvenc":
            command = [
                "ffmpeg",
                "-hwaccel", "cuda",
                "-i", original_path,
                "-c:v", "h264_nvenc",
                "-profile:v", "main",
                "-level", "4.0",
                "-cq", FFMPEG_CRF,
                "-preset", "fast",
                "-c:a", "aac",
                "-b:a", "128k",
                "-movflags", "+faststart",
                "-y",
                temp_output_path
            ]
        else:
            # Fallback la CPU optimizat - comandă simplificată pentru depanare
            command = [
                "ffmpeg",
                "-i", original_path,
                "-c:v", "libx264",
                "-preset", FFMPEG_PRESET,
                "-crf", FFMPEG_CRF,
                "-c:a", "aac",
                "-b:a", "128k",
                "-movflags", "+faststart",
                "-y",
                temp_output_path
            ]
        
        print(f"INFO: Utilizez {hw_accel if hw_accel else 'CPU'} pentru re-encoding")
        print(f"DEBUG: Comanda completă FFmpeg: {' '.join(command)}")
        
        start_time = time.time()
        
        # Verificăm dacă fișierul de intrare există și este valid
        if not os.path.exists(original_path):
            raise Exception(f"Fișierul de intrare nu există: {original_path}")
        
        file_size = os.path.getsize(original_path)
        if file_size == 0:
            raise Exception(f"Fișierul de intrare este gol: {original_path}")
        
        print(f"INFO: Procesez fișierul {original_path} ({file_size / 1024 / 1024:.2f} MB)")
        
        # Obțin durata video pentru progress tracking
        video_duration = media_file_to_update.duration or 0.0
        if video_duration == 0.0:
            try:
                # Încerc să obțin durata din fișier
                probe = ffmpeg.probe(original_path)
                video_duration = float(probe['format']['duration'])
                # Actualizez în baza de date pentru viitor
                media_file_to_update.duration = video_duration
                db.commit()
            except Exception as e:
                print(f"AVERTISMENT: Nu pot obține durata video pentru {original_path}: {e}")
                video_duration = 0.0
        
        # Rulez comanda FFmpeg cu progress tracking
        result = run_ffmpeg_with_progress(command, media_file_id, video_duration)
        
        encoding_time = time.time() - start_time
        print(f"INFO: Re-encoding finalizat în {encoding_time:.2f} secunde pentru {original_path}")
        
        new_size = os.path.getsize(temp_output_path)
        shutil.move(temp_output_path, original_path)
        print(f"SUCCES: Fișierul video {original_path} a fost re-encodat.")

        # Pasul 4: Setează statusul la FINALIZAT și actualizează dimensiunea
        media_file_to_update.size = new_size
        media_file_to_update.processing_status = ProcessingStatus.COMPLETED
        media_file_to_update.processing_progress = 100.0
        media_file_to_update.processing_eta = 0
        db.commit()
        print(f"INFO: Statusul pentru media ID {media_file_id} a fost setat la FINALIZAT.")

    except subprocess.CalledProcessError as e:
        # În Python 3.12 stderr este deja string, nu bytes
        stderr_output = e.stderr if isinstance(e.stderr, str) else e.stderr.decode('utf-8', errors='ignore') if e.stderr else "N/A"
        stdout_output = e.stdout if isinstance(e.stdout, str) else e.stdout.decode('utf-8', errors='ignore') if e.stdout else "N/A"
        
        print(f"EROARE: Procesarea FFmpeg a eșuat pentru {original_path}")
        print(f"  - Exit code: {e.returncode}")
        print(f"  - Comandă: {' '.join(e.cmd)}")
        print(f"  - FFmpeg stderr: {stderr_output}")
        print(f"  - FFmpeg stdout: {stdout_output}")
        
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

def process_multiple_videos_parallel(video_tasks: List[tuple]):
    """
    Procesează mai multe video-uri în paralel utilizând ProcessPoolExecutor.
    video_tasks: Lista de tuple-uri (media_file_id, original_path)
    """
    if not video_tasks:
        return
    
    max_workers = min(MAX_PARALLEL_PROCESSES, len(video_tasks))
    print(f"INFO: Pornesc procesarea paralelă pentru {len(video_tasks)} video-uri cu {max_workers} worker-uri.")
    
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        # Lansează toate task-urile în paralel
        future_to_task = {
            executor.submit(process_video_background_task, task[0], task[1]): task 
            for task in video_tasks
        }
        
        # Așteaptă finalizarea tuturor task-urilor
        for future in as_completed(future_to_task):
            task = future_to_task[future]
            try:
                future.result()
                print(f"INFO: Finalizat cu succes procesarea pentru media ID {task[0]}")
            except Exception as e:
                print(f"EROARE: Procesarea a eșuat pentru media ID {task[0]}: {e}")

async def process_videos_batch(video_ids_and_paths: List[tuple]):
    """
    Procesează un batch de video-uri în mod asincron.
    Utilizează thread pool pentru a nu bloca event loop-ul.
    """
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None, 
        process_multiple_videos_parallel, 
        video_ids_and_paths
    )

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
    video_processing_queue = []  # Pentru procesarea în paralel
    
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
            video_processing_queue.append((db_media_file.id, file_path))
    
    # Procesează video-urile în paralel dacă sunt mai multe
    if video_processing_queue:
        if len(video_processing_queue) == 1:
            # Un singur video - folosește task-ul original
            background_tasks.add_task(process_video_background_task, video_processing_queue[0][0], video_processing_queue[0][1])
        else:
            # Mai multe video-uri - folosește procesarea în paralel
            background_tasks.add_task(process_videos_batch, video_processing_queue)
            print(f"INFO: Adăugat batch de {len(video_processing_queue)} video-uri pentru procesarea în paralel.")

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

@router.websocket("/progress/{user_id}")
async def websocket_progress_endpoint(websocket: WebSocket, user_id: int):
    """WebSocket endpoint pentru progress updates"""
    await manager.connect_user_progress(websocket, user_id)
    try:
        while True:
            # Menține conexiunea deschisă
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_user_progress(websocket, user_id)

@router.get("/encoding-stats")
async def get_encoding_stats(current_user: models.User = Depends(auth.get_current_user)):
    """Returnează statistici despre configurarea de encoding"""
    hw_accel = get_hardware_acceleration()
    ffmpeg_ok = validate_ffmpeg_installation()
    
    return {
        "hardware_acceleration": hw_accel or "CPU only",
        "max_parallel_processes": MAX_PARALLEL_PROCESSES,
        "cpu_cores": multiprocessing.cpu_count(),
        "ffmpeg_preset": FFMPEG_PRESET,
        "ffmpeg_crf": FFMPEG_CRF,
        "ffmpeg_threads": FFMPEG_THREADS if FFMPEG_THREADS > 0 else "auto (all cores)",
        "configuration_status": "optimized" if hw_accel else "cpu_optimized",
        "ffmpeg_status": "ok" if ffmpeg_ok else "error"
    }

@router.post("/optimize-settings")
async def update_optimization_settings(
    preset: Optional[str] = "faster",
    crf: Optional[int] = 23,
    max_parallel: Optional[int] = None,
    current_user: models.User = Depends(auth.get_current_user)
):
    """Actualizează setările de optimizare pentru encoding"""
    global FFMPEG_PRESET, FFMPEG_CRF, MAX_PARALLEL_PROCESSES
    
    # Validează parametrii
    valid_presets = ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"]
    if preset not in valid_presets:
        raise HTTPException(status_code=400, detail=f"Preset invalid. Utilizează unul din: {', '.join(valid_presets)}")
    
    if not 18 <= crf <= 28:
        raise HTTPException(status_code=400, detail="CRF trebuie să fie între 18 și 28")
    
    if max_parallel and not 1 <= max_parallel <= multiprocessing.cpu_count():
        raise HTTPException(status_code=400, detail=f"max_parallel trebuie să fie între 1 și {multiprocessing.cpu_count()}")
    
    # Actualizează setările
    FFMPEG_PRESET = preset
    FFMPEG_CRF = str(crf)
    if max_parallel:
        MAX_PARALLEL_PROCESSES = max_parallel
    
    return {
        "message": "Setările de optimizare au fost actualizate",
        "new_settings": {
            "preset": FFMPEG_PRESET,
            "crf": FFMPEG_CRF,
            "max_parallel_processes": MAX_PARALLEL_PROCESSES
        }
    }

@router.post("/test-hardware")
async def test_hardware_acceleration(current_user: models.User = Depends(auth.get_current_user)):
    """Testează și resetează cache-ul de detectare hardware"""
    global _hardware_accel_cache
    _hardware_accel_cache = None  # Resetează cache-ul
    
    # Verifică dacă FFmpeg funcționează
    ffmpeg_ok = validate_ffmpeg_installation()
    if not ffmpeg_ok:
        return {
            "hardware_acceleration_detected": None,
            "status": "ffmpeg_error",
            "message": "FFmpeg nu este instalat sau nu funcționează corect"
        }
    
    hw_accel = get_hardware_acceleration()
    
    return {
        "hardware_acceleration_detected": hw_accel,
        "status": "available" if hw_accel else "not_available",
        "message": f"Accelerarea hardware {hw_accel} detectată și disponibilă" if hw_accel else "Doar CPU disponibil pentru encoding",
        "ffmpeg_status": "ok"
    }

@router.post("/reset-stuck-processing")
async def reset_stuck_processing(current_user: models.User = Depends(auth.get_current_user)):
    """Resetează fișierele care sunt blocate în PROCESSING de mult timp"""
    db = SessionLocal()
    try:
        from datetime import timedelta
        
        # Găsește fișierele care sunt în PROCESSING de peste 30 minute
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=30)
        
        stuck_files = db.query(models.MediaFile).filter(
            models.MediaFile.uploaded_by_id == current_user.id,
            models.MediaFile.processing_status == ProcessingStatus.PROCESSING,
            models.MediaFile.processing_started_at < cutoff_time
        ).all()
        
        reset_count = 0
        for file in stuck_files:
            file.processing_status = ProcessingStatus.FAILED
            file.processing_progress = 0.0
            file.processing_eta = None
            file.processing_speed = None
            reset_count += 1
        
        db.commit()
        
        return {
            "message": f"{reset_count} fișiere blocate au fost resetate",
            "reset_count": reset_count
        }
        
    finally:
        db.close()
