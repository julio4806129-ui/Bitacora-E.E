"""
backend/config/logging_config.py
Configuración centralizada de logging estructurado para Django, Celery y Servicios.
"""

import os
from pathlib import Path

def get_logging_config(base_dir: Path):
    logs_dir = base_dir / 'logs'
    logs_dir.mkdir(parents=True, exist_ok=True)

    log_level = os.environ.get('LOG_LEVEL', 'INFO').upper()

    return {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'verbose': {
                'format': '[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d] %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S',
            },
            'json_structured': {
                'format': '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "line": %(lineno)d, "message": "%(message)s"}',
                'datefmt': '%Y-%m-%dT%H:%M:%S%z',
            },
            'simple': {
                'format': '%(levelname)s %(message)s',
            },
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': 'verbose',
                'level': 'DEBUG',
            },
            'file_app': {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': str(logs_dir / 'app.log'),
                'maxBytes': 10 * 1024 * 1024,  # 10 MB
                'backupCount': 5,
                'formatter': 'json_structured',
                'level': 'INFO',
                'encoding': 'utf-8',
            },
            'file_errors': {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': str(logs_dir / 'errors.log'),
                'maxBytes': 10 * 1024 * 1024,
                'backupCount': 5,
                'formatter': 'json_structured',
                'level': 'ERROR',
                'encoding': 'utf-8',
            },
        },
        'loggers': {
            'django': {
                'handlers': ['console', 'file_errors'],
                'level': 'INFO',
                'propagate': False,
            },
            'buses': {
                'handlers': ['console', 'file_app', 'file_errors'],
                'level': log_level,
                'propagate': False,
            },
            'poller': {
                'handlers': ['console', 'file_app', 'file_errors'],
                'level': log_level,
                'propagate': False,
            },
            'config': {
                'handlers': ['console', 'file_app'],
                'level': log_level,
                'propagate': False,
            },
        },
        'root': {
            'handlers': ['console', 'file_app'],
            'level': 'INFO',
        },
    }
