# Simple build script - just build the solution
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
    Write-Log "Starting simple build..." -Level Info
    
    # Get script directory and solution path
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $solutionDir = Split-Path -Parent $scriptDir
    $solutionFile = Join-Path $solutionDir "RegioWindowsPlayer.sln"
    
    Write-Log "Solution: $solutionFile" -Level Info
    
    # Build only the UI project which will pull in dependencies
    $uiProject = Join-Path $solutionDir "src\RegioPlayer.UI\RegioPlayer.UI.csproj"
    
    Write-Log "Cleaning previous build..." -Level Info
    & dotnet clean $uiProject -c Release
    
    Write-Log "Restoring packages..." -Level Info
    & dotnet restore $uiProject
    if ($LASTEXITCODE -ne 0) {
        throw "Package restore failed"
    }
    
    Write-Log "Building UI project..." -Level Info
    & dotnet build $uiProject -c Release --no-restore
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
    
    Write-Log "Build completed successfully!" -Level Info
    Write-Log "Build output: $solutionDir\src\RegioPlayer.UI\bin\Release\net6.0-windows\" -Level Info
}
catch {
    Write-Log "Build failed: $($_.Exception.Message)" -Level Error
    exit 1
}