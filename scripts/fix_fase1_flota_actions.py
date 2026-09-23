#!/usr/bin/env python3
"""
Fase 1 — Página Flota: endpoints dar_de_baja / reactivar + UI.
Idempotente.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
VIEWS = ROOT / "backend" / "buses" / "views.py"
FRONT = ROOT / "frontend" / "src" / "pages" / "InventarioPage.jsx"

def ok(m): print(f"OK: {m}")
def fail(m):
    print(f"ERROR: {m}")
    sys.exit(1)

# ═══════════════════════════════════════════════════════════
# 1. Backend: actions en InventarioFlotaViewSet
# ═══════════════════════════════════════════════════════════
if not VIEWS.exists():
    fail(f"No existe {VIEWS}")

views = VIEWS.read_text(encoding="utf-8")

ACTIONS_BLOCK = '''
    @action(detail=True, methods=['post'])
    def dar_de_baja(self, request, pk=None):
        """Marca unidad como BAJA (deja de generar reportes GPS)."""
        unidad = self.get_object()
        motivo = str(request.data.get('motivo') or '').strip()
        if not motivo:
            return Response(
                {'error': 'El motivo de baja es obligatorio.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if getattr(unidad, 'estado_operativo', None) == 'BAJA':
            return Response({'status': 'info', 'message': 'La unidad ya está de baja.'})

        if hasattr(unidad, 'dar_de_baja'):
            unidad.dar_de_baja(usuario=request.user, motivo=motivo)
        else:
            from django.utils import timezone as tz
            unidad.estado_operativo = 'BAJA'
            unidad.estado = 'BAJA'
            unidad.motivo_baja = motivo
            unidad.fecha_baja = tz.now()
            unidad.dado_de_baja_por = request.user
            unidad.save()

        try:
            from buses.services.audit_service import AuditService
            AuditService.registrar(
                accion='UPDATE',
                modelo='InventarioFlota',
                registro_id=unidad.id,
                usuario=request.user,
                valor_nuevo=f"Bus {unidad.bus_movil} BAJA: {motivo}",
                request=request
            )
        except Exception:
            pass

        return Response({
            'status': 'ok',
            'message': f'Bus {unidad.bus_movil} dado de baja.',
            'estado_operativo': unidad.estado_operativo,
        })

    @action(detail=True, methods=['post'])
    def reactivar(self, request, pk=None):
        """Reactiva unidad a ACTIVO (vuelve a generar reportes)."""
        unidad = self.get_object()
        notas = str(request.data.get('notas') or '').strip()
        if getattr(unidad, 'estado_operativo', None) == 'ACTIVO':
            return Response({'status': 'info', 'message': 'La unidad ya está activa.'})

        if hasattr(unidad, 'reactivar'):
            unidad.reactivar(usuario=request.user, notas=notas)
        else:
            from django.utils import timezone as tz
            unidad.estado_operativo = 'ACTIVO'
            unidad.estado = 'OPERATIVO'
            unidad.fecha_reactivacion = tz.now()
            if notas:
                unidad.notas = ((unidad.notas or '') + "\\n" + notas).strip()
            unidad.save()

        try:
            from buses.services.audit_service import AuditService
            AuditService.registrar(
                accion='UPDATE',
                modelo='InventarioFlota',
                registro_id=unidad.id,
                usuario=request.user,
                valor_nuevo=f"Bus {unidad.bus_movil} reactivado",
                request=request
            )
        except Exception:
            pass

        return Response({
            'status': 'ok',
            'message': f'Bus {unidad.bus_movil} reactivado.',
            'estado_operativo': unidad.estado_operativo,
        })

'''

if "def dar_de_baja(self, request, pk=None):" in views and "InventarioFlotaViewSet" in views:
    # Puede existir en UnidadFueraServicio; comprobar si está dentro de InventarioFlotaViewSet
    idx = views.find("class InventarioFlotaViewSet")
    next_class = views.find("\nclass ", idx + 10)
    block = views[idx:next_class if next_class > 0 else len(views)]
    if "def dar_de_baja" in block:
        ok("Backend: dar_de_baja ya existe en InventarioFlotaViewSet")
    else:
        # Insertar antes del siguiente class después de InventarioFlotaViewSet
        # Buscar el final del método carga_masiva o el final de la clase
        insert_at = next_class if next_class > 0 else len(views)
        views = views[:insert_at] + "\n" + ACTIONS_BLOCK + views[insert_at:]
        VIEWS.write_text(views, encoding="utf-8")
        ok("Backend: actions dar_de_baja + reactivar insertados en InventarioFlotaViewSet")
else:
    idx = views.find("class InventarioFlotaViewSet")
    if idx < 0:
        fail("No se encontró InventarioFlotaViewSet")
    next_class = views.find("\nclass ", idx + 10)
    insert_at = next_class if next_class > 0 else len(views)
    views = views[:insert_at] + "\n" + ACTIONS_BLOCK + views[insert_at:]
    VIEWS.write_text(views, encoding="utf-8")
    ok("Backend: actions dar_de_baja + reactivar insertados")

# Sincronizar carga_masiva y fuera de servicio con estado_operativo
views = VIEWS.read_text(encoding="utf-8")
old_sync1 = "InventarioFlota.objects.filter(bus_movil=instancia.bus_movil).update(estado='FUERA_SERVICIO')"
new_sync1 = "InventarioFlota.objects.filter(bus_movil=instancia.bus_movil).update(estado='BAJA', estado_operativo='BAJA')"
if old_sync1 in views:
    views = views.replace(old_sync1, new_sync1)
    ok("Sync UnidadFueraServicio → estado_operativo=BAJA")

old_sync2 = "InventarioFlota.objects.filter(bus_movil=bus_num).update(estado='FUERA_SERVICIO')"
new_sync2 = "InventarioFlota.objects.filter(bus_movil=bus_num).update(estado='BAJA', estado_operativo='BAJA')"
if old_sync2 in views:
    views = views.replace(old_sync2, new_sync2)

old_sync3 = "InventarioFlota.objects.filter(bus_movil=unidad.bus_movil).update(estado='OPERATIVO')"
new_sync3 = "InventarioFlota.objects.filter(bus_movil=unidad.bus_movil).update(estado='OPERATIVO', estado_operativo='ACTIVO')"
if old_sync3 in views:
    views = views.replace(old_sync3, new_sync3)
    ok("Sync reactivar fuera-servicio → estado_operativo=ACTIVO")

VIEWS.write_text(views, encoding="utf-8")

# ═══════════════════════════════════════════════════════════
# 2. Frontend: columna estado_operativo + botones Baja/Reactivar
# ═══════════════════════════════════════════════════════════
if not FRONT.exists():
    fail(f"No existe {FRONT}")

front = FRONT.read_text(encoding="utf-8")

# Actualizar DEFAULT_COLUMNS_FLOTA
old_col = "{ key: 'estado', label: 'ESTADO', visible: true, width: 'w-28', align: 'left', source: 'flota' },"
new_col = "{ key: 'estado_operativo', label: 'ESTADO', visible: true, width: 'w-28', align: 'left', source: 'flota' },"
if "estado_operativo" not in front and old_col in front:
    front = front.replace(old_col, new_col)
    ok("Frontend: columna estado_operativo")
elif "estado_operativo" in front:
    ok("Frontend: columna estado_operativo ya presente")
else:
    print("AVISO: No se encontró DEFAULT_COLUMNS_FLOTA estado — revisar manual")

# Actualizar AddFlotaModal form para enviar estado_operativo
if 'estado: "OPERATIVO"' in front and "estado_operativo" not in front.split("AddFlotaModal")[1][:800]:
    front = front.replace(
        'useState({ bus_movil: "", placa: "", tipo_flota: "Torino", patio: "CURUNDU", estado: "OPERATIVO" });',
        'useState({ bus_movil: "", placa: "", tipo_flota: "Torino", patio: "CURUNDU", estado: "OPERATIVO", estado_operativo: "ACTIVO" });',
        1
    )
    ok("Frontend: AddFlotaModal incluye estado_operativo")

# Reemplazar SF Estado Operativo options en alta
front = front.replace(
    'options={["OPERATIVO", "INOPERATIVO", "EN MANTENIMIENTO", "BAJA"]}',
    'options={["ACTIVO", "MANTENIMIENTO", "BAJA"]}',
    1
)

# Patch del select de alta para usar estado_operativo
if 'value={form.estado} onChange={v=>set("estado", v)} options={["ACTIVO"' in front:
    front = front.replace(
        'value={form.estado} onChange={v=>set("estado", v)} options={["ACTIVO", "MANTENIMIENTO", "BAJA"]}',
        'value={form.estado_operativo || form.estado} onChange={v=>{ set("estado_operativo", v); set("estado", v === "ACTIVO" ? "OPERATIVO" : v); }} options={["ACTIVO", "MANTENIMIENTO", "BAJA"]}',
        1
    )
    ok("Frontend: select alta usa estado_operativo")

FRONT.write_text(front, encoding="utf-8")

print("\n" + "=" * 60)
print("LISTO Fase 1 — Flota actions")
print("=" * 60)
print("Siguiente:")
print("  git diff --stat")
print("  git add . && git commit -m \"feat: endpoints y UI Flota alta/baja/reactivacion\" && git push")
print("  (luego añadir botones Baja/Reactivar en la tabla si faltan)")