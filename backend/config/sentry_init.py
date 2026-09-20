"""
backend/config/sentry_init.py
Inicialización de Sentry SDK para captura de excepciones y tracing en Django y Celery.
"""

import os
import logging
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

logger = logging.getLogger(__name__)


def init_sentry():
    sentry_dsn = os.environ.get('SENTRY_DSN', '')
    environment = os.environ.get('ENVIRONMENT', 'development')

    if not sentry_dsn:
        logger.info("[SENTRY] SENTRY_DSN no proporcionado. Sentry en modo mock/inactivo.")
        return False

    try:
        sentry_logging = LoggingIntegration(
            level=logging.INFO,        # Captura logs INFO y superior como breadcrumbs
            event_level=logging.ERROR  # Envía eventos para logs ERROR y CRITICAL
        )

        sentry_sdk.init(
            dsn=sentry_dsn,
            integrations=[
                DjangoIntegration(),
                CeleryIntegration(),
                sentry_logging,
            ],
            environment=environment,
            traces_sample_rate=float(os.environ.get('SENTRY_TRACES_SAMPLE_RATE', 0.2)),
            profiles_sample_rate=float(os.environ.get('SENTRY_PROFILES_SAMPLE_RATE', 0.1)),
            send_default_pii=False,
        )
        logger.info(f"[SENTRY] Inicializado exitosamente en entorno: {environment}")
        return True
    except Exception as e:
        logger.error(f"[SENTRY] Error al inicializar Sentry: {e}")
        return False
