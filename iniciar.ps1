# Bitacora E.E. - Script de inicio rapido (PowerShell)
# MiBus Panama | Gestion de Flota y Equipos Electronicos

$Root     = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Venv     = Join-Path $Backend "venv\Scripts\python.exe"

function Show-Banner {
    Write-Host ""
    Write-Host "  +-------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "  |   BITACORA E.E. - MiBus Panama  v2.5            |" -ForegroundColor Cyan
    Write-Host "  |   Gestion de Flota y Equipos Electronicos       |" -ForegroundColor Cyan
    Write-Host "  +-------------------------------------------------+" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Menu {
    Write-Host "  +--------------------------------------------------+" -ForegroundColor Blue
    Write-Host "  |           Que deseas hacer?                      |" -ForegroundColor Blue
    Write-Host "  +--------------------------------------------------+" -ForegroundColor Blue
    Write-Host ""
    Write-Host "  [1] " -ForegroundColor Green -NoNewline; Write-Host "Inicio COMPLETO (Docker + Django + Celery + Vite)"
    Write-Host "  [2] " -ForegroundColor Green -NoNewline; Write-Host "Solo Backend    (Django + Celery)"
    Write-Host "  [3] " -ForegroundColor Green -NoNewline; Write-Host "Solo Frontend   (Vite dev server)"
    Write-Host "  [4] " -ForegroundColor Green -NoNewline; Write-Host "Solo Docker     (PostgreSQL + Redis)"
    Write-Host "  [5] " -ForegroundColor Yellow -NoNewline; Write-Host "Migraciones     (makemigrations + migrate)"
    Write-Host "  [6] " -ForegroundColor Yellow -NoNewline; Write-Host "Seed inicial    (Catalogo E.E. componentes)"
    Write-Host "  [7] " -ForegroundColor Yellow -NoNewline; Write-Host "Crear superusuario/admin"
    Write-Host "  [C] " -ForegroundColor Cyan -NoNewline; Write-Host "Ver credenciales y usuarios de prueba"
    Write-Host "  [8] " -ForegroundColor Red -NoNewline; Write-Host "Detener TODO    (Docker + procesos)"
    Write-Host "  [9] " -ForegroundColor Magenta -NoNewline; Write-Host "Estado del sistema (health check)"
    Write-Host "  [0] " -NoNewline; Write-Host "Salir"
    Write-Host ""
}

function Show-Credentials {
    Write-Host ""
    Write-Host "  +===================================================+" -ForegroundColor Cyan
    Write-Host "  |    CREDENCIALES DISPONIBLES (MiBus Panama)        |" -ForegroundColor Cyan
    Write-Host "  +===================================================+" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Administradores (Acceso total):" -ForegroundColor Cyan
    Write-Host "    - Admin:    Codigo/Usuario: " -NoNewline; Write-Host "13283" -ForegroundColor Green -NoNewline; Write-Host "  | Contrasena: " -NoNewline; Write-Host "MiBus2026!" -ForegroundColor Yellow
    Write-Host "    - Super:    Codigo/Usuario: " -NoNewline; Write-Host "admin" -ForegroundColor Green -NoNewline; Write-Host "  | Contrasena: " -NoNewline; Write-Host "Admin2026!" -ForegroundColor Yellow
    Write-Host "    - Carlos:   Codigo/Usuario: " -NoNewline; Write-Host "10844" -ForegroundColor Green -NoNewline; Write-Host "  | Contrasena: " -NoNewline; Write-Host "MiBus2026!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Tecnicos de Campo (Bitacora de inspeccion):" -ForegroundColor Cyan
    Write-Host "    - David:    Codigo:         " -NoNewline; Write-Host "14101" -ForegroundColor Green -NoNewline; Write-Host "  | Contrasena: " -NoNewline; Write-Host "Tecnico2026!" -ForegroundColor Yellow
    Write-Host "    - Fernando: Codigo:         " -NoNewline; Write-Host "14102" -ForegroundColor Green -NoNewline; Write-Host "  | Contrasena: " -NoNewline; Write-Host "Tecnico2026!" -ForegroundColor Yellow
    Write-Host "    - Luis:     Codigo:         " -NoNewline; Write-Host "14103" -ForegroundColor Green -NoNewline; Write-Host "  | Contrasena: " -NoNewline; Write-Host "Tecnico2026!" -ForegroundColor Yellow
    Write-Host ""
}

function Check-Docker {
    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Docker Desktop no esta corriendo. Abrelo primero." -ForegroundColor Red
        return $false
    }
    return $true
}

function Check-Venv {
    if (-not (Test-Path $Venv)) {
        Write-Host "  ERROR: No se encontro el entorno virtual: $Venv" -ForegroundColor Red
        return $false
    }
    return $true
}

function Wait-Postgres {
    $retries = 0
    while ($retries -lt 15) {
        $result = docker exec bitacora_postgres pg_isready -U bitacora_user 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] PostgreSQL listo." -ForegroundColor Green
            return $true
        }
        $retries++
        Write-Host "  Esperando PostgreSQL... ($retries/15)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
    Write-Host "  ERROR: PostgreSQL no respondio a tiempo." -ForegroundColor Red
    return $false
}

function Start-Docker {
    Write-Host "  [1/5] Levantando Docker (PostgreSQL + Redis)..." -ForegroundColor Cyan
    Set-Location $Root
    docker compose up -d postgres redis
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR iniciando Docker." -ForegroundColor Red
        return $false
    }
    Write-Host "  Esperando servicios..." -ForegroundColor Yellow
    Start-Sleep -Seconds 4
    return (Wait-Postgres)
}

function Start-Backend {
    Write-Host "  Iniciando Django Backend en :8000..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Backend'; & '$Venv' manage.py runserver 0.0.0.0:8000" -WindowStyle Normal
    Start-Sleep -Seconds 2
    Write-Host "  Iniciando Celery Worker..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Backend'; & '$Venv' -m celery -A config worker --loglevel=info --pool=solo" -WindowStyle Normal
    Start-Sleep -Seconds 1
    Write-Host "  Iniciando Celery Beat (scheduler)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Backend'; & '$Venv' -m celery -A config beat --loglevel=info" -WindowStyle Normal
}

function Start-Frontend {
    Write-Host "  Iniciando Frontend Vite en :5173..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Frontend'; npm run dev" -WindowStyle Normal
}

function Show-Success {
    Write-Host ""
    Write-Host "  +=============================================+" -ForegroundColor Green
    Write-Host "  |    [OK] SISTEMA INICIADO EXITOSAMENTE       |" -ForegroundColor Green
    Write-Host "  +---------------------------------------------+" -ForegroundColor Green
    Write-Host "  |  Frontend   ->  http://localhost:5173       |" -ForegroundColor Green
    Write-Host "  |  Backend    ->  http://127.0.0.1:8000       |" -ForegroundColor Green
    Write-Host "  |  Admin DB   ->  http://127.0.0.1:8000/admin |" -ForegroundColor Green
    Write-Host "  |  API Root   ->  http://127.0.0.1:8000/api/  |" -ForegroundColor Green
    Write-Host "  +=============================================+" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Credenciales para ingresar:" -ForegroundColor Cyan
    Write-Host "    - Admin:   Codigo/Usuario: " -NoNewline; Write-Host "13283" -ForegroundColor Green -NoNewline; Write-Host "  | Contrasena: " -NoNewline; Write-Host "MiBus2026!" -ForegroundColor Yellow
    Write-Host "    - Super:   Codigo/Usuario: " -NoNewline; Write-Host "admin" -ForegroundColor Green -NoNewline; Write-Host "  | Contrasena: " -NoNewline; Write-Host "Admin2026!" -ForegroundColor Yellow
    Write-Host "    - Tecnico: Codigo:         " -NoNewline; Write-Host "14101" -ForegroundColor Green -NoNewline; Write-Host "  | Contrasena: " -NoNewline; Write-Host "Tecnico2026!" -ForegroundColor Yellow
    Write-Host ""
}

function Run-Migrations {
    if (-not (Check-Venv)) { return }
    Set-Location $Backend
    Write-Host "  Creando migraciones..." -ForegroundColor Yellow
    & $Venv manage.py makemigrations
    Write-Host "  Aplicando migraciones..." -ForegroundColor Yellow
    & $Venv manage.py migrate
    Write-Host "  [OK] Migraciones completadas." -ForegroundColor Green
}

function Run-Seed {
    if (-not (Check-Venv)) { return }
    Set-Location $Backend
    Write-Host "  Ejecutando seed de catalogo E.E...." -ForegroundColor Yellow
    & $Venv manage.py seed_catalogos_ee
    Write-Host "  [OK] Seed completado." -ForegroundColor Green
}

function Show-Health {
    Write-Host "  Verificando servicios..." -ForegroundColor Cyan
    Write-Host ""

    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host "  [OK] Docker Desktop     -> Activo" -ForegroundColor Green }
    else { Write-Host "  [X] Docker Desktop     -> NO ESTA CORRIENDO" -ForegroundColor Red }

    $pg = docker ps --filter "name=bitacora_postgres" --filter "status=running" -q 2>$null
    if ($pg) { Write-Host "  [OK] PostgreSQL (Docker) -> :5432" -ForegroundColor Green }
    else { Write-Host "  [X] PostgreSQL (Docker) -> Detenido" -ForegroundColor Red }

    $rd = docker ps --filter "name=bitacora_redis" --filter "status=running" -q 2>$null
    if ($rd) { Write-Host "  [OK] Redis (Docker)      -> :6379" -ForegroundColor Green }
    else { Write-Host "  [X] Redis (Docker)      -> Detenido" -ForegroundColor Red }

    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/" -TimeoutSec 3 -UseBasicParsing -EA Stop
        Write-Host "  [OK] Django Backend      -> :8000 (HTTP $($r.StatusCode))" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode) {
            Write-Host "  [OK] Django Backend      -> :8000 (HTTP $([int]$_.Exception.Response.StatusCode))" -ForegroundColor Green
        } else {
            Write-Host "  [-] Django Backend      -> No responde en :8000" -ForegroundColor Yellow
        }
    }

    try {
        $r2 = Invoke-WebRequest -Uri "http://localhost:5173/" -TimeoutSec 3 -UseBasicParsing -EA Stop
        Write-Host "  [OK] Frontend (Vite)     -> :5173 (HTTP $($r2.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "  [-] Frontend (Vite)     -> No responde en :5173" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "  Contenedores activos:" -ForegroundColor Cyan
    docker compose ps 2>$null
    Write-Host ""
}

Clear-Host
Show-Banner

do {
    Show-Menu
    $opcion = Read-Host "  Selecciona una opcion [0-9 o C]"
    Write-Host ""

    switch ($opcion) {
        "1" {
            if (-not (Check-Docker)) { break }
            if (-not (Check-Venv))   { break }
            $dockerOk = Start-Docker
            if (-not $dockerOk) { break }
            Write-Host "  [3/5] Aplicando migraciones..." -ForegroundColor Cyan
            Set-Location $Backend
            & $Venv manage.py migrate 2>&1
            Start-Backend
            Start-Sleep -Seconds 2
            Start-Frontend
            Start-Sleep -Seconds 3
            Show-Success
        }
        "2" {
            if (-not (Check-Venv)) { break }
            Start-Backend
            Write-Host ""
            Write-Host "  Backend -> http://127.0.0.1:8000" -ForegroundColor Green
            Write-Host "  API     -> http://127.0.0.1:8000/api/" -ForegroundColor Green
        }
        "3" {
            Start-Frontend
            Write-Host ""
            Write-Host "  Frontend -> http://localhost:5173" -ForegroundColor Green
        }
        "4" {
            if (-not (Check-Docker)) { break }
            Set-Location $Root
            docker compose up -d postgres redis
            docker compose ps
        }
        "5" { Run-Migrations }
        "6" { Run-Seed }
        "7" {
            if (-not (Check-Venv)) { break }
            Set-Location $Backend
            & $Venv manage.py createsuperuser
        }
        "c" { Show-Credentials }
        "C" { Show-Credentials }
        "8" {
            Write-Host "  Deteniendo Docker..." -ForegroundColor Yellow
            Set-Location $Root
            docker compose down
            Write-Host "  Terminando procesos Python..." -ForegroundColor Yellow
            Get-Process python -EA SilentlyContinue | Stop-Process -Force
            Write-Host "  Terminando procesos Node..." -ForegroundColor Yellow
            Get-Process node -EA SilentlyContinue | Stop-Process -Force
            Write-Host "  [OK] Todo detenido." -ForegroundColor Green
        }
        "9" { Show-Health }
        "0" {
            Write-Host "  Hasta luego. Bitacora E.E. - MiBus Panama" -ForegroundColor Cyan
            Write-Host ""
            exit
        }
        default { Write-Host "  Opcion no valida. Intenta de nuevo." -ForegroundColor Red }
    }

    Write-Host ""
    Read-Host "  Presiona ENTER para continuar"
    Clear-Host
    Show-Banner

} while ($true)
