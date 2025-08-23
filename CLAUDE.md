# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RegioDisplay is a multi-platform digital signage solution consisting of four main components:

1. **Backend** - FastAPI Python server with WebSocket support
2. **Web Frontend** - React/Vite admin interface  
3. **Android Player** - Kotlin/Compose TV application
4. **Windows Player** - WPF .NET 6 application

## Architecture

### Backend (FastAPI Python)
- **Location**: `backend/app/`
- **Entry Point**: `main.py`
- **Database**: PostgreSQL with SQLAlchemy
- **Real-time**: WebSocket communication for live updates
- **Media**: File upload/serving with thumbnail generation

### Web Frontend (React/Vite)
- **Location**: `signage-frontend/`
- **Framework**: React 19 + Vite + TailwindCSS
- **Components**: Radix UI components in `src/components/ui/`
- **State**: Context API with AuthContext
- **Routing**: React Router DOM v7

### Android Player (Kotlin/Compose)
- **Location**: `RegioPlayerV2/`  
- **Target**: Android TV/tablets (minSdk 21, targetSdk 35)
- **Media**: ExoPlayer (Media3) for video/audio playback
- **UI**: Jetpack Compose TV with Material Design
- **Networking**: Retrofit + OkHttp WebSockets

### Windows Player (WPF .NET 6)
- **Location**: `win-player/src/`
- **Framework**: WPF with MVVM pattern
- **Architecture**: Clean Architecture with 4 projects:
  - `RegioPlayer.Core` - Business logic
  - `RegioPlayer.Infrastructure` - External services
  - `RegioPlayer.UI` - WPF interface
  - `RegioPlayer.Windows` - Windows-specific features
- **Media**: FFME for video, WebView2 for web content

## Development Commands

### Backend
```bash
cd backend/app
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Web Frontend
```bash
cd signage-frontend
npm install
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint checking
```

### Android Player
```bash
cd RegioPlayerV2
./gradlew assembleDebug        # Build debug APK
./gradlew assembleRelease      # Build release APK
./gradlew installDebug         # Install debug on device
```

### Windows Player
```bash
cd win-player
dotnet restore RegioWindowsPlayer.sln
dotnet build RegioWindowsPlayer.sln -c Release
# Or use deployment script:
powershell -ExecutionPolicy Bypass -File "deployment\build-and-deploy.ps1"
```

## Key Technical Details

### Communication Protocol
All players communicate with backend via:
- **WebSocket**: `wss://display.regio-cloud.ro/api/ws/connect/{screen_key}`
- **HTTP API**: REST endpoints with `X-Screen-Key` header authentication
- **Message Types**: `device_info`, `ping`, `playlist_updated`, `screen_deleted`

### Media Types Supported
- **Video**: mp4, avi, mkv (via ExoPlayer/FFME)
- **Images**: jpg, png, gif
- **Web Content**: URLs with configurable refresh intervals
- **Audio**: mp3, wav

### Screen Management
- **Pairing**: 6-character codes for device registration
- **Rotation**: 0°, 90°, 180°, 270° support
- **Kiosk Mode**: Full-screen operation with system key disabling

### Build Notes

#### Windows Player Current Status
- Architecture is complete with all business logic implemented
- Minor compilation errors need fixing before build:
  - WebView2 API signature corrections in `WebContentControl.xaml.cs`
  - FFME event handler signatures in `VideoPlayerControl.xaml`
  - Readonly field modifier in `PlayerScreen.xaml.cs`
- Once fixed, deployment script creates production installer

#### Common Dependencies
- Backend requires PostgreSQL database connection
- Web frontend expects backend API at configurable URL
- Players cache media locally and sync via WebSocket
- All components support hot-reload development mode

## Project Structure
```
RegioDisplay/
├── backend/              # FastAPI Python server
├── signage-frontend/     # React admin interface  
├── RegioPlayerV2/        # Android TV player
└── win-player/          # Windows WPF player
```