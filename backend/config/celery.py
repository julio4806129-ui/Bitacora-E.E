import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('config')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# ── Horarios de sincronización optimizados ──────────────────────────────────
# BUSAE (GPS): cada 2 minutos → datos más frescos
# Genesis (patio/ruta): cada 5 minutos → menos carga, suficiente
app.conf.beat_schedule = {
    'sync-busae-gps-every-2-minutes': {
        'task': 'buses.tasks.sync_busae_gps',
        'schedule': 120.0,  # cada 2 minutos (en segundos)
    },
    'sync-genesis-data-every-5-minutes': {
        'task': 'buses.tasks.sync_genesis_data',
        'schedule': 300.0,  # cada 5 minutos
    },
}