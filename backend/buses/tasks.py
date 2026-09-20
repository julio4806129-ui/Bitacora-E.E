"""
backend/buses/tasks.py
Tareas Celery asíncronas para Bitácora E.E con reintentos exponenciales,
monitoreo, logging estructurado y alertas de fallos.
"""

import logging
from celery import shared_task
from django.utils import timezone

from buses.models import DatosBusae, DatosGenesis, TareaExportacion
from buses.export_service import ExportService
from buses.services.notification_service import notification_service

logger = logging.getLogger('buses.tasks')


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    time_limit=300,
    soft_time_limit=240,
    name='buses.tasks.sync_busae_gps'
)
def sync_busae_gps(self):
    """
    Tarea Celery periódica para sincronizar la telemetría de BUSAE.
    Utiliza reintentos con backoff exponencial y alerta en fallos críticos.
    """
    logger.info("[TASK_BUSAE] Iniciando ciclo de sincronización GPS BUSAE...")
    try:
        from buses.services.busae_service import busae_service
        result = busae_service.sync()
        logger.info(f"[TASK_BUSAE] Ciclo completado: {result}")
        return result
    except Exception as exc:
        attempt = self.request.retries + 1
        logger.error(
            f"[TASK_BUSAE] Error en intento {attempt}/3: {exc}",
            exc_info=True
        )
        if attempt >= 3:
            notification_service.notify(
                title="Fallo Crítico en Tarea Celery BUSAE",
                message=f"La tarea sync_busae_gps falló tras 3 intentos. Error: {str(exc)}",
                level="error",
                channels=("slack",)
            )
        # Exponential backoff: 60s, 120s, 240s
        countdown = 60 * (2 ** (attempt - 1))
        raise self.retry(exc=exc, countdown=countdown)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    time_limit=300,
    soft_time_limit=240,
    name='buses.tasks.sync_genesis_data'
)
def sync_genesis_data(self):
    """
    Tarea Celery periódica para sincronizar monitoreo de Génesis.
    """
    logger.info("[TASK_GENESIS] Iniciando sincronización de datos Génesis...")
    try:
        from buses.services.genesis_service import genesis_service
        result = genesis_service.sync(force_refresh=True)
        logger.info(f"[TASK_GENESIS] Ciclo completado: {result}")
        return result
    except Exception as exc:
        attempt = self.request.retries + 1
        logger.error(
            f"[TASK_GENESIS] Error en intento {attempt}/3: {exc}",
            exc_info=True
        )
        if attempt >= 3:
            notification_service.notify(
                title="Fallo Crítico en Tarea Celery Génesis",
                message=f"La tarea sync_genesis_data falló tras 3 intentos. Error: {str(exc)}",
                level="error",
                channels=("slack",)
            )
        countdown = 60 * (2 ** (attempt - 1))
        raise self.retry(exc=exc, countdown=countdown)


@shared_task(
    bind=True,
    max_retries=2,
    time_limit=600,
    soft_time_limit=540,
    name='buses.tasks.exportar_reporte'
)
def exportar_reporte(self, tarea_id):
    """
    Genera reportes pesados en segundo plano (Excel, CSV, PDF).
    """
    logger.info(f"[TASK_EXPORT] Procesando tarea de exportación #{tarea_id}")
    try:
        tarea = TareaExportacion.objects.get(id=tarea_id)
        tarea.estado = 'PROCESANDO'
        tarea.save(update_fields=['estado'])

        resultado_path = ExportService.generar_archivo(tarea)

        tarea.archivo_resultado = resultado_path
        tarea.estado = 'COMPLETADA'
        tarea.completado_en = timezone.now()
        tarea.save(update_fields=['archivo_resultado', 'estado', 'completado_en'])

        logger.info(f"[TASK_EXPORT] Tarea #{tarea_id} completada exitosamente.")
        return {'status': 'success', 'tarea_id': tarea_id, 'file': resultado_path}
    except TareaExportacion.DoesNotExist:
        logger.error(f"[TASK_EXPORT] Tarea #{tarea_id} no encontrada en BD.")
        return {'status': 'not_found', 'tarea_id': tarea_id}
    except Exception as exc:
        logger.error(f"[TASK_EXPORT] Error exportando tarea #{tarea_id}: {exc}", exc_info=True)
        try:
            tarea = TareaExportacion.objects.get(id=tarea_id)
            tarea.estado = 'ERROR'
            tarea.error_mensaje = str(exc)
            tarea.save(update_fields=['estado', 'error_mensaje'])
        except Exception:
            pass

        if self.request.retries >= 2:
            notification_service.notify(
                title="Error en Exportación de Reporte",
                message=f"Tarea de exportación #{tarea_id} falló: {str(exc)}",
                level="warning",
                channels=("slack",)
            )
        raise self.retry(exc=exc, countdown=30)
