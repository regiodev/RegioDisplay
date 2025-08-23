# Build and Deploy Regio Windows Player
# This script builds the application and prepares deployment package

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("Debug", "Release")]
    [string]$Configuration = "Release",
    
    [Parameter(Mandatory=$false)]
    [string]$OutputPath = ".\deploy",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$CreateZip = $true
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message, [string]$Level = "Info")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "Error" { "Red" }
        "Warning" { "Yellow" }
        "Info" { "Green" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

try {
    Write-Log "Starting Regio Windows Player build and deployment process..." -Level Info
    
    # Get script directory and solution path
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $solutionDir = Split-Path -Parent $scriptDir
    $solutionFile = Join-Path $solutionDir "RegioWindowsPlayer.sln"
    
    # Verify solution exists
    if (!(Test-Path $solutionFile)) {
        throw "Solution file not found: $solutionFile"
    }
    
    Write-Log "Solution directory: $solutionDir" -Level Info
    Write-Log "Configuration: $Configuration" -Level Info
    
    # Build the solution
    if (!$SkipBuild) {
        Write-Log "Building solution..." -Level Info
        
        # Restore NuGet packages
        Write-Log "Restoring NuGet packages..." -Level Info
        & dotnet restore $solutionFile
        if ($LASTEXITCODE -ne 0) {
            throw "NuGet restore failed"
        }
        
        # Build solution
        Write-Log "Building solution in $Configuration configuration..." -Level Info
        & dotnet build $solutionFile -c $Configuration --no-restore
        if ($LASTEXITCODE -ne 0) {
            throw "Build failed"
        }
        
        # Publish the UI project
        $uiProjectPath = Join-Path $solutionDir "src\RegioPlayer.UI\RegioPlayer.UI.csproj"
        Write-Log "Publishing UI project..." -Level Info
        & dotnet publish $uiProjectPath -c $Configuration -r win-x64 --self-contained false -o "$solutionDir\src\RegioPlayer.UI\bin\$Configuration\net6.0-windows\publish"
        if ($LASTEXITCODE -ne 0) {
            throw "Publish failed"
        }
    }
    else {
        Write-Log "Skipping build as requested" -Level Warning
    }
    
    # Create deployment directory
    $deployPath = Join-Path $scriptDir $OutputPath
    if (Test-Path $deployPath) {
        Remove-Item $deployPath -Recurse -Force
    }
    New-Item -ItemType Directory -Path $deployPath -Force | Out-Null
    
    Write-Log "Deployment directory: $deployPath" -Level Info
    
    # Copy published application
    $publishedPath = Join-Path $solutionDir "src\RegioPlayer.UI\bin\$Configuration\net6.0-windows\publish"
    if (!(Test-Path $publishedPath)) {
        throw "Published application not found at: $publishedPath"
    }
    
    Write-Log "Copying application files..." -Level Info
    $appDir = Join-Path $deployPath "RegioWindowsPlayer"
    Copy-Item -Path $publishedPath -Destination $appDir -Recurse -Force
    
    # Copy deployment scripts
    Write-Log "Copying deployment scripts..." -Level Info
    Copy-Item -Path (Join-Path $scriptDir "install.ps1") -Destination $deployPath -Force
    
    # Create README for deployment
    $readmeContent = @"
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
1. Right-click on `install.ps1` and select "Run with PowerShell"
2. When prompted, select "Yes" to run as Administrator
3. Follow the on-screen instructions

### Manual Installation
1. Open PowerShell as Administrator
2. Navigate to this directory
3. Run: `.\install.ps1`

### Installation Options
- Custom install path: `.\install.ps1 -InstallPath "C:\CustomPath\RegioPlayer"`
- Skip .NET check: `.\install.ps1 -SkipDotNetCheck`
- Disable auto-start: `.\install.ps1 -EnableAutoStart:$false`

## Configuration
The application will create its configuration and cache in:
- Configuration: `%LOCALAPPDATA%\RegioWindowsPlayer\config.json`
- Cache: `%LOCALAPPDATA%\RegioWindowsPlayer\Cache\`
- Logs: `%LOCALAPPDATA%\RegioWindowsPlayer\logs\`

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
- Check logs in `%LOCALAPPDATA%\RegioWindowsPlayer\logs\`

## Support
For technical support, contact your system administrator or
visit the Regio support documentation.

Version: 1.0.0
Built: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@
    
    $readmeContent | Out-File -FilePath (Join-Path $deployPath "README.txt") -Encoding UTF8
    
    # Create version info file
    $versionInfo = @{
        Version = "1.0.0"
        BuildDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Configuration = $Configuration
        Framework = "net6.0-windows"
        Runtime = "win-x64"
    } | ConvertTo-Json -Depth 2
    
    $versionInfo | Out-File -FilePath (Join-Path $deployPath "version.json") -Encoding UTF8
    
    # Create zip package if requested
    if ($CreateZip) {
        Write-Log "Creating zip package..." -Level Info
        $zipPath = Join-Path $scriptDir "RegioWindowsPlayer-v1.0.0-$(Get-Date -Format 'yyyyMMdd').zip"
        
        if (Test-Path $zipPath) {
            Remove-Item $zipPath -Force
        }
        
        Compress-Archive -Path "$deployPath\*" -DestinationPath $zipPath -CompressionLevel Optimal
        Write-Log "Zip package created: $zipPath" -Level Info
    }
    
    Write-Log "Build and deployment completed successfully!" -Level Info
    Write-Log "Deployment package location: $deployPath" -Level Info
    
    if ($CreateZip) {
        Write-Log "Zip package location: $zipPath" -Level Info
    }
    
    Write-Log "To install on target machine, copy deployment files and run install.ps1 as Administrator" -Level Info
}
catch {
    Write-Log "Build and deployment failed: $($_.Exception.Message)" -Level Error
    exit 1
}