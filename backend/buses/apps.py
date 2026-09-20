from django.apps import AppConfig


class BusesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'buses'

    def ready(self):
        import buses.signals  # noqa
        self._start_inline_poller()

    def _start_inline_poller(self):
        import os
        import sys
        import logging
        from django.conf import settings

        if not getattr(settings, 'ENABLE_INLINE_POLLER', True):
            return

        skip = {
            'migrate', 'makemigrations', 'collectstatic', 'test',
            'shell', 'createsuperuser', 'flush', 'showmigrations',
        }
        if any(arg in skip for arg in sys.argv):
            return
        if any('celery' in arg for arg in sys.argv):
            return
        if 'runserver' in sys.argv and os.environ.get('RUN_MAIN') != 'true':
            return

        try:
            from poller.scheduler import start
            start()
        except Exception:
            logging.getLogger('poller.scheduler').exception(
                'No se pudo iniciar el poller en proceso'
            )
