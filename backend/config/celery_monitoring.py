"""
backend/config/celery_monitoring.py
Monitoreo de tareas Celery, estadísticas de workers, tareas activas/fallidas
e inspección del estado en tiempo real.
"""

import time
import logging
from typing import Dict, Any, List
from django.core.cache import cache
from config.celery import app as celery_app

logger = logging.getLogger('config.celery_monitoring')

REDIS_KEY_CELERY_STATS = "celery:monitoring:stats"


class CeleryMonitor:
    @staticmethod
    def get_workers_status() -> Dict[str, Any]:
        """
        Inspecciona el estado de los workers Celery vivos, tareas reservadas y activas.
        """
        try:
            insp = celery_app.control.inspect(timeout=1.0)
            if not insp:
                return {"online": False, "workers": {}, "message": "Inspector de Celery no disponible"}

            ping = insp.ping() or {}
            active = insp.active() or {}
            reserved = insp.reserved() or {}
            stats = insp.stats() or {}

            workers_data = {}
            for worker_name in ping.keys():
                worker_stats = stats.get(worker_name, {})
                workers_data[worker_name] = {
                    "status": "online",
                    "active_tasks_count": len(active.get(worker_name, [])),
                    "reserved_tasks_count": len(reserved.get(worker_name, [])),
                    "total_processed": worker_stats.get("total", {}),
                    "pool": worker_stats.get("pool", {}).get("max-concurrency", 1),
                }

            return {
                "online": len(ping) > 0,
                "total_workers": len(ping),
                "workers": workers_data,
                "timestamp": time.time()
            }
        except Exception as e:
            logger.error(f"[CELERY_MONITOR] Error inspeccionando workers: {e}")
            return {
                "online": False,
                "error": str(e),
                "timestamp": time.time()
            }

    @staticmethod
    def get_registered_tasks() -> List[str]:
        try:
            insp = celery_app.control.inspect(timeout=1.0)
            registered = insp.registered() if insp else {}
            tasks = set()
            for worker_tasks in registered.values():
                tasks.update(worker_tasks)
            return sorted(list(tasks))
        except Exception:
            return []


celery_monitor = CeleryMonitor()
