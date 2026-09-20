"""
backend/buses/services/busae_service.py
Integración robusta con BUSAE para telemetría en tiempo real.
Incorpora Circuit Breaker, Reintentos Exponenciales, Validación Pydantic,
Fallback Graceful y Cache/Estado en Redis.
"""

import logging
import time
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.core.cache import cache

from shared.exceptions import BusaeIntegrationError, CircuitBreakerOpen
from shared.decorators import retry_exponential, circuit_breaker
from buses.models import DatosBusae, ReportePendiente
from poller.utils import parse_busae_datetime, latest_genesis, genesis_cross_fields, refresh_pending_cross
from poller.busae_client import fetch_payload, get_credentials
from poller.busae_parse import coerce_bus_items, to_schema_dict

logger = logging.getLogger('buses.services.busae')

REDIS_KEY_LAST_SUCCESS = "busae:health:last_success"
REDIS_KEY_ERROR_COUNT = "busae:health:error_count"
REDIS_KEY_LAST_ERROR = "busae:health:last_error"
REDIS_KEY_CACHE_DATA = "busae:cache:latest_records"


class BusaeItemSchema(BaseModel):
    numero: int = Field(gt=0, description="Número identificador del bus móvil")
    placa: str = Field(default="", max_length=50)
    estado_gps: str = Field(default="Offline")
    ultima_transmision: str = Field(default="")
    manos_libres: bool = Field(default=False)
    telefono: str = Field(default="")
    latitud: Optional[str] = Field(default=None)
    longitud: Optional[str] = Field(default=None)
    velocidad: float = Field(default=0)

    @field_validator("numero", mode="before")
    def clean_numero(cls, v):
        try:
            val_str = str(v).strip().lstrip("0")
            return int(val_str) if val_str else 0
        except (ValueError, TypeError):
            return 0


class BusaeService:
    def __init__(self):
        self.login_url = getattr(settings, 'BUSAE_URL', 'https://login.busae.com/site/login')
        self.data_url = getattr(
            settings,
            'BUSAE_DATA_URL',
            'https://login.busae.com/live-gps-map/update-gps-map-v2',
        )

    def _get_credentials(self) -> tuple[str, str]:
        return get_credentials()

    def get_health_status(self) -> Dict[str, Any]:
        last_success = cache.get(REDIS_KEY_LAST_SUCCESS)
        error_count = cache.get(REDIS_KEY_ERROR_COUNT, 0)
        last_error = cache.get(REDIS_KEY_LAST_ERROR, None)

        is_healthy = False
        last_success_ts = None
        if last_success:
            last_success_ts = float(last_success)
            diff_seconds = time.time() - last_success_ts
            is_healthy = (diff_seconds < 3600) and (error_count < 5)

        # Fallback: si no hay caché, verificar última sincronización en DB
        if not is_healthy and error_count == 0:
            try:
                from buses.models import DatosBusae
                last_db = DatosBusae.objects.order_by('-sincronizado_en').first()
                if last_db and last_db.sincronizado_en:
                    import django.utils.timezone as tz_util
                    delta = tz_util.now() - last_db.sincronizado_en
                    if delta.total_seconds() < 3600:
                        is_healthy = True
                        if not last_success_ts:
                            last_success_ts = last_db.sincronizado_en.timestamp()
            except Exception:
                pass

        return {
            "healthy": is_healthy,
            "last_success": datetime.fromtimestamp(float(last_success)).isoformat() if last_success else None,
            "error_count": error_count,
            "last_error": last_error,
        }

    def _record_success(self):
        cache.set(REDIS_KEY_LAST_SUCCESS, time.time(), timeout=86400)
        cache.set(REDIS_KEY_ERROR_COUNT, 0, timeout=86400)
        cache.delete(REDIS_KEY_LAST_ERROR)

    def _record_failure(self, err_msg: str):
        current_errors = cache.get(REDIS_KEY_ERROR_COUNT, 0) + 1
        cache.set(REDIS_KEY_ERROR_COUNT, current_errors, timeout=86400)
        cache.set(REDIS_KEY_LAST_ERROR, err_msg, timeout=86400)

    @circuit_breaker(name="busae_fetch", failure_threshold=5, timeout=300)
    @retry_exponential(max_retries=3, base_delay=2.0)
    def fetch_raw_data(self) -> List[Dict[str, Any]]:
        email, password = self._get_credentials()
        if not email or not password:
            logger.warning("[BUSAE] Credenciales no configuradas.")
            raise BusaeIntegrationError("Credenciales de BUSAE ausentes.")

        payload = fetch_payload()
        raw_items = coerce_bus_items(payload)
        if not raw_items:
            raise BusaeIntegrationError("La respuesta de BUSAE no contiene datos.")
        return raw_items

    def parse_and_validate(self, raw_items: List[Dict[str, Any]]) -> List[BusaeItemSchema]:
        validated_items = []
        for raw in coerce_bus_items(raw_items) or (raw_items or []):
            data = to_schema_dict(raw)
            if not data:
                continue
            try:
                item = BusaeItemSchema(**data)
                if item.numero > 0:
                    validated_items.append(item)
            except Exception as e:
                logger.debug(f"[BUSAE] Elemento omitido por validación: {e}")

        return sorted(validated_items, key=lambda x: x.numero)

    def save_to_database(self, buses: List[BusaeItemSchema]) -> int:
        today = timezone.now().date()
        today_str = today.strftime('%Y%m%d')
        saved_count = 0

        with transaction.atomic():
            for b in buses:
                lat = None
                lng = None
                try:
                    if b.latitud:
                        lat = float(b.latitud)
                    if b.longitud:
                        lng = float(b.longitud)
                except (ValueError, TypeError):
                    pass

                DatosBusae.objects.update_or_create(
                    bus_movil=b.numero,
                    defaults={
                    'latitud': lat,
                    'longitud': lng,
                    'velocidad': b.velocidad or 0,
                    'estado': b.estado_gps,
                        'manos_libres': b.manos_libres,
                        'telefono': b.telefono,
                        'ultima_transmision': parse_busae_datetime(b.ultima_transmision),
                    }
                )

                if str(b.estado_gps).upper() in ('OFF', 'OFFLINE', 'NO RECORDS'):
                    genesis = latest_genesis(b.numero)
                    patio_entrada, hora_entrada = genesis_cross_fields(genesis)
                    diagnostico = (
                        f"Sin transmisión GPS en BUSAE ({b.estado_gps}). "
                        f"Última: {b.ultima_transmision or 'Desconocida'}"
                    )
                    rep_existente = ReportePendiente.objects.filter(
                        bus_movil=b.numero,
                        fecha_reporte=today
                    ).first()

                    if not rep_existente:
                        ReportePendiente.objects.create(
                            report_id=f"REP-{today_str}-{b.numero}",
                            bus_movil=b.numero,
                            estado_gps='OFF',
                            patio=patio_entrada,
                            fecha_reporte=today,
                            hora_reporte=hora_entrada,
                            diagnostico=diagnostico,
                            estado='PENDIENTE'
                        )
                    elif rep_existente.estado == 'PENDIENTE':
                        rep_existente.patio = patio_entrada
                        rep_existente.hora_reporte = hora_entrada
                        rep_existente.estado_gps = b.estado_gps
                        rep_existente.diagnostico = diagnostico
                        rep_existente.save(update_fields=[
                            'patio', 'hora_reporte', 'estado_gps', 'diagnostico'
                        ])
                saved_count += 1

        refresh_pending_cross()

        # Cache de datos validados para fallback graceful
        try:
            cache.set(REDIS_KEY_CACHE_DATA, [item.model_dump() for item in buses], timeout=7200)
        except Exception as ce:
            logger.debug(f"[BUSAE] Error cacheando registros: {ce}")

        return saved_count

    def sync(self) -> Dict[str, Any]:
        """
        Ejecuta el ciclo de sincronización completo con manejo de fallbacks.
        """
        try:
            raw_items = self.fetch_raw_data()
            validated_buses = self.parse_and_validate(raw_items)
            saved = self.save_to_database(validated_buses)
            self._record_success()
            return {
                "status": "success",
                "processed": len(validated_buses),
                "saved": saved,
                "timestamp": timezone.now().isoformat()
            }
        except CircuitBreakerOpen as cbe:
            logger.warning(f"[BUSAE] Circuit Breaker abierto: {cbe.message}. Aplicando fallback de caché.")
            self._record_failure(str(cbe))
            cached_items = cache.get(REDIS_KEY_CACHE_DATA) or []
            return {
                "status": "circuit_open",
                "message": cbe.message,
                "cached_items": len(cached_items),
                "fallback_applied": True
            }
        except Exception as exc:
            err_msg = str(exc)
            logger.error(f"[BUSAE] Error durante ciclo de sincronización: {err_msg}", exc_info=True)
            self._record_failure(err_msg)
            # Fallback a datos previamente cacheados si existen
            cached_items = cache.get(REDIS_KEY_CACHE_DATA) or []
            return {
                "status": "degraded",
                "error": err_msg,
                "cached_items": len(cached_items),
                "fallback_applied": bool(cached_items)
            }


busae_service = BusaeService()
