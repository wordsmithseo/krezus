#!/bin/bash
set -e

MSG="${1:-deploy $(date '+%Y-%m-%d %H:%M')}"

echo "📦 Buduję..."
npm run build

echo "🚀 Deployuję na GitHub..."
git add -A
git commit -m "$MSG" 2>/dev/null || echo "Brak zmian do commita"
git push origin main

echo "✅ Gotowe! Vercel deployuje automatycznie z main."
