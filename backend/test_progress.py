#!/usr/bin/env python3
"""
Script de test pentru progress tracking
Rulează acest script pentru a testa funcționalitatea de progress
"""

import sys
import os
import time

# Adaugă path-ul pentru a importa modulele
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_progress():
    """Test simplu pentru progress tracking"""
    try:
        from app.routers.media_router import parse_ffmpeg_stderr
        
        # Test parse_ffmpeg_stderr cu linii reale de FFmpeg
        test_lines = [
            "frame=  123 fps= 25 q=28.0 size=    1024kB time=00:01:30.50 bitrate= 185.3kbits/s speed=1.23x",
            "frame=  456 fps= 30 q=25.0 size=    2048kB time=00:03:00.25 bitrate= 227.1kbits/s speed=2.45x",
            "frame= 1234 fps= 28 q=26.0 size=    5120kB time=00:05:45.80 bitrate= 148.7kbits/s speed=1.85x",
            # Test cu diverse formate
            "frame= 2468 fps=35.2 q=24.0 size=   10240kB time=00:10:30.40 bitrate= 162.4kbits/s speed=2.1x",
            "frame= 3333 fps=40 q=27.0 size=   15360kB time=00:15:15.60 bitrate= 168.9kbits/s speed=   3x"
        ]
        
        total_duration = 1800.0  # 30 minute video
        
        print("Testing real FFmpeg stderr parsing:")
        for i, line in enumerate(test_lines, 1):
            progress, eta, speed = parse_ffmpeg_stderr(line, total_duration)
            print(f"Test {i}:")
            print(f"  Input: {line}")
            print(f"  Output: Progress={progress}%, ETA={eta}s, Speed={speed}")
            print()
        
        print("✅ Test parse_ffmpeg_stderr - SUCCESS")
        
    except Exception as e:
        print(f"❌ Test parse_ffmpeg_stderr - FAILED: {e}")
        import traceback
        traceback.print_exc()

def test_regex():
    """Test pentru regex patterns"""
    import re
    
    test_lines = [
        "frame=  123 fps= 25 q=28.0 size=    1024kB time=00:01:30.50 bitrate= 185.3kbits/s speed=1.23x",
        "frame=  456 fps= 30 q=25.0 size=    2048kB time=00:03:00.25 bitrate= 227.1kbits/s speed=2.45x",
        "frame= 3333 fps=40 q=27.0 size=   15360kB time=00:15:15.60 bitrate= 168.9kbits/s speed=   3x"
    ]
    
    # Regex patterns pentru FFmpeg output real
    time_pattern = r'time=(\d{2}):(\d{2}):(\d{2}\.\d{2})'
    speed_pattern = r'speed=\s*([0-9.]+)x'
    
    print("Testing regex patterns on real FFmpeg output:")
    for i, line in enumerate(test_lines, 1):
        time_match = re.search(time_pattern, line)
        speed_match = re.search(speed_pattern, line)
        
        print(f"Test {i}:")
        print(f"  Line: {line}")
        print(f"  Time match: {time_match.groups() if time_match else 'None'}")
        print(f"  Speed match: {speed_match.group(1) if speed_match else 'None'}")
        
        if time_match:
            hours, minutes, seconds = time_match.groups()
            total_seconds = int(hours) * 3600 + int(minutes) * 60 + float(seconds)
            print(f"  Total seconds: {total_seconds}")
        
        print("-" * 50)

if __name__ == "__main__":
    print("🧪 Testing progress tracking functionality...")
    print("=" * 60)
    
    print("\n1. Testing regex patterns:")
    test_regex()
    
    print("\n2. Testing progress parsing:")
    test_progress()
    
    print("\n✅ All tests completed!")