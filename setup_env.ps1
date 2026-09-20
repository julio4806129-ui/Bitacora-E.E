# ============================================================
# Setup Script - Bitácora E.E. Sistema Enterprise
# Windows PowerShell
# ============================================================

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 Bitácora E.E. — Configuración de Entorno" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── 1. Docker Services ──
Write-Host "📦 Levantando servicios Docker (PostgreSQL 16 + Redis 7)..." -ForegroundColor Yellow
docker-compose up -d
Write-Host "   ✅ Servicios Docker listos." -ForegroundColor Green
Write-Host ""

# ── 2. Python Virtual Environment ──
Write-Host "🐍 Configurando entorno virtual Python..." -ForegroundColor Yellow

if (-not (Test-Path "backend\venv")) {
    python -m venv backend\venv
    Write-Host "   ✅ Entorno virtual creado." -ForegroundColor Green
} else {
    Write-Host "   ℹ️  Entorno virtual ya existe." -ForegroundColor Blue
}

& backend\venv\Scripts\Activate.ps1

Write-Host "📥 Instalando dependencias Python..." -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet
pip install -r backend\requirements.txt --quiet
Write-Host "   ✅ Dependencias Python instaladas." -ForegroundColor Green
Write-Host ""

# ── 3. Playwright ──
Write-Host "🎭 Instalando Playwright Chromium..." -ForegroundColor Yellow
try {
    playwright install chromium
} catch {
    Write-Host "   ⚠️  Playwright instalación manual puede ser necesaria." -ForegroundColor DarkYellow
}
Write-Host "   ✅ Playwright configurado." -ForegroundColor Green
Write-Host ""

# ── 4. Django Setup ──
Write-Host "🔧 Configurando Django..." -ForegroundColor Yellow
Push-Location backend

Write-Host "   → Ejecutando migraciones..."
python manage.py makemigrations buses --no-input
python manage.py migrate --no-input

Write-Host "   → Sembrando datos iniciales y módulos dinámicos..."
python manage.py seed_data

Pop-Location

# ── 5. Frontend ──
Write-Host ""
Write-Host "⚛️  Configurando Frontend React..." -ForegroundColor Yellow
Push-Location frontend

if (-not (Test-Path "node_modules")) {
    npm install
    Write-Host "   ✅ Dependencias Node.js instaladas." -ForegroundColor Green
} else {
    Write-Host "   ℹ️  node_modules ya existe. Actualizando..." -ForegroundColor Blue
    npm install
}

Pop-Location

# ── 6. Summary ──
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ Entorno configurado correctamente" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Para iniciar el desarrollo:" -ForegroundColor White
Write-Host ""
Write-Host "  Backend:" -ForegroundColor Cyan
Write-Host "    backend\venv\Scripts\Activate.ps1"
Write-Host "    cd backend; python manage.py runserver"
Write-Host ""
Write-Host "  Celery Worker:" -ForegroundColor Cyan
Write-Host "    cd backend; celery -A config worker -l info"
Write-Host ""
Write-Host "  Celery Beat:" -ForegroundColor Cyan
Write-Host "    cd backend; celery -A config beat -l info"
Write-Host ""
Write-Host "  Frontend:" -ForegroundColor Cyan
Write-Host "    cd frontend; npm run dev"
Write-Host ""
Write-Host "  URLs:" -ForegroundColor Cyan
Write-Host "    API:      http://localhost:8000/api/"
Write-Host "    Admin:    http://localhost:8000/admin/"
Write-Host "    Frontend: http://localhost:5173/"
Write-Host ""
