#!/bin/bash
set -euo pipefail

REPO_DIR="/Users/abelyagubyan/flipsnbidz"
cd "$REPO_DIR"

if [ ! -f .env ]; then
  echo "Missing $REPO_DIR/.env"
  echo "Copy .env.example to .env and fill in the required values first."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing backend dependencies..."
  npm install
fi

if [ ! -d admin/node_modules ]; then
  echo "Installing admin dependencies..."
  (cd admin && npm install)
fi

echo "Starting Flips & Bidz site + admin..."
echo "Backend/site: http://localhost:3000"
echo "Admin:        http://localhost:3000/admin"
echo

auto_env_nextauth="http://localhost:3000/admin"
export NEXTAUTH_URL="${NEXTAUTH_URL:-$auto_env_nextauth}"

npm run dev
