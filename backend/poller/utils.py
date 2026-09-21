"""Helpers compartidos: salud Redis, parseo BUSAE y cruce Genesis."""
import logging
import time
from datetime import datetime

from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger('poller.utils')

BUSAE_LAST_SUCCESS = 'busae:health:last_success'
BUSAE_ERROR_COUNT = 'busae:health:error_count'
BUSAE_LAST_ERROR = 'busae:health:last_error'
GENESIS_LAST_SUCCESS = 'genesis:health:last_success'
GENESIS_ERROR_COUNT = 'genesis:health:error_count'
GENESIS_LAST_ERROR = 'genesis:health:last_error'


def record_success(prefix: str):
    if prefix == 'busae':
        cache.set(BUSAE_LAST_SUCCESS, time.time(), timeout=86400)
        cache.set(BUSAE_ERROR_COUNT, 0, timeout=86400)
        cache.delete(BUSAE_LAST_ERROR)
    else:
        cache.set(GENESIS_LAST_SUCCESS, time.time(), timeout=86400)
        cache.set(GENESIS_ERROR_COUNT, 0, timeout=86400)
        cache.delete(GENESIS_LAST_ERROR)


def record_failure(prefix: str, err_msg: str):
    if prefix == 'busae':
        n = (cache.get(BUSAE_ERROR_COUNT) or 0) + 1
        cache.set(BUSAE_ERROR_COUNT, n, timeout=86400)
        cache.set(BUSAE_LAST_ERROR, err_msg, timeout=86400)
    else:
        n = (cache.get(GENESIS_ERROR_COUNT) or 0) + 1
        cache.set(GENESIS_ERROR_COUNT, n, timeout=86400)
        cache.set(GENESIS_LAST_ERROR, err_msg, timeout=86400)


def parse_busae_datetime(value):
    if not value:
        return None
    text = str(value).strip()
    if not text or text.lower() in ('none', 'null', '-', 'n/a'):
        return None
    formats = (
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d %H:%M',
        '%d/%m/%Y %H:%M:%S',
        '%d/%m/%Y %H:%M',
        '%d-%m-%Y %H:%M:%S',
        '%d-%m-%Y %H:%M',
        '%m/%d/%Y %H:%M:%S',
        '%m/%d/%Y %H:%M',
        '%H:%M:%S',
        '%H:%M',
    )
    for fmt in formats:
        try:
            parsed = datetime.strptime(text, fmt)
            if fmt in ('%H:%M:%S', '%H:%M'):
                parsed = datetime.combine(timezone.now().date(), parsed.time())
            if timezone.is_naive(parsed):
                return timezone.make_aware(parsed)
            return parsed
        except ValueError:
            continue
    try:
        parsed = datetime.fromisoformat(text.replace('Z', '+00:00'))
        if timezone.is_naive(parsed):
            return timezone.make_aware(parsed)
        return parsed
    except ValueError:
        return None


def latest_genesis(bus_movil):
    from buses.models import DatosGenesis
    return (
        DatosGenesis.objects.filter(bus_movil=bus_movil)
        .order_by('-sincronizado_en', '-id')
        .first()
    )


def genesis_cross_fields(genesis):
    patio = ''
    hora = ''
    if genesis:
        if genesis.patio_ubicacion:
            patio = genesis.patio_ubicacion
        extra = genesis.datos_extra or {}
        hora = extra.get('hora_entrada_patio') or ''
        if not hora and genesis.hora_entrada:
            hora = genesis.hora_entrada.strftime('%H:%M:%S')
    return patio, hora   # sin inventar hora


def refresh_pending_cross(bus_ids=None):
    """Actualiza patio y hora de entrada en reportes pendientes con Genesis vigente."""
    from buses.models import ReportePendiente

    qs = ReportePendiente.objects.filter(estado='PENDIENTE')
    if bus_ids is not None:
        qs = qs.filter(bus_movil__in=list(bus_ids))

    updated = 0
    for rep in qs.iterator():
        genesis = latest_genesis(rep.bus_movil)
        if not genesis:
            continue
        patio, hora = genesis_cross_fields(genesis)
        fields = []
        if patio and rep.patio != patio:
            rep.patio = patio
            fields.append('patio')
        if hora and rep.hora_reporte != hora:
            rep.hora_reporte = hora
            fields.append('hora_reporte')
        if fields:
            rep.save(update_fields=fields)
            updated += 1
    if updated:
        logger.info('Cruce Genesis actualizado en %s reportes pendientes', updated)
    return updated
