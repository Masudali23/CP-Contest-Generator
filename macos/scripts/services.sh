#!/usr/bin/env bash
#
# Starts or stops the Homebrew services this project can use.
# Redis is optional: without it the API uses an in-memory cache.
#
#   npm run services:start
#   npm run services:stop
#
set -euo pipefail

ACTION="${1:-status}"

GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RESET=$'\033[0m'

if ! command -v brew >/dev/null 2>&1; then
    echo "Homebrew is not installed - nothing to manage." >&2
    exit 1
fi

# Match postgresql, postgresql@16, postgresql@17, ...
pg_formula() {
    brew list --formula 2>/dev/null | grep -E '^postgresql(@[0-9.]+)?$' | head -1
}

case "$ACTION" in
    start)
        PG="$(pg_formula || true)"
        if [ -n "$PG" ]; then
            brew services start "$PG"
            printf '%sPostgreSQL (%s) started%s\n' "$GREEN" "$PG" "$RESET"
        else
            printf '%sPostgreSQL is not installed: brew install postgresql@16%s\n' "$YELLOW" "$RESET"
        fi

        if brew list --formula 2>/dev/null | grep -qx redis; then
            brew services start redis
            printf '%sRedis started - set REDIS_URL=redis://localhost:6379 in backend/.env to use it%s\n' "$GREEN" "$RESET"
        else
            printf '%sRedis is not installed (optional): brew install redis%s\n' "$YELLOW" "$RESET"
        fi
        ;;

    stop)
        PG="$(pg_formula || true)"
        [ -n "$PG" ] && brew services stop "$PG" || true
        brew list --formula 2>/dev/null | grep -qx redis && brew services stop redis || true
        echo "Services stopped."
        ;;

    status|*)
        brew services list | grep -E '^(postgresql|redis)' || echo "Neither PostgreSQL nor Redis is installed via Homebrew."
        ;;
esac
