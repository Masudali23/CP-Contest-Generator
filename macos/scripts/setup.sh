#!/usr/bin/env bash
#
# One-shot setup for the macOS edition of CP Contest Generator.
#
# Checks the toolchain, installs npm dependencies for both apps, creates the
# .env files, generates a JWT secret and creates the PostgreSQL database and
# schema. Works on both Apple silicon (/opt/homebrew) and Intel (/usr/local).
#
#   npm run setup
#   bash scripts/setup.sh --skip-db
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

SKIP_INSTALL=0
SKIP_DB=0
for arg in "$@"; do
    case "$arg" in
        --skip-install) SKIP_INSTALL=1 ;;
        --skip-db)      SKIP_DB=1 ;;
        -h|--help)      sed -n '2,12p' "${BASH_SOURCE[0]}"; exit 0 ;;
        *) echo "Unknown option: $arg" >&2; exit 1 ;;
    esac
done

BOLD=$'\033[1m'; CYAN=$'\033[36m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; RESET=$'\033[0m'
step() { printf '\n%s==> %s%s\n' "$CYAN$BOLD" "$1" "$RESET"; }
ok()   { printf '    %s[ok]%s %s\n' "$GREEN" "$RESET" "$1"; }
warn() { printf '    %s[!]%s  %s\n' "$YELLOW" "$RESET" "$1"; }
fail() { printf '    %s[x]%s  %s\n' "$RED" "$RESET" "$1"; }

DB_NAME="${DB_NAME:-cp_contest}"

# ---------------------------------------------------------------- prerequisites
step "Checking prerequisites"

printf '    macOS %s (%s)\n' "$(sw_vers -productVersion 2>/dev/null || echo unknown)" "$(uname -m)"

if ! command -v brew >/dev/null 2>&1; then
    fail "Homebrew was not found."
    echo '    Install it with:'
    echo '      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    echo '    On Apple silicon, follow the "Next steps" it prints to add brew to your PATH.'
    exit 1
fi
ok "Homebrew $(brew --version | head -1 | awk '{print $2}') at $(brew --prefix)"

if ! command -v node >/dev/null 2>&1; then
    fail "Node.js was not found. Install it with:  brew install node"
    exit 1
fi

# Vite 8 and ESLint 10 require ^20.19 || >=22.12 - the whole 21.x line is
# excluded, so a plain "major >= 20" check is not enough.
NODE_VERSION="$(node --version | sed 's/^v//')"
NODE_MAJOR="$(echo "$NODE_VERSION" | cut -d. -f1)"
NODE_MINOR="$(echo "$NODE_VERSION" | cut -d. -f2)"

node_supported() {
    if [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -ge 19 ]; then return 0; fi
    if [ "$NODE_MAJOR" -ge 22 ]; then return 0; fi
    return 1
}

if ! node_supported; then
    fail "Node.js v$NODE_VERSION is not supported. Need 20.19+ or 22.12+ (the 21.x line will not work)."
    echo '    The backend runs on 21.x, but Vite crashes on it, so the frontend cannot build.'
    echo '    Fix with Homebrew:'
    echo '      brew install node@22'
    echo '      brew link --overwrite --force node@22'
    echo '    or with nvm:'
    echo '      nvm install 22 && nvm use 22'
    exit 1
fi
ok "Node.js v$NODE_VERSION, npm v$(npm --version)"

if command -v psql >/dev/null 2>&1; then
    ok "psql $(psql --version | awk '{print $3}')"
else
    warn "psql is not on PATH. The schema is created by Node, so this is optional,"
    warn "but you still need a running server:  brew install postgresql@16"
fi

# ------------------------------------------------------------------- services
step "Local services"

if brew services list 2>/dev/null | grep -qE '^postgresql(@[0-9.]+)?[[:space:]]+started'; then
    ok "PostgreSQL is running"
    PG_RUNNING=1
elif brew list --formula 2>/dev/null | grep -qE '^postgresql(@[0-9.]+)?$'; then
    warn "PostgreSQL is installed but not running. Start it with:  npm run services:start"
    PG_RUNNING=0
else
    warn "PostgreSQL is not installed. Either:"
    warn "  brew install postgresql@16 && brew services start postgresql@16"
    warn "  ...or use a free hosted database such as Neon and set DATABASE_URL yourself."
    PG_RUNNING=0
fi

if brew services list 2>/dev/null | grep -qE '^redis[[:space:]]+started'; then
    ok "Redis is running - set REDIS_URL=redis://localhost:6379 in backend/.env to use it"
else
    warn "Redis is not running. That is fine: the API falls back to an in-memory cache."
fi

# ----------------------------------------------------------------- npm install
if [ "$SKIP_INSTALL" -eq 0 ]; then
    step "Installing backend dependencies"
    (cd "$BACKEND" && npm install)
    ok "backend/node_modules ready"

    step "Installing frontend dependencies"
    (cd "$FRONTEND" && npm install)
    ok "frontend/node_modules ready"
fi

# ------------------------------------------------------------------ env files
step "Preparing environment files"

if [ -f "$BACKEND/.env" ]; then
    ok "backend/.env already exists (left untouched)"
else
    cp "$BACKEND/.env.example" "$BACKEND/.env"

    SECRET="$(node -e 'console.log(require("crypto").randomBytes(48).toString("hex"))')"
    # BSD sed needs an explicit (empty) backup suffix for -i.
    sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=$SECRET|" "$BACKEND/.env"

    if [ "$PG_RUNNING" -eq 1 ]; then
        # Homebrew's PostgreSQL creates a superuser named after your account
        # and trusts local connections, so no password is needed.
        sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://$(whoami)@localhost:5432/$DB_NAME|" "$BACKEND/.env"
        ok "backend/.env created with a generated JWT_SECRET and a local DATABASE_URL"
    else
        ok "backend/.env created with a generated JWT_SECRET"
    fi

    warn "Fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GEMINI_API_KEY."
fi

if [ -f "$FRONTEND/.env" ]; then
    ok "frontend/.env already exists (left untouched)"
else
    cp "$FRONTEND/.env.example" "$FRONTEND/.env"
    ok "frontend/.env created"
fi

# -------------------------------------------------------------------- database
if [ "$SKIP_DB" -eq 0 ]; then
    step "Database"

    if [ "$PG_RUNNING" -eq 1 ] && command -v createdb >/dev/null 2>&1; then
        if psql -lqt 2>/dev/null | cut -d'|' -f1 | grep -qw "$DB_NAME"; then
            ok "Database '$DB_NAME' already exists"
        else
            createdb "$DB_NAME" && ok "Database '$DB_NAME' created"
        fi
    fi

    if grep -q '^DATABASE_URL=.*YOUR_PASSWORD' "$BACKEND/.env"; then
        warn "DATABASE_URL still holds a placeholder - edit backend/.env, then run: npm run db:init"
    else
        if (cd "$BACKEND" && npm run --silent db:init); then
            ok "Schema created / up to date"
        else
            warn "Schema setup failed. Check DATABASE_URL in backend/.env, then run: npm run db:init"
        fi
    fi
fi

# ------------------------------------------------------------------------ done
step "Setup complete"
cat <<'NEXT'

Next steps:

  1. Edit backend/.env and fill in:
       GOOGLE_CLIENT_ID       from https://console.cloud.google.com/apis/credentials
       GOOGLE_CLIENT_SECRET
       GEMINI_API_KEY         from https://aistudio.google.com/apikey (optional)

  2. Verify everything:
       npm run doctor

  3. Start both servers:
       npm run dev

     API      http://localhost:8000
     Frontend http://localhost:5173

NEXT
