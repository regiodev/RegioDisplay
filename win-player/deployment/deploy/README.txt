# Regio Windows Player Deployment Package

This package contains the Regio Windows Player application and installation scripts.

## System Requirements
- Windows 10 Pro (64-bit) or Windows 11 Pro (64-bit)
- .NET 6 Desktop Runtime (will be installed automatically)
- 4GB RAM minimum (8GB recommended)
- 100GB storage for media cache
- Stable internet connection (minimum 10 Mbps)

## Installation Instructions

### Automatic Installation (Recommended)
1. Right-click on install.ps1 and select "Run with PowerShell"
2. When prompted, select "Yes" to run as Administrator
3. Follow the on-screen instructions

### Manual Installation
1. Open PowerShell as Administrator
2. Navigate to this directory
3. Run: .\install.ps1

### Installation Options
- Custom install path: .\install.ps1 -InstallPath "C:\CustomPath\RegioPlayer"
- Skip .NET check: .\install.ps1 -SkipDotNetCheck
- Disable auto-start: .\install.ps1 -EnableAutoStart:False

## Configuration
The application will create its configuration and cache in:
- Configuration: %LOCALAPPDATA%\RegioWindowsPlayer\config.json
- Cache: %LOCALAPPDATA%\RegioWindowsPlayer\Cache\
- Logs: %LOCALAPPDATA%\RegioWindowsPlayer\logs\

## Kiosk Mode
The application automatically enables kiosk mode features:
- Hides taskbar and start button
- Prevents Alt+Tab and Windows key
- Configures auto-start on boot
- Prevents system sleep

## Pairing Process
1. Start the application
2. Note the 6-character pairing code displayed
3. Visit https://display.regio-cloud.ro
4. Log in to your account
5. Add a new screen using the pairing code
6. The player will automatically start when pairing is complete

## Debugging
- Triple-press Ctrl to open settings panel
- Press F12 in debug builds to toggle debug information
- Check logs in %LOCALAPPDATA%\RegioWindowsPlayer\logs\

## Support
For technical support, contact your system administrator or
visit the Regio support documentation.

Version: 1.0.0
Built: 2025-08-22 17:31:56
