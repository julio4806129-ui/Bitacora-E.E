#!/usr/bin/env python3
"""
Flota como catálogo maestro enriquecido con BUSAE (GPS) + Genesis (patio/hora/estado).
- Serializer con campos telemetría
- Listado con page_size alto
- UI: columnas GPS, hora, patio Genesis, filtros
Idempotente.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
SER = ROOT / "backend" / "buses" / "serializers.py"
VIEWS = ROOT / "backend" / "buses" / "views.py"
FRONT = ROOT / "frontend" / "src" / "pages" / "InventarioPage.jsx"

def ok(m): print(f"OK: {m}")
def fail(m):
    print(f"ERROR: {m}"); sys.exit(1)

# ── 1. Serializer enriquecido ──────────────────────────────────────────────
ser = SER.read_text(encoding="utf-8")
NEW_SER = '''
class InventarioFlotaSerializer(serializers.ModelSerializer):
    """Catálogo Flota + telemetría BUSAE + operación Genesis (solo lectura)."""
    estado_gps = serializers.SerializerMethodField()
    sin_senal = serializers.SerializerMethodField()
    ultima_transmision = serializers.SerializerMethodField()
    velocidad = serializers.SerializerMethodField()
    patio_genesis = serializers.SerializerMethodField()
    hora_entrada = serializers.SerializerMethodField()
    estado_genesis = serializers.SerializerMethodField()

    class Meta:
        model = InventarioFlota
        fields = '__all__'

    def _busae(self, obj):
        cache = self.context.get('_busae_map')
        if cache is not None:
            return cache.get(obj.bus_movil)
        from buses.models import DatosBusae
        return DatosBusae.objects.filter(bus_movil=obj.bus_movil).first()

    def _genesis(self, obj):
        cache = self.context.get('_genesis_map')
        if cache is not None:
            return cache.get(obj.bus_movil)
        from buses.models import DatosGenesis
        return DatosGenesis.objects.filter(bus_movil=obj.bus_movil).order_by('-sincronizado_en').first()

    def get_estado_gps(self, obj):
        b = self._busae(obj)
        return (b.estado if b else '') or 'Sin datos'

    def get_sin_senal(self, obj):
        from buses.catalogos import GPS_SIN_TRANSMISION
        b = self._busae(obj)
        if not b:
            return True
        return (b.estado or '') in GPS_SIN_TRANSMISION

    def get_ultima_transmision(self, obj):
        b = self._busae(obj)
        if not b:
            return None
        ts = getattr(b, 'ultima_transmision', None) or getattr(b, 'fecha_hora_gps', None)
        return ts.isoformat() if ts and hasattr(ts, 'isoformat') else (str(ts) if ts else None)

    def get_velocidad(self, obj):
        b = self._busae(obj)
        return getattr(b, 'velocidad', None) if b else None

    def get_patio_genesis(self, obj):
        g = self._genesis(obj)
        if g and getattr(g, 'patio_ubicacion', None):
            return g.patio_ubicacion
        return obj.patio or ''

    def get_hora_entrada(self, obj):
        g = self._genesis(obj)
        if not g or not getattr(g, 'hora_entrada', None):
            return ''
        he = g.hora_entrada
        return he.strftime('%H:%M:%S') if hasattr(he, 'strftime') else str(he)

    def get_estado_genesis(self, obj):
        g = self._genesis(obj)
        if not g:
            return ''
        # Preferir campo explícito; si no, inferir de datos típicos
        for attr in ('estado_bus', 'estado', 'estado_operativo'):
            val = getattr(g, attr, None)
            if val:
                return str(val)
        return 'Operativo' if g else ''
'''

import re
if "estado_gps = serializers.SerializerMethodField" in ser:
    ok("Serializer ya enriquecido")
else:
    ser2, n = re.subn(
        r"class InventarioFlotaSerializer\(serializers\.ModelSerializer\):\s*\n\s*class Meta:\s*\n\s*model = InventarioFlota\s*\n\s*fields = '__all__'\s*\n",
        NEW_SER + "\n\n",
        ser,
        count=1,
    )
    if n == 0:
        fail("No se encontró InventarioFlotaSerializer simple para reemplazar")
    SER.write_text(ser2, encoding="utf-8")
    ok("Serializer Flota enriquecido (BUSAE + Genesis)")

# ── 2. ViewSet: list con mapas + page_size ─────────────────────────────────
views = VIEWS.read_text(encoding="utf-8")
LIST_METHOD = '''
    def list(self, request, *args, **kwargs):
        """Lista Flota enriquecida con BUSAE/Genesis (mapas en 2 queries)."""
        from buses.models import DatosBusae, DatosGenesis
        queryset = self.filter_queryset(self.get_queryset())
        page_size = request.query_params.get('page_size') or request.query_params.get('pageSize')
        if page_size:
            try:
                ps = int(page_size)
                if ps > 0:
                    self.paginator.page_size = min(ps, 3000) if self.paginator else None
            except (TypeError, ValueError):
                pass
        page = self.paginate_queryset(queryset)
        objs = page if page is not None else list(queryset)
        bus_ids = [o.bus_movil for o in objs]
        busae_map = {b.bus_movil: b for b in DatosBusae.objects.filter(bus_movil__in=bus_ids)}
        genesis_map = {}
        for g in DatosGenesis.objects.filter(bus_movil__in=bus_ids).order_by('sincronizado_en'):
            genesis_map[g.bus_movil] = g
        ser = self.get_serializer(objs, many=True, context={
            **self.get_serializer_context(),
            '_busae_map': busae_map,
            '_genesis_map': genesis_map,
        })
        if page is not None:
            return self.get_paginated_response(ser.data)
        return Response(ser.data)

'''

if "def list(self, request, *args, **kwargs):" in views[views.find("class InventarioFlotaViewSet"):views.find("class InventarioFlotaViewSet")+2500]:
    ok("ViewSet list ya personalizado (revisar manual si hace falta)")
else:
    anchor = "class InventarioFlotaViewSet(viewsets.ModelViewSet):\n    queryset = InventarioFlota.objects.all()\n    serializer_class = InventarioFlotaSerializer\n    permission_classes = [permissions.IsAuthenticated]\n"
    if anchor not in views:
        fail("No se encontró cabecera InventarioFlotaViewSet")
    views = views.replace(anchor, anchor + LIST_METHOD, 1)
    VIEWS.write_text(views, encoding="utf-8")
    ok("ViewSet list con mapas BUSAE/Genesis")

# ── 3. Frontend: columnas + page_size + render ─────────────────────────────
front = FRONT.read_text(encoding="utf-8")

OLD_COLS = """const DEFAULT_COLUMNS_FLOTA = [
  { key: 'id', label: 'ID ÚNICO', visible: true, width: 'w-20', align: 'left', source: 'flota' },
  { key: 'bus_movil', label: 'N° BUS', visible: true, width: 'w-24', align: 'left', source: 'flota' },
  { key: 'placa', label: 'PLACA', visible: true, width: 'w-28', align: 'left', source: 'flota' },
  { key: 'tipo_flota', label: 'TIPO DE FLOTA', visible: true, width: 'w-36', align: 'left', source: 'flota' },
  { key: 'patio', label: 'PATIO', visible: true, width: 'w-32', align: 'left', source: 'flota' },
  { key: 'estado', label: 'ESTADO', visible: true, width: 'w-28', align: 'left', source: 'flota' },
];"""

# Tolerar si ya cambiaron estado → estado_operativo
if "estado_gps" not in front.split("DEFAULT_COLUMNS_FLOTA")[1][:800]:
    NEW_COLS = """const DEFAULT_COLUMNS_FLOTA = [
  { key: 'bus_movil', label: 'N° BUS', visible: true, width: 'w-24', align: 'left', source: 'flota' },
  { key: 'placa', label: 'PLACA', visible: true, width: 'w-28', align: 'left', source: 'flota' },
  { key: 'tipo_flota', label: 'TIPO', visible: true, width: 'w-28', align: 'left', source: 'flota' },
  { key: 'estado_operativo', label: 'FLOTA', visible: true, width: 'w-24', align: 'center', source: 'flota' },
  { key: 'estado_gps', label: 'GPS (BUSAE)', visible: true, width: 'w-32', align: 'center', source: 'flota' },
  { key: 'sin_senal', label: 'SIN SEÑAL', visible: true, width: 'w-24', align: 'center', source: 'flota' },
  { key: 'patio_genesis', label: 'PATIO', visible: true, width: 'w-32', align: 'left', source: 'flota' },
  { key: 'hora_entrada', label: 'HORA ENT.', visible: true, width: 'w-24', align: 'center', source: 'flota' },
  { key: 'estado_genesis', label: 'ESTADO GEN.', visible: true, width: 'w-28', align: 'center', source: 'flota' },
  { key: 'ultima_transmision', label: 'ÚLT. GPS', visible: true, width: 'w-36', align: 'left', source: 'flota' },
];"""
    # reemplazo flexible
    import re as _re
    front2, n = _re.subn(
        r"const DEFAULT_COLUMNS_FLOTA = \[[\s\S]*?\];",
        NEW_COLS,
        front,
        count=1,
    )
    if n:
        front = front2
        ok("Columnas Flota actualizadas")
    else:
        print("AVISO: no se reemplazaron DEFAULT_COLUMNS_FLOTA")
else:
    ok("Columnas GPS ya presentes")

# Query con page_size
if 'page_size: 2000' not in front and 'page_size: 1500' not in front:
    front = front.replace(
        'queryFn: () => apiClient.get("/inventario-flota/"),',
        'queryFn: () => apiClient.get("/inventario-flota/", { params: { page_size: 2000 } }),',
        1,
    )
    ok("Frontend pide page_size=2000")

# Render de celdas nuevas en renderCellFlota
if "case 'estado_gps':" not in front:
    insert_after = "case 'estado':"
    # Buscar bloque estado y ampliar
    old_estado = '''      case 'estado':
        return <td key={col.key} className={`px-4 py-3 ${alignClass} ${col.width}`}><span className={`inline-flex items-center border text-[10px] font-mono font-bold px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${row.estado === "OPERATIVO" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30"}`}>{row.estado}</span></td>;
      default:'''
    new_estado = '''      case 'estado':
      case 'estado_operativo': {
        const eo = row.estado_operativo || row.estado || '';
        const okE = eo === 'ACTIVO' || eo === 'OPERATIVO';
        return <td key={col.key} className={`px-4 py-3 ${alignClass} ${col.width}`}><span className={`inline-flex items-center border text-[10px] font-mono font-bold px-2.5 py-1 rounded-full ${okE ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30"}`}>{eo || '—'}</span></td>;
      }
      case 'estado_gps': {
        const g = row.estado_gps || 'Sin datos';
        const bad = row.sin_senal || /offline|no record|off/i.test(String(g));
        return <td key={col.key} className={`px-4 py-3 ${alignClass} ${col.width}`}><span className={`inline-flex items-center border text-[10px] font-mono font-bold px-2.5 py-1 rounded-full ${bad ? "bg-rose-500/15 text-rose-300 border-rose-500/30" : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"}`}>{g}</span></td>;
      }
      case 'sin_senal':
        return <td key={col.key} className={`px-4 py-3 ${alignClass} ${col.width}`}>{row.sin_senal ? <span className="text-rose-400 font-bold">SÍ</span> : <span className="text-emerald-400">No</span>}</td>;
      case 'patio_genesis':
      case 'patio':
        return <td key={col.key} className={`px-4 py-3 text-slate-300 ${alignClass} ${col.width}`}>{row.patio_genesis || row.patio || '—'}</td>;
      case 'hora_entrada':
        return <td key={col.key} className={`px-4 py-3 font-mono text-slate-400 ${alignClass} ${col.width}`}>{row.hora_entrada || '—'}</td>;
      case 'estado_genesis':
        return <td key={col.key} className={`px-4 py-3 ${alignClass} ${col.width}`}><span className="text-[10px] font-mono text-slate-300">{row.estado_genesis || '—'}</span></td>;
      case 'ultima_transmision': {
        const t = row.ultima_transmision;
        let label = '—';
        if (t) { try { label = new Date(t).toLocaleString('es-PA'); } catch { label = String(t); } }
        return <td key={col.key} className={`px-4 py-3 font-mono text-[11px] text-slate-400 ${alignClass} ${col.width}`}>{label}</td>;
      }
      default:'''
    if old_estado in front:
        front = front.replace(old_estado, new_estado, 1)
        ok("renderCellFlota con GPS/Genesis")
    else:
        print("AVISO: no se encontró bloque case estado exacto — revisar renderCellFlota a mano")

FRONT.write_text(front, encoding="utf-8")
print("=" * 60)
print("LISTO: Flota enriquecida Flota × BUSAE × Genesis")
print("=" * 60)
print("Reinicia backend y refresca Inventario → Flota (Ctrl+F5)")