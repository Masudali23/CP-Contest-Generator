#Requires -Version 5.1
<#
.SYNOPSIS
    Starts the API and the Vite dev server together, natively on Windows.
.DESCRIPTION
    Both servers are launched as child processes that share this console, so
    nodemon and Vite print their own coloured output exactly as they would if
    you ran them in two terminals. Ctrl+C, or either server exiting, tears the
    whole tree down via taskkill /T.

    No WSL, no Docker, no extra npm packages.
.PARAMETER BackendOnly
    Start only the API.
.PARAMETER FrontendOnly
    Start only the Vite dev server.
.EXAMPLE
    npm run dev
.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\dev.ps1 -BackendOnly
#>
[CmdletBinding()]
param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"

$root        = Split-Path -Parent $PSScriptRoot
$backendDir  = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

function Assert-Path {
    param([string]$Path, [string]$Hint)
    if (-not (Test-Path $Path)) {
        Write-Host "Missing: $Path" -ForegroundColor Red
        Write-Host $Hint -ForegroundColor Yellow
        exit 1
    }
}

if (-not $FrontendOnly) {
    Assert-Path (Join-Path $backendDir "node_modules") "Run 'npm run setup' first."
    Assert-Path (Join-Path $backendDir ".env")         "Run 'npm run setup' first."
}
if (-not $BackendOnly) {
    Assert-Path (Join-Path $frontendDir "node_modules") "Run 'npm run setup' first."
}

function Start-DevProcess {
    param([string]$Directory, [string]$Script)

    # npm on Windows is npm.cmd, so it has to be invoked through cmd.exe.
    # UseShellExecute = $false without redirection lets the child write straight
    # to this console, which keeps nodemon's and Vite's own colours intact.
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName         = $env:ComSpec
    $info.Arguments        = "/c npm run $Script"
    $info.WorkingDirectory = $Directory
    $info.UseShellExecute  = $false

    return [System.Diagnostics.Process]::Start($info)
}

$processes = @()

Write-Host ""
Write-Host "  CP Contest Generator - Windows development server" -ForegroundColor Cyan
Write-Host "  -------------------------------------------------" -ForegroundColor DarkGray

try {
    if (-not $FrontendOnly) {
        $processes += Start-DevProcess -Directory $backendDir -Script "dev"
        Write-Host "  API       http://localhost:8000" -ForegroundColor Green
        # Let the API print its startup banner before Vite starts writing.
        Start-Sleep -Milliseconds 1500
    }

    if (-not $BackendOnly) {
        $processes += Start-DevProcess -Directory $frontendDir -Script "dev"
        Write-Host "  Frontend  http://localhost:5173" -ForegroundColor Magenta
    }

    Write-Host "  Press Ctrl+C to stop." -ForegroundColor DarkGray
    Write-Host ""

    while ($true) {
        foreach ($process in $processes) {
            if ($process.HasExited) {
                Write-Host ""
                Write-Host "  A server exited with code $($process.ExitCode). Stopping the other one." -ForegroundColor Yellow
                return
            }
        }
        Start-Sleep -Milliseconds 500
    }
}
finally {
    foreach ($process in $processes) {
        if ($process -and -not $process.HasExited) {
            # /T kills the node.exe that the cmd.exe shim spawned, not just the shim.
            & taskkill /PID $process.Id /T /F 2>&1 | Out-Null
        }
    }
    Write-Host "  Stopped." -ForegroundColor DarkGray
}
