import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('config')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'sync-busae-gps-every-5-minutes': {
        'task': 'buses.tasks.sync_busae_gps',
        'schedule': crontab(minute='*/5'),
    },
    'sync-genesis-data-every-5-minutes': {
        'task': 'buses.tasks.sync_genesis_data',
        'schedule': crontab(minute='*/5'),
    },
}
