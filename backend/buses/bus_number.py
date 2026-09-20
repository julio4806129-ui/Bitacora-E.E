"""Normaliza números de móvil al entero de Genesis (0806 -> 806)."""
import re

_BUS_PREFIX = re.compile(r'(?i)^\s*bus\s*#?\s*')
_NON_DIGITS = re.compile(r'[^\d]')


def parse_bus_number(value):
    """Convierte 'Bus #0806', '0001', 1 o '0806' al entero 806 / 1."""
    if value is None or value is False:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if value > 0 else None
    if isinstance(value, float):
        num = int(value)
        return num if num > 0 else None

    text = _BUS_PREFIX.sub('', str(value).strip())
    text = text.replace('#', '').strip()
    digits = _NON_DIGITS.sub('', text)
    if not digits:
        return None
    try:
        num = int(digits)
    except (ValueError, TypeError):
        return None
    return num if num > 0 else None


def extract_bus_number(item):
    """Lee el móvil desde payloads Genesis / BUSAE / GPS."""
    if not isinstance(item, dict):
        return parse_bus_number(item)
    for key in (
        'Bus', 'bus', 'bus_number', 'bus_movil', 'bn',
        'map_marker_title', 'numero', 'N° Bus', 'movil',
    ):
        parsed = parse_bus_number(item.get(key))
        if parsed:
            return parsed
    return None


def apply_bus_search(queryset, search, extra_fields=()):
    """Filtro exacto por móvil si el término es numérico; si no, icontains."""
    from django.db.models import Q

    term = (search or '').strip()
    if not term:
        return queryset

    bus_num = parse_bus_number(term)
    looks_numeric = bool(re.fullmatch(r'(?i)\s*(bus\s*)?#?\s*\d+\s*', term))
    if bus_num and looks_numeric:
        return queryset.filter(bus_movil=bus_num)

    query = Q()
    if bus_num:
        query |= Q(bus_movil=bus_num)
    for field in extra_fields:
        query |= Q(**{f'{field}__icontains': term})
    return queryset.filter(query) if query else queryset


def apply_ordering(queryset, ordering, allowed, default='bus_movil'):
    raw = (ordering or '').strip()
    if not raw:
        return queryset.order_by(default)
    field = raw.lstrip('-')
    if field not in allowed:
        return queryset.order_by(default)
    return queryset.order_by(raw)
