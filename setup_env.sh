#!/bin/bash
# ============================================================
# Setup Script - Bitácora E.E. Sistema Enterprise
# Linux / macOS
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "═══════════════════════════════════════════════════════"
echo "  🚀 Bitácora E.E. — Configuración de Entorno"
echo "═══════════════════════════════════════════════════════"
echo ""

# ── 1. Docker Services ──
echo "📦 Levantando servicios Docker (PostgreSQL 16 + Redis 7)..."
docker-compose up -d
echo "   ✅ Servicios Docker listos."
echo ""

# ── 2. Python Virtual Environment ──
echo "🐍 Configurando entorno virtual Python..."
if [ ! -d "backend/venv" ]; then
    python3 -m venv backend/venv
    echo "   ✅ Entorno virtual creado."
else
    echo "   ℹ️  Entorno virtual ya existe."
fi

source backend/venv/bin/activate

echo "📥 Instalando dependencias Python..."
pip install --upgrade pip --quiet
pip install -r backend/requirements.txt --quiet
echo "   ✅ Dependencias Python instaladas."
echo ""

# ── 3. Playwright ──
echo "🎭 Instalando Playwright Chromium..."
playwright install chromium --with-deps 2>/dev/null || playwright install chromium
echo "   ✅ Playwright configurado."
echo ""

# ── 4. Django Setup ──
echo "🔧 Configurando Django..."
cd backend

echo "   → Ejecutando migraciones..."
python manage.py makemigrations buses --no-input
python manage.py migrate --no-input

echo "   → Sembrando datos iniciales y módulos dinámicos..."
python manage.py seed_data

cd ..

# ── 5. Frontend ──
echo ""
echo "⚛️  Configurando Frontend React..."
cd frontend

if [ ! -d "node_modules" ]; then
    npm install
    echo "   ✅ Dependencias Node.js instaladas."
else
    echo "   ℹ️  node_modules ya existe. Ejecutando npm install para actualizar..."
    npm install
fi

cd ..

# ── 6. Summary ──
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ Entorno configurado correctamente"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  Para iniciar el desarrollo:"
echo ""
echo "  Backend:"
echo "    source backend/venv/bin/activate"
echo "    cd backend && python manage.py runserver"
echo ""
echo "  Celery Worker:"
echo "    cd backend && celery -A config worker -l info"
echo ""
echo "  Celery Beat:"
echo "    cd backend && celery -A config beat -l info"
echo ""
echo "  Frontend:"
echo "    cd frontend && npm run dev"
echo ""
echo "  URLs:"
echo "    API:      http://localhost:8000/api/"
echo "    Admin:    http://localhost:8000/admin/"
echo "    Frontend: http://localhost:5173/"
echo ""
