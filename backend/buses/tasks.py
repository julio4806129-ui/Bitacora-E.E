"""
backend/buses/tasks.py
Tareas Celery optimizadas para Bitácora E.E
"""

import logging
from celery import shared_task
from django.utils import timezone

from buses.models import TareaExportacion
from buses.export_service import ExportService
from buses.services.notification_service import notification_service

logger = logging.getLogger('buses.tasks')


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    time_limit=180,
    soft_time_limit=150,
    name='buses.tasks.sync_busae_gps'
)
def sync_busae_gps(self):
    """Sincroniza telemetría GPS de BUSAE cada 2 minutos."""
    logger.info("[TASK_BUSAE] Iniciando sincronización GPS...")
    try:
        from buses.services.busae_service import busae_service
        result = busae_service.sync()
        logger.info(f"[TASK_BUSAE] Completado: {result}")
        return result
    except Exception as exc:
        attempt = self.request.retries + 1
        logger.error(f"[TASK_BUSAE] Error intento {attempt}/3: {exc}", exc_info=True)
        if attempt >= 3:
            try:
                notification_service.notify(
                    title="Fallo Crítico BUSAE",
                    message=f"sync_busae_gps falló tras 3 intentos: {str(exc)}",
                    level="error",
                    channels=("slack",)
                )
            except Exception:
                pass
        countdown = 30 * (2 ** (attempt - 1))
        raise self.retry(exc=exc, countdown=countdown)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=45,
    time_limit=180,
    soft_time_limit=150,
    name='buses.tasks.sync_genesis_data'
)
def sync_genesis_data(self):
    """Sincroniza datos de Génesis cada 5 minutos."""
    logger.info("[TASK_GENESIS] Iniciando sincronización...")
    try:
        from buses.services.genesis_service import genesis_service
        result = genesis_service.sync(force_refresh=True)
        logger.info(f"[TASK_GENESIS] Completado: {result}")
        return result
    except Exception as exc:
        attempt = self.request.retries + 1
        logger.error(f"[TASK_GENESIS] Error intento {attempt}/3: {exc}", exc_info=True)
        if attempt >= 3:
            try:
                notification_service.notify(
                    title="Fallo Crítico Génesis",
                    message=f"sync_genesis_data falló tras 3 intentos: {str(exc)}",
                    level="error",
                    channels=("slack",)
                )
            except Exception:
                pass
        countdown = 45 * (2 ** (attempt - 1))
        raise self.retry(exc=exc, countdown=countdown)


@shared_task(
    bind=True,
    max_retries=2,
    time_limit=600,
    soft_time_limit=540,
    name='buses.tasks.exportar_reporte'
)
def exportar_reporte(self, tarea_id):
    """Genera reportes pesados en segundo plano."""
    logger.info(f"[TASK_EXPORT] Procesando exportación #{tarea_id}")
    try:
        tarea = TareaExportacion.objects.get(id=tarea_id)
        tarea.estado = 'PROCESANDO'
        tarea.save(update_fields=['estado'])

        resultado_path = ExportService.generar_archivo(tarea)

        tarea.archivo_resultado = resultado_path
        tarea.estado = 'COMPLETADA'
        tarea.completado_en = timezone.now()
        tarea.save(update_fields=['archivo_resultado', 'estado', 'completado_en'])

        logger.info(f"[TASK_EXPORT] Tarea #{tarea_id} completada.")
        return {'status': 'success', 'tarea_id': tarea_id, 'file': resultado_path}
    except TareaExportacion.DoesNotExist:
        logger.error(f"[TASK_EXPORT] Tarea #{tarea_id} no encontrada.")
        return {'status': 'not_found', 'tarea_id': tarea_id}
    except Exception as exc:
        logger.error(f"[TASK_EXPORT] Error: {exc}", exc_info=True)
        try:
            tarea = TareaExportacion.objects.get(id=tarea_id)
            tarea.estado = 'ERROR'
            tarea.error_mensaje = str(exc)
            tarea.save(update_fields=['estado', 'error_mensaje'])
        except Exception:
            pass
        raise self.retry(exc=exc, countdown=30)