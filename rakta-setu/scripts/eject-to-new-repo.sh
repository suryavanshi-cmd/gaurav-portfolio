#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
#  Move rakta-setu into its own standalone GitHub repository.
#
#  1. Create an EMPTY repo on GitHub (no README, no .gitignore, no licence):
#         https://github.com/new     →  name it  rakta-setu
#  2. Run this script from inside the rakta-setu/ folder:
#         bash scripts/eject-to-new-repo.sh <your-github-username>
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

USERNAME="${1:-}"
REPO_NAME="${2:-rakta-setu}"

if [ -z "$USERNAME" ]; then
  echo "Usage: bash scripts/eject-to-new-repo.sh <github-username> [repo-name]" >&2
  exit 1
fi

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$(dirname "$SRC")/${REPO_NAME}-standalone"

if [ -e "$DEST" ]; then
  echo "❌ $DEST already exists. Remove it or pass a different repo name." >&2
  exit 1
fi

echo "→ Copying project to $DEST"
mkdir -p "$DEST"
# Everything except local state — node_modules, the database, and any real
# patient files that may be sitting in inbox/archive/failed.
tar -C "$SRC" \
    --exclude='./node_modules' \
    --exclude='./data' \
    --exclude='./inbox' \
    --exclude='./archive' \
    --exclude='./failed' \
    --exclude='./.env' \
    --exclude='./.git' \
    -cf - . | tar -C "$DEST" -xf -

cd "$DEST"

if [ -f .env ]; then
  echo "❌ Refusing to continue: a .env file was copied. Delete it first." >&2
  exit 1
fi

echo "→ Initialising git repository"
git init -q -b main
git add -A
git -c user.email="${GIT_AUTHOR_EMAIL:-$(git config user.email || echo you@example.com)}" \
    -c user.name="${GIT_AUTHOR_NAME:-$(git config user.name || echo "$USERNAME")}" \
    commit -q -m "रक्त-सेतू: WhatsApp blood-report delivery with a Marathi voice report page"

git remote add origin "https://github.com/${USERNAME}/${REPO_NAME}.git"

echo ""
echo "✅ Ready at: $DEST"
echo ""
echo "   Push it with:"
echo "       cd \"$DEST\""
echo "       git push -u origin main"
echo ""
