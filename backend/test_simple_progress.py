#!/usr/bin/env python3
"""
Test simplu pentru progress parsing fără dependințe
"""

import re

def parse_ffmpeg_stderr(line: str, total_duration: float):
    """
    Parsează stderr-ul FFmpeg pentru informații de progress - versiune test
    """
    line = line.strip()
    
    # Verificare rapidă
    if not ('frame=' in line and 'time=' in line and ('speed=' in line or 'fps=' in line)):
        return None, None, None
    
    try:
        # Extrage timpul curent
        time_match = re.search(r'time=(\d{1,2}):(\d{2}):(\d{2}\.\d{2})', line)
        if not time_match or total_duration <= 0:
            return None, None, None
            
        hours = int(time_match.group(1))
        minutes = int(time_match.group(2))
        seconds = float(time_match.group(3))
        current_time = hours * 3600 + minutes * 60 + seconds
        
        # Calculează progresul
        progress = min((current_time / total_duration) * 100, 100.0)
        if progress < 0:
            return None, None, None
        
        # Extrage viteza
        speed = None
        speed_match = re.search(r'speed=\s*([0-9.]+)x', line)
        if speed_match:
            speed_value = float(speed_match.group(1))
            if speed_value >= 10:
                speed = f"{speed_value:.0f}x"
            elif speed_value >= 1:
                speed = f"{speed_value:.1f}x"
            else:
                speed = f"{speed_value:.2f}x"
        
        # Calculează ETA
        eta = None
        if speed_match and 5 <= progress < 99:
            try:
                speed_factor = float(speed_match.group(1))
                if speed_factor > 0.1:
                    remaining_duration = total_duration - current_time
                    if remaining_duration > 0:
                        eta_seconds = remaining_duration / speed_factor
                        eta = int(min(eta_seconds, 24 * 3600))
            except (ValueError, ZeroDivisionError):
                pass
        
        return progress, eta, speed
        
    except (ValueError, AttributeError, TypeError):
        return None, None, None

def test_real_parsing():
    """Test pentru parsing real"""
    
    test_cases = [
        {
            "line": "frame=  123 fps= 25 q=28.0 size=    1024kB time=00:01:30.50 bitrate= 185.3kbits/s speed=1.23x",
            "duration": 600.0,  # 10 min video
            "expected_progress": 15.08  # 90.5 / 600 * 100
        },
        {
            "line": "frame=  456 fps= 30 q=25.0 size=    2048kB time=00:03:00.25 bitrate= 227.1kbits/s speed=2.45x",
            "duration": 1800.0,  # 30 min video
            "expected_progress": 10.01  # 180.25 / 1800 * 100
        },
        {
            "line": "frame= 3333 fps=40 q=27.0 size=   15360kB time=00:15:15.60 bitrate= 168.9kbits/s speed=   3x",
            "duration": 1800.0,  # 30 min video
            "expected_progress": 50.87  # 915.6 / 1800 * 100
        },
        {
            "line": "frame= 5000 fps=35 q=25.0 size=   25600kB time=00:29:45.80 bitrate= 143.2kbits/s speed=2.1x",
            "duration": 1800.0,  # 30 min video
            "expected_progress": 99.21  # Aproape de final
        }
    ]
    
    print("🧪 Testing Real FFmpeg Progress Parsing")
    print("=" * 60)
    
    all_passed = True
    
    for i, test in enumerate(test_cases, 1):
        progress, eta, speed = parse_ffmpeg_stderr(test["line"], test["duration"])
        
        print(f"Test {i}:")
        print(f"  Input: {test['line'][:80]}...")
        print(f"  Duration: {test['duration']}s")
        print(f"  Expected Progress: ~{test['expected_progress']:.1f}%")
        print(f"  Actual Progress: {progress:.1f}%" if progress else "  Actual Progress: None")
        print(f"  Speed: {speed}")
        print(f"  ETA: {eta}s" if eta else "  ETA: None")
        
        if progress is not None:
            diff = abs(progress - test["expected_progress"])
            if diff <= 1.0:  # Toleranță de 1%
                print(f"  ✅ PASS (diff: {diff:.2f}%)")
            else:
                print(f"  ❌ FAIL (diff: {diff:.2f}%)")
                all_passed = False
        else:
            print(f"  ❌ FAIL (no progress detected)")
            all_passed = False
        
        print("-" * 50)
    
    print(f"\n{'✅ All tests PASSED!' if all_passed else '❌ Some tests FAILED!'}")
    
    return all_passed

if __name__ == "__main__":
    test_real_parsing()