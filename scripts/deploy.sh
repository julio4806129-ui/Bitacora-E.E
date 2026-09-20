#!/bin/bash
# ==============================================================================
# scripts/deploy.sh - Deploy automatizado con verificacion y rollback
# ==============================================================================

set -e

echo "=== Despliegue Bitacora E.E ==="

TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_BEFORE_DEPLOY="./backups/pre_deploy_${TIMESTAMP}"

# 1. Crear backup previo al despliegue
echo "[1/5] Generando respaldo de seguridad previo al deploy..."
mkdir -p ./backups
if [ -f "./scripts/backup.sh" ]; then
    bash ./scripts/backup.sh || echo "Aviso: Backup automatico reporto advertencias."
fi

# 2. Levantar o reconstruir contenedores
echo "[2/5] Levantando servicios con docker-compose..."
docker compose build --pull || { echo "Error en build Docker. Abortando."; exit 1; }
docker compose up -d || { echo "Error al iniciar contenedores. Abortando."; exit 1; }

# 3. Aplicar migraciones y static files
echo "[3/5] Ejecutando migraciones y collectstatic..."
docker compose exec -T backend python manage.py migrate --noinput || {
    echo "Fallo en migraciones. Ejecutando rollback...";
    docker compose down;
    exit 1;
}

# 4. Verificacion de salud post-despliegue
echo "[4/5] Verificando estado de salud del sistema..."
sleep 5
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health/ || echo "000")

if [ "$HEALTH_STATUS" -eq 200 ]; then
    echo "[5/5] Despliegue exitoso y validado! Health check HTTP 200 OK."
else
    echo "ALERTA: Health check devolvio codigo $HEALTH_STATUS."
    echo "Revisando logs de contenedores:"
    docker compose logs --tail=50 backend
    exit 1
fi
