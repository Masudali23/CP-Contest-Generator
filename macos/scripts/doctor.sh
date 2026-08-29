#!/usr/bin/env bash
#
# Diagnoses a macOS setup: toolchain, services, ports, env files, database and cache.
#
#   npm run doctor
#
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

BOLD=$'\033[1m'; CYAN=$'\033[36m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; RESET=$'\033[0m'
step() { printf '\n%s==> %s%s\n' "$CYAN$BOLD" "$1" "$RESET"; }
ok()   { printf '    %s[ok]%s %s\n' "$GREEN" "$RESET" "$1"; }
warn() { printf '    %s[!]%s  %s\n' "$YELLOW" "$RESET" "$1"; }
bad()  { printf '    %s[x]%s  %s\n' "$RED" "$RESET" "$1"; }

step "System"
ok "macOS $(sw_vers -productVersion 2>/dev/null || echo unknown) on $(uname -m)"
[ "$(uname -m)" = "arm64" ] && ok "Apple silicon - Homebrew prefix should be /opt/homebrew"

step "Toolchain"
for tool in node npm git brew psql; do
    if command -v "$tool" >/dev/null 2>&1; then
        ok "$tool $("$tool" --version 2>&1 | head -1)"
    elif [ "$tool" = "psql" ]; then
        warn "psql not on PATH (optional - the schema is created by Node)"
    else
        bad "$tool not found on PATH"
    fi
done

step "Homebrew services"
if command -v brew >/dev/null 2>&1; then
    brew services list 2>/dev/null | grep -E '^(postgresql|redis)' | while read -r line; do
        if echo "$line" | grep -q started; then ok "$line"; else warn "$line"; fi
    done
    brew services list 2>/dev/null | grep -qE '^postgresql' || warn "PostgreSQL not installed: brew install postgresql@16"
else
    bad "Homebrew not installed"
fi

step "Project files"
for entry in "$BACKEND/node_modules:backend/node_modules" \
             "$FRONTEND/node_modules:frontend/node_modules" \
             "$BACKEND/.env:backend/.env" \
             "$FRONTEND/.env:frontend/.env"; do
    path="${entry%%:*}"; label="${entry##*:}"
    if [ -e "$path" ]; then ok "$label present"; else bad "$label missing - run 'npm run setup'"; fi
done

step "Ports"
for pair in "8000:API" "5173:Vite" "5432:PostgreSQL" "6379:Redis"; do
    port="${pair%%:*}"; label="${pair##*:}"
    owner="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | awk 'NR==2 {print $1}')"

    if [ -n "$owner" ]; then
        ok "$port ($label) in use by $owner"
    elif [ "$port" = "5432" ]; then
        bad "$port ($label) not listening - run: npm run services:start"
    elif [ "$port" = "6379" ]; then
        warn "$port ($label) not listening - fine, the in-memory cache takes over"
    else
        warn "$port ($label) free"
    fi
done

step "Backend self-check"
if [ -d "$BACKEND/node_modules" ]; then
    (cd "$BACKEND" && npm run --silent doctor)
else
    bad "Skipped - install dependencies first with 'npm run setup'"
fi
