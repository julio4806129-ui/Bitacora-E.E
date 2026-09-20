import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

# Auto-cargar backend/.env si existe
_env_file = BASE_DIR / '.env'
if _env_file.is_file():
    try:
        with open(_env_file, 'r', encoding='utf-8') as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith('#') and '=' in _line:
                    _k, _v = _line.split('=', 1)
                    os.environ.setdefault(_k.strip(), _v.strip())
    except Exception:
        pass

DEBUG = os.environ.get('DJANGO_DEBUG', 'False').lower() in ('true', '1', 'yes')
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', '')
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-dev-only-do-not-use-in-production'
    else:
        raise RuntimeError('DJANGO_SECRET_KEY es obligatorio cuando DEBUG=False.')

ALLOWED_HOSTS = [h.strip() for h in os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if h.strip()]
if DEBUG and '*' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.extend(['localhost', '127.0.0.1', 'testserver', '[::1]'])


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.postgres',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'buses.apps.BusesConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'buses.middleware.AuditContextMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

import socket

DB_ENGINE = os.environ.get('DB_ENGINE')
USE_SQLITE = os.environ.get('USE_SQLITE', '').lower() in ('true', '1')

if USE_SQLITE or DB_ENGINE == 'sqlite3':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    db_name = os.environ.get('DB_NAME', 'bitacora_db')
    db_user = os.environ.get('DB_USER', 'bitacora_user')
    db_pass = os.environ.get('DB_PASSWORD', '')
    db_host = os.environ.get('DB_HOST', 'localhost')
    db_port = os.environ.get('DB_PORT', '5432')
    
    postgres_available = False
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.3)
        result = sock.connect_ex((db_host, int(db_port)))
        if result == 0:
            postgres_available = True
        sock.close()
    except Exception:
        postgres_available = False

    if postgres_available:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': db_name,
                'USER': db_user,
                'PASSWORD': db_pass,
                'HOST': db_host,
                'PORT': db_port,
            }
        }
    else:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }

AUTH_USER_MODEL = 'buses.Usuario'

LANGUAGE_CODE = 'es'
TIME_ZONE = 'America/Panama'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = [
        o.strip() for o in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',') if o.strip()
    ]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
    ),
    'DEFAULT_PAGINATION_CLASS': 'buses.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '120/minute',
        'user': '1200/minute',
        'login': '15/minute',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'bitacora-ee-cache',
    }
}
try:
    import redis as _redis_lib
    _r = _redis_lib.from_url(REDIS_URL, socket_connect_timeout=0.4)
    _r.ping()
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': REDIS_URL,
        }
    }
except Exception:
    pass

BUSAE_URL = os.environ.get('BUSAE_URL', 'https://login.busae.com/site/login')
BUSAE_DATA_URL = os.environ.get(
    'BUSAE_DATA_URL',
    'https://login.busae.com/live-gps-map/update-gps-map-v2',
)
BUSAE_EMAIL = os.environ.get('BUSAE_EMAIL', '')
BUSAE_PASSWORD = os.environ.get('BUSAE_PASSWORD', '')
GENESIS_URL = os.environ.get('GENESIS_URL', 'http://genesis.mibus.com/tic/oi/gateway.php')
GENESIS_USER = os.environ.get('GENESIS_USER', '10844')
GENESIS_PASSWORD = os.environ.get('GENESIS_PASSWORD', 'Mibus2017')
POLL_INTERVAL_MINUTES = int(os.environ.get('POLL_INTERVAL_MINUTES', '5') or 5)
ENABLE_INLINE_POLLER = os.environ.get('ENABLE_INLINE_POLLER', 'true').lower() in ('true', '1', 'yes')

CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', REDIS_URL)
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1

# Integración Sentry y Logging Centralizado
from .logging_config import get_logging_config
from .sentry_init import init_sentry

LOGGING = get_logging_config(BASE_DIR)
init_sentry()

# Alertas
SLACK_WEBHOOK_URL = os.environ.get('SLACK_WEBHOOK_URL', '')
ALERT_EMAIL_RECIPIENTS = [
    e.strip() for e in os.environ.get('ALERT_EMAIL_RECIPIENTS', '').split(',') if e.strip()
]
