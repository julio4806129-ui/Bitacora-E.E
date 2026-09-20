"""
backend/buses/services/genesis_service.py
Integración robusta con la API JSON-RPC de Genesis.
Incorpora Circuit Breaker, Reintentos Exponenciales, Cache en Redis (TTL 1 hora),
Sincronización incremental y Monitoreo de Salud.
"""

import logging
import time
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.core.cache import cache

from shared.exceptions import GenesisIntegrationError, CircuitBreakerOpen
from shared.decorators import retry_exponential, circuit_breaker
from buses.models import DatosGenesis, ConfiguracionSistema
from buses.bus_number import extract_bus_number

logger = logging.getLogger('buses.services.genesis')

REDIS_KEY_GENESIS_LAST_SUCCESS = "genesis:health:last_success"
REDIS_KEY_GENESIS_ERROR_COUNT = "genesis:health:error_count"
REDIS_KEY_GENESIS_LAST_ERROR = "genesis:health:last_error"
REDIS_KEY_GENESIS_CACHE = "genesis:cache:monitoreo_raw"
CACHE_TTL = 120


class GenesisService:
    def __init__(self):
        self.endpoint = getattr(settings, 'GENESIS_URL', 'http://genesis.mibus.com/tic/oi/gateway.php')

    def _get_credentials(self) -> tuple[str, str]:
        user = ''
        pwd = ''
        try:
            conf = ConfiguracionSistema.objects.filter(clave='genesis_credenciales').first()
            if conf and isinstance(conf.valor, dict):
                user = conf.valor.get('user', '')
                pwd = conf.valor.get('password', '')
        except Exception as e:
            logger.debug(f"Error consultando credenciales de Genesis en BD: {e}")

        if not user or not pwd:
            user = getattr(settings, 'GENESIS_USER', '10844')
            pwd = getattr(settings, 'GENESIS_PASSWORD', 'Mibus2017')

        return str(user).strip(), str(pwd).strip()

    def get_health_status(self) -> Dict[str, Any]:
        last_success = cache.get(REDIS_KEY_GENESIS_LAST_SUCCESS)
        error_count = cache.get(REDIS_KEY_GENESIS_ERROR_COUNT, 0)
        last_error = cache.get(REDIS_KEY_GENESIS_LAST_ERROR, None)

        is_healthy = False
        if last_success:
            diff_seconds = time.time() - float(last_success)
            is_healthy = (diff_seconds < 3600) and (error_count < 5)

        return {
            "healthy": is_healthy,
            "last_success": datetime.fromtimestamp(float(last_success)).isoformat() if last_success else None,
            "error_count": error_count,
            "last_error": last_error,
        }

    def _record_success(self):
        cache.set(REDIS_KEY_GENESIS_LAST_SUCCESS, time.time(), timeout=86400)
        cache.set(REDIS_KEY_GENESIS_ERROR_COUNT, 0, timeout=86400)
        cache.delete(REDIS_KEY_GENESIS_LAST_ERROR)

    def _record_failure(self, err_msg: str):
        current_errors = cache.get(REDIS_KEY_GENESIS_ERROR_COUNT, 0) + 1
        cache.set(REDIS_KEY_GENESIS_ERROR_COUNT, current_errors, timeout=86400)
        cache.set(REDIS_KEY_GENESIS_LAST_ERROR, err_msg, timeout=86400)

    @circuit_breaker(name="genesis_login", failure_threshold=4, timeout=300)
    @retry_exponential(max_retries=3, base_delay=1.5)
    def authenticate(self, session: requests.Session) -> bool:
        user, pwd = self._get_credentials()
        try:
            res = session.post(
                self.endpoint,
                json={
                    'jsonrpc': '2.0',
                    'method': 'login',
                    'params': [user, pwd],
                    'id': 1
                },
                timeout=15
            )
            data = res.json()
            if data.get('result'):
                return True
            raise GenesisIntegrationError(f"Login rechazado por Genesis: {data.get('error', 'Credenciales inválidas')}")
        except Exception as e:
            raise GenesisIntegrationError(f"Error de conexión en autenticación Genesis: {str(e)}")

    @circuit_breaker(name="genesis_fetch", failure_threshold=5, timeout=300)
    @retry_exponential(max_retries=3, base_delay=2.0)
    def fetch_monitoreo(self, use_cache: bool = True) -> List[Dict[str, Any]]:
        if use_cache:
            cached_data = cache.get(REDIS_KEY_GENESIS_CACHE)
            if cached_data:
                logger.info("[GENESIS] Usando datos de caché Redis (TTL 1h).")
                return cached_data

        session = requests.Session()
        self.authenticate(session)

        try:
            res = session.post(
                self.endpoint,
                json={
                    'jsonrpc': '2.0',
                    'method': 'US_Monitoreo',
                    'params': [],
                    'id': 2
                },
                timeout=30
            )
            data = res.json()
            items = data.get('result', [])
            if isinstance(items, dict) and isinstance(items.get('buses'), dict):
                items = list(items['buses'].values())
            elif isinstance(items, dict):
                items = list(items.values())
            if not isinstance(items, list):
                raise GenesisIntegrationError("Estructura de respuesta inesperada en US_Monitoreo.")

            logger.info(f"[GENESIS] Obtenidos {len(items)} registros frescos desde API.")
            cache.set(REDIS_KEY_GENESIS_CACHE, items, timeout=CACHE_TTL)
            return items
        except Exception as e:
            raise GenesisIntegrationError(f"Error en consulta US_Monitoreo: {str(e)}")

    @staticmethod
    def _clean_str(val: Any) -> str:
        if val is None or val in (0, '0', '', 'None'):
            return ''
        return str(val).strip()

    def _calcular_patio_ubicacion(self, item: Dict[str, Any]) -> str:
        estado = self._clean_str(item.get('Estado'))
        origen = self._clean_str(item.get('Origen'))
        destino = self._clean_str(item.get('Destino'))

        if not estado:
            return ''
        if estado.lower() == 'inoperativo':
            return origen
        if not destino:
            return origen
        return destino

    def _calcular_hora_entrada(self, item: Dict[str, Any]) -> str:
        estado = self._clean_str(item.get('Estado'))
        origen = self._clean_str(item.get('Origen'))
        horafin = self._clean_str(item.get('Horafin'))

        if not estado or estado.lower() == 'inoperativo':
            return ''
        if not horafin:
            if origen.lower() == 'en via':
                return 'Relevo'
            return ''
        return horafin

    def save_to_database(self, items: List[Dict[str, Any]], incremental: bool = True) -> int:
        now = timezone.now()
        saved = 0

        with transaction.atomic():
            for item in items:
                bus_movil = extract_bus_number(item)
                if not bus_movil:
                    continue

                origen = self._clean_str(item.get('Origen'))
                destino = self._clean_str(item.get('Destino'))
                estado = self._clean_str(item.get('Estado'))
                patio = self._calcular_patio_ubicacion(item)
                hora_entrada_calc = self._calcular_hora_entrada(item)

                hora_entrada_dt = now
                h_str = self._clean_str(item.get('Hora_Entrada') or item.get('Horafin'))
                if h_str:
                    try:
                        for fmt in ('%Y-%m-%d %H:%M:%S', '%H:%M:%S', '%H:%M'):
                            try:
                                parsed = datetime.strptime(h_str, fmt)
                                if fmt in ('%H:%M:%S', '%H:%M'):
                                    today = now.date()
                                    hora_entrada_dt = timezone.make_aware(
                                        datetime.combine(today, parsed.time())
                                    )
                                else:
                                    hora_entrada_dt = timezone.make_aware(parsed)
                                break
                            except (ValueError, TypeError):
                                continue
                    except Exception:
                        hora_entrada_dt = now

                # Sincronización incremental: verificar si los datos relevantes cambiaron
                if incremental:
                    existente = DatosGenesis.objects.filter(bus_movil=bus_movil).order_by('-sincronizado_en', '-id').first()
                    if existente:
                        extra = existente.datos_extra or {}
                        if (existente.patio_ubicacion == (patio or origen) and
                            existente.origen == origen and
                            existente.destino == destino and
                            extra.get('estado') == estado and
                            extra.get('hora_entrada_patio') == hora_entrada_calc):
                            continue  # No hubo cambio, omitir escritura

                extra_data = {
                    'estado': estado,
                    'opreal': self._clean_str(item.get('Opreal')),
                    'horafin': self._clean_str(item.get('Horafin')),
                    'hora_entrada_patio': hora_entrada_calc,
                    'linea': self._clean_str(item.get('Linea')),
                    'bloque': self._clean_str(item.get('Bloque')),
                    'raw': item,
                }

                DatosGenesis.objects.update_or_create(
                    bus_movil=bus_movil,
                    defaults={
                        'origen': origen,
                        'destino': destino,
                        'hora_entrada': hora_entrada_dt,
                        'patio_ubicacion': patio or origen,
                        'datos_extra': extra_data,
                    }
                )
                saved += 1

        from poller.utils import refresh_pending_cross
        refresh_pending_cross()
        return saved

    def sync(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Ejecuta sincronización de Génesis con fallback y circuit breaker.
        """
        try:
            items = self.fetch_monitoreo(use_cache=not force_refresh)
            saved = self.save_to_database(items, incremental=not force_refresh)
            self._record_success()
            return {
                "status": "success",
                "fetched": len(items),
                "saved_or_updated": saved,
                "timestamp": timezone.now().isoformat()
            }
        except CircuitBreakerOpen as cbe:
            logger.warning(f"[GENESIS] Circuit breaker abierto: {cbe.message}")
            self._record_failure(str(cbe))
            return {
                "status": "circuit_open",
                "message": cbe.message,
                "fallback": True
            }
        except Exception as exc:
            err_msg = str(exc)
            logger.error(f"[GENESIS] Error en sincronización: {err_msg}", exc_info=True)
            self._record_failure(err_msg)
            return {
                "status": "error",
                "error": err_msg,
                "fallback": True
            }


genesis_service = GenesisService()
