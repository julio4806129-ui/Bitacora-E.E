#!/bin/bash
# ==============================================================================
# scripts/monitor.sh - Monitoreo continuo 24/7 de Bitacora E.E
# Ejecuta health checks periodicos y emite alertas en caso de degradacion o caida.
# ==============================================================================

HEALTH_URL="${HEALTH_URL:-http://localhost:8000/api/health/}"
CHECK_INTERVAL="${CHECK_INTERVAL:-30}"
ALERT_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

echo "Iniciando monitor continuo para: $HEALTH_URL (Intervalo: ${CHECK_INTERVAL}s)"

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" "$HEALTH_URL" --max-time 10)
    HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tail -n1)
    BODY=$(echo "$HTTP_RESPONSE" | sed '$d')

    if [ "$HTTP_STATUS" -eq 200 ]; then
        STATUS_SYSTEM=$(echo "$BODY" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
        if [ "$STATUS_SYSTEM" = "healthy" ]; then
            echo "[$TIMESTAMP] OK - Sistema Operativo (200 OK, healthy)"
        else
            echo "[$TIMESTAMP] WARN - Sistema Degradado: $STATUS_SYSTEM"
        fi
    else
        echo "[$TIMESTAMP] CRITICAL - Health Check Fallo! (HTTP $HTTP_STATUS)"
        if [ -n "$ALERT_WEBHOOK" ]; then
            curl -s -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"[ALERTA CRITICA] Bitacora E.E Health check fallo con codigo HTTP $HTTP_STATUS en $TIMESTAMP\"}" \
                "$ALERT_WEBHOOK" > /dev/null
        fi
    fi

    sleep "$CHECK_INTERVAL"
done
