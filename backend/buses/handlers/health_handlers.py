"""
backend/buses/handlers/health_handlers.py
Health check endpoint público para monitorear Base de Datos, Redis/Cache, Celery y Servicios Externos.
GET /api/health/
"""

import time
import logging
from django.db import connection
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

from buses.services.busae_service import busae_service
from buses.services.genesis_service import genesis_service

logger = logging.getLogger('buses.handlers.health')


class HealthCheckView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, *args, **kwargs):
        start_time = time.time()
        checks = {}
        is_healthy = True
        is_degraded = False

        # 1. Base de datos
        db_start = time.time()
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                cursor.fetchone()
            db_latency = round((time.time() - db_start) * 1000, 2)
            checks['database'] = {
                'status': 'healthy',
                'latency_ms': db_latency,
                'message': 'Base de datos operativa'
            }
        except Exception as e:
            checks['database'] = {
                'status': 'unhealthy',
                'error': str(e),
                'message': 'Error de conexión a la base de datos'
            }
            is_healthy = False

        # 2. Redis / Cache
        cache_start = time.time()
        try:
            test_key = "health:test_ping"
            cache.set(test_key, "pong", timeout=10)
            val = cache.get(test_key)
            if val == "pong":
                cache_latency = round((time.time() - cache_start) * 1000, 2)
                checks['redis_cache'] = {
                    'status': 'healthy',
                    'latency_ms': cache_latency,
                    'message': 'Caché / Redis operativo'
                }
            else:
                checks['redis_cache'] = {
                    'status': 'degraded',
                    'message': 'Respuesta inconsistente en caché'
                }
                is_degraded = True
        except Exception as e:
            checks['redis_cache'] = {
                'status': 'degraded',
                'error': str(e),
                'message': 'Caché no disponible o degradado'
            }
            is_degraded = True

        # 3. Celery Workers
        try:
            from config.celery import app as celery_app
            insp = celery_app.control.inspect(timeout=0.8)
            ping_res = insp.ping() if insp else None
            if ping_res:
                worker_count = len(ping_res)
                checks['celery'] = {
                    'status': 'healthy',
                    'workers_online': worker_count,
                    'message': f'{worker_count} workers activos'
                }
            else:
                checks['celery'] = {
                    'status': 'degraded',
                    'workers_online': 0,
                    'message': 'Sin workers activos respondiendo ping'
                }
                is_degraded = True
        except Exception as e:
            checks['celery'] = {
                'status': 'degraded',
                'error': str(e),
                'message': 'No fue posible verificar workers Celery'
            }
            is_degraded = True

        # 4. BusAE Service Health
        try:
            busae_status = busae_service.get_health_status()
            checks['busae_integration'] = {
                'status': 'healthy' if busae_status.get('healthy') else 'degraded',
                'details': busae_status
            }
            if not busae_status.get('healthy'):
                is_degraded = True
        except Exception as e:
            checks['busae_integration'] = {
                'status': 'degraded',
                'error': str(e)
            }
            is_degraded = True

        # 5. Genesis Service Health
        try:
            genesis_status = genesis_service.get_health_status()
            checks['genesis_integration'] = {
                'status': 'healthy' if genesis_status.get('healthy') else 'degraded',
                'details': genesis_status
            }
            if not genesis_status.get('healthy'):
                is_degraded = True
        except Exception as e:
            checks['genesis_integration'] = {
                'status': 'degraded',
                'error': str(e)
            }
            is_degraded = True

        total_latency = round((time.time() - start_time) * 1000, 2)

        if not is_healthy:
            overall_status = "unhealthy"
            http_status = status.HTTP_503_SERVICE_UNAVAILABLE
        elif is_degraded:
            overall_status = "degraded"
            http_status = status.HTTP_200_OK
        else:
            overall_status = "healthy"
            http_status = status.HTTP_200_OK

        payload = {
            'status': overall_status,
            'total_latency_ms': total_latency,
            'timestamp': time.time(),
            'checks': checks
        }

        return Response(payload, status=http_status)
