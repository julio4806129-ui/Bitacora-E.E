"""Normaliza payloads BUSAE v1 (lista) y v2 (dict `buses`)."""
from buses.bus_number import extract_bus_number, parse_bus_number

GPS_OFF = frozenset({'off', 'offline', 'no records', 'false', '0', 'none', 'null', '-', 'sin señal'})
GPS_ON = frozenset({'on', 'online', 'active', 'true', '1', 'gps', 'moving'})
GPS_STOPPED = frozenset({'stopped', 'idle', 'parked', 'detenido'})

def coerce_bus_items(payload):
    """Convierte la respuesta HTTP/JSON en una lista de dicts por bus."""
    if payload is None:
        return []

    if isinstance(payload, dict):
        buses = payload.get('buses', payload.get('data'))
        if isinstance(buses, dict):
            return [v for v in buses.values() if isinstance(v, dict)]
        if isinstance(buses, list):
            return [v for v in buses if isinstance(v, dict)]
        if any(k in payload for k in ('bus_number', 'bn', 'has_gps', 'st')):
            return [payload]
        nested = [v for v in payload.values() if isinstance(v, dict)]
        if nested and any(
            ('bus_number' in v or 'bn' in v or 'has_gps' in v or 'st' in v)
            for v in nested
        ):
            return nested
        return []

    if isinstance(payload, list):
        if len(payload) >= 2 and isinstance(payload[1], list):
            return [v for v in payload[1] if isinstance(v, dict)]
        return [v for v in payload if isinstance(v, dict)]

    return []


def _truthy(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    text = str(value).strip().lower()
    if text in GPS_OFF:
        return False
    return text in GPS_ON or text in GPS_STOPPED


def _first_str(*values):
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text and text.lower() not in ('none', 'null', '-', 'n/a'):
            return text
    return ''


def normalize_estado(raw):
    """
    Preserva estados reales de BUSAE:
    Active | Stopped | Offline | No records
    (compatibilidad: ON/OFF se mapean a Active/Offline)
    """
    if not isinstance(raw, dict):
        return 'Offline'

    # 1) Campo de estado explícito (prioridad)
    st = str(
        raw.get('st')
        or raw.get('estado')
        or raw.get('status')
        or raw.get('gps_status')
        or raw.get('device_status')
        or ''
    ).strip()
    key = st.lower()

    if key in GPS_STOPPED or key in ('stopped', 'idle', 'parked', 'detenido'):
        return 'Stopped'
    if key in ('active', 'moving', 'en movimiento', 'en_movimiento'):
        return 'Active'
    if key in ('no records', 'norecords', 'no_records', 'sin registros'):
        return 'No records'
    if key in ('offline', 'off', 'sin señal', 'sin senal', 'sin transmision', 'sin transmisión'):
        return 'Offline'
    if key in ('on', 'online', 'true', '1', 'gps'):
        return 'Active'
    if key:
        # Estado desconocido pero presente: devolver capitalizado
        return st[:1].upper() + st[1:] if len(st) > 1 else st.upper()

    # 2) has_gps / device_source como respaldo
    if 'has_gps' in raw:
        return 'Active' if _truthy(raw.get('has_gps')) else 'Offline'

    source = str(raw.get('device_source') or raw.get('source_location') or '').strip().lower()
    if source == 'gps':
        return 'Active'

    return 'Offline'

def to_schema_dict(raw):
    if not isinstance(raw, dict):
        return None

    numero = extract_bus_number(raw) or parse_bus_number(raw.get('id'))
    if not numero:
        return None

    velocidad = 0.0
    for key in ('speed', 'spd', 'vel', 'v', 'velocity', 'velocidad'):
        value = raw.get(key)
        if value not in (None, '', 'null'):
            try:
                velocidad = float(value)
                break
            except (TypeError, ValueError):
                pass

    lat = _first_str(raw.get('latitude'), raw.get('lat'))
    lng = _first_str(
        raw.get('longitude'), raw.get('lng'), raw.get('lon'), raw.get('ln'),
    )

    return {
        'numero': numero,
        'placa': _first_str(raw.get('plt'), raw.get('placa'), raw.get('plate'), raw.get('bus_plate')),
        'estado_gps': normalize_estado(raw),
        'ultima_transmision': _first_str(
            raw.get('last_gps_signel'),
            raw.get('last_gps_signal'),
            raw.get('display_time'),
            raw.get('log_time'),
            raw.get('l_g_s'),
            raw.get('ultima_transmision'),
        ),
        'manos_libres': _truthy(raw.get('h_ti') if 'h_ti' in raw else raw.get('has_app')),
        'telefono': _first_str(raw.get('tel'), raw.get('telefono'), raw.get('phone')),
        'latitud': lat or None,
        'longitud': lng or None,
        'velocidad': velocidad,
    }


def normalize_buses(payload):
    buses = []
    for raw in coerce_bus_items(payload):
        item = to_schema_dict(raw)
        if item:
            buses.append(item)
    return sorted(buses, key=lambda x: x['numero'])
