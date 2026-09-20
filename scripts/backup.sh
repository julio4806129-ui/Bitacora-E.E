#!/bin/bash
# ==============================================================================
# scripts/backup.sh - Backup y rotacion de Base de Datos para Bitacora E.E
# ==============================================================================

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

DATE_TAG=$(date '+%Y%m%d_%H%M%S')
RETENTION_DAYS="${RETENTION_DAYS:-7}"

echo "Iniciando respaldo de base de datos [$DATE_TAG]..."

if [ -n "$DB_NAME" ] && [ "$DB_ENGINE" != "sqlite3" ] && [ "$USE_SQLITE" != "true" ]; then
    BACKUP_FILE="$BACKUP_DIR/backup_postgres_${DATE_TAG}.sql.gz"
    echo "Exportando base de datos PostgreSQL ($DB_NAME)..."
    PGPASSWORD="${DB_PASSWORD:-}" pg_dump -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-bitacora_user}" "$DB_NAME" | gzip > "$BACKUP_FILE"
else
    BACKUP_FILE="$BACKUP_DIR/backup_sqlite_${DATE_TAG}.sqlite3.gz"
    echo "Exportando base de datos SQLite..."
    gzip -c ./backend/db.sqlite3 > "$BACKUP_FILE"
fi

echo "Respaldo completado exitosamente: $BACKUP_FILE"

# Rotacion: Eliminar backups mas viejos que RETENTION_DAYS dias
echo "Ejecutando rotacion de respaldos antiguos (> $RETENTION_DAYS dias)..."
find "$BACKUP_DIR" -type f -name "backup_*" -mtime +"$RETENTION_DAYS" -exec rm -f {} \;
echo "Rotacion finalizada."
