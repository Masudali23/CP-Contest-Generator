#Requires -Version 5.1
<#
.SYNOPSIS
    Diagnoses a Windows setup: toolchain, ports, env files, database and cache.
.EXAMPLE
    npm run doctor
#>
$ErrorActionPreference = "Continue"

$root        = Split-Path -Parent $PSScriptRoot
$backendDir  = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

function Write-Step ($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Write-Ok   ($m) { Write-Host "    [ok] $m" -ForegroundColor Green }
function Write-Bad  ($m) { Write-Host "    [x]  $m" -ForegroundColor Red }
function Write-Note ($m) { Write-Host "    [!]  $m" -ForegroundColor Yellow }

Write-Step "Toolchain"
foreach ($tool in @("node", "npm", "git")) {
    $command = Get-Command $tool -ErrorAction SilentlyContinue
    if ($command) { Write-Ok "$tool $(& $tool --version 2>&1 | Select-Object -First 1)" }
    else { Write-Bad "$tool not found on PATH" }
}

Write-Step "Windows environment"
Write-Ok "PowerShell $($PSVersionTable.PSVersion)"
Write-Ok "OS $([System.Environment]::OSVersion.VersionString)"
Write-Note "This edition runs natively - WSL is not used or required."

Write-Step "Project files"
foreach ($item in @(
    @{ Path = (Join-Path $backendDir  "node_modules"); Label = "backend\node_modules" },
    @{ Path = (Join-Path $frontendDir "node_modules"); Label = "frontend\node_modules" },
    @{ Path = (Join-Path $backendDir  ".env");         Label = "backend\.env" },
    @{ Path = (Join-Path $frontendDir ".env");         Label = "frontend\.env" }
)) {
    if (Test-Path $item.Path) { Write-Ok "$($item.Label) present" }
    else { Write-Bad "$($item.Label) missing - run 'npm run setup'" }
}

Write-Step "Ports"
foreach ($port in @(8000, 5173, 5432, 6379)) {
    $inUse = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    $label = switch ($port) { 8000 { "API" } 5173 { "Vite" } 5432 { "PostgreSQL" } 6379 { "Redis / Memurai" } }

    if ($inUse) {
        $owner = (Get-Process -Id $inUse[0].OwningProcess -ErrorAction SilentlyContinue).ProcessName
        Write-Ok "$port ($label) in use by $owner"
    } elseif ($port -eq 5432) {
        Write-Bad "$port ($label) not listening - start the PostgreSQL service"
    } elseif ($port -eq 6379) {
        Write-Note "$port ($label) not listening - fine, the in-memory cache takes over"
    } else {
        Write-Note "$port ($label) free"
    }
}

Write-Step "PostgreSQL service"
$service = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($service) {
    foreach ($entry in $service) {
        if ($entry.Status -eq "Running") { Write-Ok "$($entry.Name) is $($entry.Status)" }
        else { Write-Bad "$($entry.Name) is $($entry.Status) - run: Start-Service $($entry.Name)" }
    }
} else {
    Write-Note "No local PostgreSQL service found (fine if you use a hosted database such as Neon)"
}

Write-Step "Backend self-check"
if (Test-Path (Join-Path $backendDir "node_modules")) {
    Push-Location $backendDir
    & npm run doctor
    Pop-Location
} else {
    Write-Bad "Skipped - install dependencies first with 'npm run setup'"
}
