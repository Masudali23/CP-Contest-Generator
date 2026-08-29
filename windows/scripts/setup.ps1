#Requires -Version 5.1
<#
.SYNOPSIS
    One-shot setup for the Windows edition of CP Contest Generator.
.DESCRIPTION
    Checks the toolchain, installs npm dependencies for both apps, creates the
    .env files from their examples, generates a JWT secret and (optionally)
    creates the PostgreSQL database and schema.

    Everything runs natively on Windows. WSL, Docker and Linux are not used.
.EXAMPLE
    npm run setup
.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\setup.ps1 -SkipDatabase
#>
[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [switch]$SkipDatabase
)

$ErrorActionPreference = "Stop"

$root       = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"
$frontendDir= Join-Path $root "frontend"

function Write-Step  ($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Write-Ok    ($m) { Write-Host "    [ok] $m" -ForegroundColor Green }
function Write-Warn2 ($m) { Write-Host "    [!]  $m" -ForegroundColor Yellow }
function Write-Err   ($m) { Write-Host "    [x]  $m" -ForegroundColor Red }

# --------------------------------------------------------------- prerequisites
Write-Step "Checking prerequisites"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Err "Node.js was not found on PATH."
    Write-Host "    Install it with:  winget install OpenJS.NodeJS.LTS"
    Write-Host "    Then open a NEW terminal and run this script again."
    exit 1
}

# Vite 8 and ESLint 10 require ^20.19 || >=22.12 - the whole 21.x line is
# excluded, so a plain "major -ge 20" check is not enough.
$nodeVersion = (& node --version).TrimStart("v")
$nodeParts   = $nodeVersion.Split(".")
$nodeMajor   = [int]$nodeParts[0]
$nodeMinor   = [int]$nodeParts[1]

$nodeSupported = ($nodeMajor -eq 20 -and $nodeMinor -ge 19) -or ($nodeMajor -ge 22)

if (-not $nodeSupported) {
    Write-Err "Node.js v$nodeVersion is not supported. Need 20.19+ or 22.12+ (the 21.x line will not work)."
    Write-Host "    The backend runs on 21.x, but Vite crashes on it, so the frontend cannot build."
    Write-Host "    Install a supported version:"
    Write-Host "      winget install OpenJS.NodeJS.LTS"
    Write-Host "    Then open a NEW terminal and run this script again."
    exit 1
}
Write-Ok "Node.js v$nodeVersion"

$npmVersion = (& npm --version)
Write-Ok "npm v$npmVersion"

$psql = Get-Command psql -ErrorAction SilentlyContinue
if ($psql) {
    Write-Ok "psql found at $($psql.Source)"
} else {
    Write-Warn2 "psql is not on PATH. That is fine - the schema is created by Node."
    Write-Warn2 "You still need a running PostgreSQL server (winget install PostgreSQL.PostgreSQL.17)."
}

# ------------------------------------------------------------------ npm install
if (-not $SkipInstall) {
    Write-Step "Installing backend dependencies"
    Push-Location $backendDir
    & npm install
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Err "npm install failed in backend"; exit 1 }
    Pop-Location
    Write-Ok "backend/node_modules ready"

    Write-Step "Installing frontend dependencies"
    Push-Location $frontendDir
    & npm install
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Err "npm install failed in frontend"; exit 1 }
    Pop-Location
    Write-Ok "frontend/node_modules ready"
}

# ------------------------------------------------------------------- env files
Write-Step "Preparing environment files"

$backendEnv = Join-Path $backendDir ".env"
if (Test-Path $backendEnv) {
    Write-Ok "backend\.env already exists (left untouched)"
} else {
    Copy-Item (Join-Path $backendDir ".env.example") $backendEnv

    # A cryptographically random secret beats the placeholder in the example.
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secret = -join ($bytes | ForEach-Object { $_.ToString("x2") })

    (Get-Content $backendEnv) -replace '^JWT_SECRET=.*$', "JWT_SECRET=$secret" |
        Set-Content $backendEnv -Encoding UTF8

    Write-Ok "backend\.env created with a generated JWT_SECRET"
    Write-Warn2 "Fill in DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GEMINI_API_KEY."
}

$frontendEnv = Join-Path $frontendDir ".env"
if (Test-Path $frontendEnv) {
    Write-Ok "frontend\.env already exists (left untouched)"
} else {
    Copy-Item (Join-Path $frontendDir ".env.example") $frontendEnv
    Write-Ok "frontend\.env created"
}

# -------------------------------------------------------------------- database
if (-not $SkipDatabase) {
    Write-Step "Database schema"

    $envText = Get-Content $backendEnv -Raw
    if ($envText -match "(?m)^DATABASE_URL=(.+)$" -and $Matches[1].Trim() -notmatch "YOUR_PASSWORD") {
        Write-Host "    Creating tables via backend\scripts\initdb.js ..."
        Push-Location $backendDir
        & npm run db:init
        $dbExit = $LASTEXITCODE
        Pop-Location

        if ($dbExit -eq 0) {
            Write-Ok "Schema created / up to date"
        } else {
            Write-Warn2 "Schema setup failed. Check DATABASE_URL in backend\.env, then run: npm run db:init"
        }
    } else {
        Write-Warn2 "DATABASE_URL still holds a placeholder - edit backend\.env, then run: npm run db:init"
    }
}

# ----------------------------------------------------------------------- done
Write-Step "Setup complete"
Write-Host @"

Next steps:

  1. Edit backend\.env and fill in:
       DATABASE_URL           your local PostgreSQL connection string
       GOOGLE_CLIENT_ID       from https://console.cloud.google.com/apis/credentials
       GOOGLE_CLIENT_SECRET
       GEMINI_API_KEY         from https://aistudio.google.com/apikey (optional)

  2. Create the schema (if it was skipped above):
       npm run db:init

  3. Verify everything:
       npm run doctor

  4. Start both servers:
       npm run dev

     API      http://localhost:8000
     Frontend http://localhost:5173

"@ -ForegroundColor White
