# ============================================================
# 00_master_fix.ps1  -  Bitacora E.E.  (Windows)
# Ingeniero Full-Stack Senior
# ============================================================
$ErrorActionPreference = "Continue"
$ProjectRoot = (Get-Location).Path

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  BITACORA E.E. - Master Fix Pipeline" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Root: $ProjectRoot"
Write-Host ""

# -- 1. LIMPIEZA ------------------------------------------------
Write-Host ">> 1/4  Limpieza de basura..." -ForegroundColor Yellow

$basura = @(
    "backend\__pycache__",
    "backend\db.sqlite3",
    "backend\db.sqlite3-journal",
    "backend\.env",
    "backend\celerybeat-schedule",
    "backend\celerybeat-schedule-shm",
    "backend\celerybeat-schedule-wal",
    "backend\busae_login_page.html",
    "backend\busae_login_result.html",
    "backend\busae_login_result.png",
    "backend\.gitignore.txt",
    "frontend\node_modules",
    "frontend\dist",
    "frontend.zip"
)

foreach ($item in $basura) {
    $p = Join-Path $ProjectRoot $item
    if (Test-Path $p) {
        Remove-Item -Recurse -Force $p
        Write-Host "  eliminado: $item" -ForegroundColor DarkGray
    }
}

Get-ChildItem -Path $ProjectRoot -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
Get-ChildItem -Path $ProjectRoot -Recurse -Filter "*.pyc" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path $ProjectRoot -Recurse -Filter "celerybeat-schedule*" -ErrorAction SilentlyContinue | Remove-Item -Force

Write-Host "  [OK] Limpieza completada" -ForegroundColor Green
Write-Host ""

# -- 2. .env ----------------------------------------------------
Write-Host ">> 2/4  Configuracion .env..." -ForegroundColor Yellow

$envFile = Join-Path $ProjectRoot ".env"
$envExample = Join-Path $ProjectRoot ".env.example"

if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
    Copy-Item $envExample $envFile
    Write-Host "  [OK] .env creado desde .env.example" -ForegroundColor Green
    Write-Host "  [!]  EDITA .env ahora: SECRET_KEY + credenciales BUSAE/Genesis" -ForegroundColor Yellow
} elseif (Test-Path $envFile) {
    Write-Host "  [i]  .env ya existe" -ForegroundColor Cyan
} else {
    Write-Host "  [X]  No hay .env.example" -ForegroundColor Red
}

# Corregir docker-compose para que use .env
$dc = Join-Path $ProjectRoot "docker-compose.yml"
if (Test-Path $dc) {
    $content = Get-Content $dc -Raw -Encoding UTF8
    $content = $content -replace '\.env\.example', '.env'
    [System.IO.File]::WriteAllText($dc, $content)
    Write-Host "  [OK] docker-compose.yml ahora usa .env" -ForegroundColor Green
}
Write-Host ""

# -- 3. VALIDACION ----------------------------------------------
Write-Host ">> 3/4  Validacion de estructura..." -ForegroundColor Yellow
$ok = $true

$checks = @(
    "backend",
    "frontend",
    "backend\manage.py",
    "backend\requirements.txt",
    "frontend\package.json",
    "docker-compose.yml"
)

foreach ($c in $checks) {
    if (Test-Path (Join-Path $ProjectRoot $c)) {
        Write-Host "  [OK] $c" -ForegroundColor Green
    } else {
        Write-Host "  [X]  $c ausente" -ForegroundColor Red
        $ok = $false
    }
}

$views = Join-Path $ProjectRoot "backend\buses\views.py"
if (Test-Path $views) {
    $lines = (Get-Content $views | Measure-Object -Line).Lines
    if ($lines -gt 500) {
        Write-Host "  [!]  views.py monolitico ($lines lineas) - se refactorizara despues" -ForegroundColor Yellow
    } else {
        Write-Host "  [OK] views.py delgado ($lines lineas)" -ForegroundColor Green
    }
}
Write-Host ""

# -- 4. RESUMEN -------------------------------------------------
Write-Host ">> 4/4  Resumen" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
if ($ok) {
    Write-Host "  Estructura OK. Siguiente paso: editar .env y arrancar." -ForegroundColor Green
} else {
    Write-Host "  Hay archivos faltantes. Revisa la estructura." -ForegroundColor Red
}
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "SIGUIENTES COMANDOS:" -ForegroundColor Cyan
Write-Host "  1. notepad .env"
Write-Host "  2. docker compose up -d postgres redis"
Write-Host "  3. cd backend"
Write-Host "  4. python -m venv venv"
Write-Host "  5. .\venv\Scripts\Activate.ps1"
Write-Host "  6. pip install -r requirements.txt"
Write-Host "  7. python manage.py migrate"
Write-Host "  8. python manage.py createsuperuser"
Write-Host "  9. python manage.py runserver"
Write-Host " 10. (otra terminal) cd ..\frontend ; npm install ; npm run dev"
Write-Host ""
