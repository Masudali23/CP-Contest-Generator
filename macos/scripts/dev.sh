#!/usr/bin/env bash
#
# Starts the API and the Vite dev server together.
# Ctrl+C, or either server exiting, stops both.
#
#   npm run dev
#   bash scripts/dev.sh --backend-only
#   bash scripts/dev.sh --frontend-only
#
# Written for the bash 3.2 that ships with macOS and for BSD userland, so it
# avoids `wait -n`, `sed -u` and other GNU/bash-4 only features.
#
set -eo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

BACKEND_ONLY=0
FRONTEND_ONLY=0
for arg in "$@"; do
    case "$arg" in
        --backend-only)  BACKEND_ONLY=1 ;;
        --frontend-only) FRONTEND_ONLY=1 ;;
        -h|--help)       sed -n '2,9p' "${BASH_SOURCE[0]}"; exit 0 ;;
        *) echo "Unknown option: $arg" >&2; exit 1 ;;
    esac
done

CYAN=$'\033[36m'; GREEN=$'\033[32m'; MAGENTA=$'\033[35m'; DIM=$'\033[2m'; RED=$'\033[31m'; RESET=$'\033[0m'

require() {
    if [ ! -e "$1" ]; then
        printf '%sMissing: %s%s\n' "$RED" "$1" "$RESET"
        printf "Run 'npm run setup' first.\n"
        exit 1
    fi
}

if [ "$FRONTEND_ONLY" -eq 0 ]; then
    require "$BACKEND/node_modules"
    require "$BACKEND/.env"
fi
if [ "$BACKEND_ONLY" -eq 0 ]; then
    require "$FRONTEND/node_modules"
fi

PIDS=""

# npm spawns node as a child, so TERM has to reach the descendants too.
kill_tree() {
    local pid="$1"
    local child
    for child in $(pgrep -P "$pid" 2>/dev/null); do
        kill_tree "$child"
    done
    kill -TERM "$pid" 2>/dev/null || true
}

cleanup() {
    trap - INT TERM EXIT
    local pid
    for pid in $PIDS; do
        kill_tree "$pid"
    done
    wait 2>/dev/null || true
    printf '\n%sStopped.%s\n' "$DIM" "$RESET"
    # Exit from the handler so the watch loop below cannot print after this.
    exit 0
}
trap cleanup INT TERM EXIT

# Children inherit this terminal, so nodemon and Vite keep their own colours.
start() {
    local dir="$1" script="$2"
    ( cd "$dir" && exec npm run "$script" ) &
    PIDS="$PIDS $!"
}

printf '\n  %sCP Contest Generator - macOS development server%s\n' "$CYAN" "$RESET"
printf '  %s----------------------------------------------%s\n' "$DIM" "$RESET"

if [ "$FRONTEND_ONLY" -eq 0 ]; then
    start "$BACKEND" dev
    printf '  %sAPI       http://localhost:8000%s\n' "$GREEN" "$RESET"
    # Let the API print its banner before Vite starts writing.
    sleep 1.5
fi

if [ "$BACKEND_ONLY" -eq 0 ]; then
    start "$FRONTEND" dev
    printf '  %sFrontend  http://localhost:5173%s\n' "$MAGENTA" "$RESET"
fi

printf '  %sPress Ctrl+C to stop.%s\n\n' "$DIM" "$RESET"

# Poll instead of `wait -n`, which bash 3.2 does not have.
while :; do
    for pid in $PIDS; do
        if ! kill -0 "$pid" 2>/dev/null; then
            printf '\n  %sA server exited. Stopping the other one.%s\n' "$DIM" "$RESET"
            exit 0
        fi
    done
    sleep 0.5
done
