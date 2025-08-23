# Regio Windows Player Installation Script
# Requires Administrator privileges

param(
    [Parameter(Mandatory=$false)]
    [string]$InstallPath = "C:\Program Files\RegioWindowsPlayer",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDotNetCheck = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$CreateDesktopShortcut = $true,
    
    [Parameter(Mandatory=$false)]
    [switch]$EnableAutoStart = $true
)

# Colors for output
$ErrorColor = "Red"
$WarningColor = "Yellow"
$InfoColor = "Green"
$DebugColor = "Cyan"

function Write-Log {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [ValidateSet("Info", "Warning", "Error", "Debug")]
        [string]$Level = "Info"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    switch ($Level) {
        "Error"   { Write-Host $logMessage -ForegroundColor $ErrorColor }
        "Warning" { Write-Host $logMessage -ForegroundColor $WarningColor }
        "Info"    { Write-Host $logMessage -ForegroundColor $InfoColor }
        "Debug"   { Write-Host $logMessage -ForegroundColor $DebugColor }
    }
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-DotNet6Runtime {
    Write-Log "Checking .NET 6 Desktop Runtime..." -Level Info
    
    if ($SkipDotNetCheck) {
        Write-Log "Skipping .NET runtime check as requested" -Level Warning
        return
    }
    
    try {
        $dotnetVersion = & dotnet --version 2>$null
        if ($LASTEXITCODE -eq 0 -and $dotnetVersion -ge "6.0") {
            Write-Log ".NET 6 or later is already installed: $dotnetVersion" -Level Info
            return
        }
    }
    catch {
        Write-Log ".NET runtime not found or version check failed" -Level Warning
    }
    
    Write-Log "Installing .NET 6 Desktop Runtime..." -Level Info
    
    $dotnetUrl = "https://aka.ms/dotnet/6.0/windowsdesktop-runtime-win-x64.exe"
    $dotnetInstaller = "$env:TEMP\dotnet-runtime-installer.exe"
    
    try {
        Write-Log "Downloading .NET 6 Desktop Runtime..." -Level Info
        Invoke-WebRequest -Uri $dotnetUrl -OutFile $dotnetInstaller -UseBasicParsing
        
        # Verify the download was successful
        if (!(Test-Path $dotnetInstaller)) {
            throw "Failed to download .NET installer"
        }
        
        Write-Log "Running .NET installer..." -Level Info
        $process = Start-Process -FilePath $dotnetInstaller -ArgumentList "/quiet", "/norestart" -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Write-Log ".NET 6 Desktop Runtime installed successfully" -Level Info
        }
        else {
            Write-Log ".NET installer returned exit code: $($process.ExitCode)" -Level Warning
        }
        
        Remove-Item $dotnetInstaller -Force -ErrorAction SilentlyContinue
    }
    catch {
        Write-Log "Failed to install .NET 6 Runtime: $($_.Exception.Message)" -Level Error
        throw
    }
}

function Install-Application {
    Write-Log "Installing Regio Windows Player to: $InstallPath" -Level Info
    
    try {
        # Create installation directory
        if (!(Test-Path $InstallPath)) {
            New-Item -ItemType Directory -Force -Path $InstallPath | Out-Null
            Write-Log "Created installation directory: $InstallPath" -Level Info
        }
        
        # Copy application files
        # Get the script directory with fallbacks
        $scriptDir = $null
        if ($PSScriptRoot) {
            $scriptDir = $PSScriptRoot
        } elseif ($MyInvocation.MyCommand.Path) {
            $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
        } else {
            $scriptDir = Get-Location
        }
        
        Write-Log "Script directory detected as: $scriptDir" -Level Debug
        
        # Try multiple possible paths for the application files
        $possiblePaths = @(
            (Join-Path $scriptDir "..\src\RegioPlayer.UI\bin\Release\net6.0-windows\publish"),
            (Join-Path $scriptDir "RegioWindowsPlayer"),
            (Join-Path $scriptDir "..\RegioWindowsPlayer"), 
            (Join-Path $scriptDir "app"),
            (Join-Path $scriptDir "bin"),
            (Join-Path $scriptDir "RegioPlayer.UI"),
            $scriptDir
        )
        
        $sourcePath = $null
        foreach ($path in $possiblePaths) {
            Write-Log "Checking path: $path" -Level Debug
            if ($path) {
                $exePath = Join-Path $path "RegioPlayer.UI.exe"
                Write-Log "Looking for executable at: $exePath" -Level Debug
                if (Test-Path $exePath) {
                    $sourcePath = $path
                    Write-Log "Found application files at: $sourcePath" -Level Info
                    break
                }
            } else {
                Write-Log "Skipping null path" -Level Debug
            }
        }
        
        if (-not $sourcePath) {
            Write-Log "Application files not found in any of the following locations:" -Level Error
            foreach ($path in $possiblePaths) {
                Write-Log "  - $path" -Level Error
            }
            Write-Log "Please ensure the application files are present in the package." -Level Error
            throw "Application files not found"
        }
        
        Write-Log "Copying application files..." -Level Info
        Copy-Item -Path "$sourcePath\*" -Destination $InstallPath -Recurse -Force
        
        Write-Log "Application files copied successfully" -Level Info
        
        # Create WebView2 data directory with proper permissions
        $webView2DataDir = Join-Path $env:LOCALAPPDATA "RegioWindowsPlayer\WebView2"
        if (!(Test-Path $webView2DataDir)) {
            New-Item -ItemType Directory -Force -Path $webView2DataDir | Out-Null
            Write-Log "Created WebView2 data directory: $webView2DataDir" -Level Info
        }
        
        # Set full permissions for current user on WebView2 directory
        try {
            $acl = Get-Acl $webView2DataDir
            $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
            $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule($currentUser, "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
            $acl.SetAccessRule($accessRule)
            Set-Acl -Path $webView2DataDir -AclObject $acl
            Write-Log "Set permissions for WebView2 data directory" -Level Info
        }
        catch {
            Write-Log "Warning: Could not set WebView2 directory permissions: $($_.Exception.Message)" -Level Warning
        }
    }
    catch {
        Write-Log "Failed to install application: $($_.Exception.Message)" -Level Error
        throw
    }
}

function Create-Shortcuts {
    if ($CreateDesktopShortcut) {
        try {
            Write-Log "Creating desktop shortcut..." -Level Info
            
            $shell = New-Object -ComObject WScript.Shell
            $desktopPath = [System.Environment]::GetFolderPath('Desktop')
            $shortcutPath = Join-Path $desktopPath "Regio Windows Player.lnk"
            $shortcut = $shell.CreateShortcut($shortcutPath)
            $shortcut.TargetPath = Join-Path $InstallPath "RegioPlayer.UI.exe"
            $shortcut.WorkingDirectory = $InstallPath
            $shortcut.Description = "Regio Digital Signage Player"
            $shortcut.IconLocation = Join-Path $InstallPath "RegioPlayer.UI.exe"
            $shortcut.Save()
            
            Write-Log "Desktop shortcut created" -Level Info
        }
        catch {
            Write-Log "Failed to create desktop shortcut: $($_.Exception.Message)" -Level Warning
        }
    }
}

function Setup-AutoStart {
    if ($EnableAutoStart) {
        try {
            Write-Log "Setting up auto-start..." -Level Info
            
            $registryPath = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
            $appPath = Join-Path $InstallPath "RegioPlayer.UI.exe"
            
            Set-ItemProperty -Path $registryPath -Name "RegioWindowsPlayer" -Value "`"$appPath`""
            
            Write-Log "Auto-start configured successfully" -Level Info
        }
        catch {
            Write-Log "Failed to setup auto-start: $($_.Exception.Message)" -Level Warning
        }
    }
}

function Create-UninstallEntry {
    try {
        Write-Log "Creating uninstall registry entry..." -Level Info
        
        $uninstallPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\RegioWindowsPlayer"
        
        if (!(Test-Path $uninstallPath)) {
            New-Item -Path $uninstallPath -Force | Out-Null
        }
        
        $uninstallScript = Join-Path $InstallPath "uninstall.ps1"
        
        # Create uninstall script
        @"
# Regio Windows Player Uninstall Script
Write-Host "Uninstalling Regio Windows Player..." -ForegroundColor Yellow

# Remove auto-start entry
Remove-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" -Name "RegioWindowsPlayer" -ErrorAction SilentlyContinue

# Remove desktop shortcut
`$desktopShortcut = Join-Path ([System.Environment]::GetFolderPath('Desktop')) "Regio Windows Player.lnk"
Remove-Item `$desktopShortcut -Force -ErrorAction SilentlyContinue

# Remove registry entry
Remove-Item "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\RegioWindowsPlayer" -Force -ErrorAction SilentlyContinue

# Remove installation directory
Remove-Item "$InstallPath" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Regio Windows Player uninstalled successfully" -ForegroundColor Green
"@ | Out-File -FilePath $uninstallScript -Encoding UTF8
        
        # Set registry values
        Set-ItemProperty -Path $uninstallPath -Name "DisplayName" -Value "Regio Windows Player"
        Set-ItemProperty -Path $uninstallPath -Name "DisplayVersion" -Value "1.0.0"
        Set-ItemProperty -Path $uninstallPath -Name "Publisher" -Value "Regio"
        Set-ItemProperty -Path $uninstallPath -Name "InstallLocation" -Value $InstallPath
        Set-ItemProperty -Path $uninstallPath -Name "UninstallString" -Value "powershell.exe -ExecutionPolicy Bypass -File `"$uninstallScript`""
        Set-ItemProperty -Path $uninstallPath -Name "NoModify" -Value 1 -Type DWord
        Set-ItemProperty -Path $uninstallPath -Name "NoRepair" -Value 1 -Type DWord
        
        Write-Log "Uninstall entry created successfully" -Level Info
    }
    catch {
        Write-Log "Failed to create uninstall entry: $($_.Exception.Message)" -Level Warning
    }
}

function Test-Prerequisites {
    Write-Log "Checking prerequisites..." -Level Info
    
    # Check Windows version
    $version = [System.Environment]::OSVersion.Version
    if ($version.Major -lt 10) {
        Write-Log "Windows 10 or later is required. Current version: $($version.ToString())" -Level Error
        throw "Unsupported Windows version"
    }
    
    Write-Log "Windows version check passed: $($version.ToString())" -Level Info
    
    # Check available disk space (require at least 1GB)
    $drive = Split-Path $InstallPath -Qualifier
    $freeSpace = (Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DeviceID -eq $drive }).FreeSpace
    $requiredSpace = 1GB
    
    if ($freeSpace -lt $requiredSpace) {
        Write-Log "Insufficient disk space. Required: 1GB, Available: $([math]::Round($freeSpace/1GB, 2))GB" -Level Error
        throw "Insufficient disk space"
    }
    
    Write-Log "Disk space check passed: $([math]::Round($freeSpace/1GB, 2))GB available" -Level Info
}

# Main installation process
try {
    Write-Log "Starting Regio Windows Player installation..." -Level Info
    
    # Check if running as administrator
    if (!(Test-Administrator)) {
        Write-Log "This script requires Administrator privileges. Please run as Administrator." -Level Error
        exit 1
    }
    
    # Check prerequisites
    Test-Prerequisites
    
    # Install .NET 6 Runtime
    Install-DotNet6Runtime
    
    # Install application
    Install-Application
    
    # Create shortcuts
    Create-Shortcuts
    
    # Setup auto-start
    Setup-AutoStart
    
    # Create uninstall entry
    Create-UninstallEntry
    
    Write-Log "Installation completed successfully!" -Level Info
    Write-Log "Regio Windows Player has been installed to: $InstallPath" -Level Info
    
    if ($EnableAutoStart) {
        Write-Log "The application will start automatically on next boot." -Level Info
    }
    
    Write-Log "To start the application now, run: $InstallPath\RegioPlayer.UI.exe" -Level Info
    
    # Offer to start the application
    $startNow = Read-Host "Start Regio Windows Player now? (y/n)"
    if ($startNow -eq 'y' -or $startNow -eq 'Y') {
        Start-Process -FilePath (Join-Path $InstallPath "RegioPlayer.UI.exe") -WorkingDirectory $InstallPath
        Write-Log "Application started" -Level Info
    }
}
catch {
    Write-Log "Installation failed: $($_.Exception.Message)" -Level Error
    Write-Log "Please check the error above and try again." -Level Error
    exit 1
}

Write-Log "Installation script completed." -Level Info