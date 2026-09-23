#!/usr/bin/env python3
"""
FORCE: reescribe InventarioFlota completo + corrige poller.
Idempotente y seguro.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / "backend" / "buses" / "models.py"
POLLER = ROOT / "backend" / "poller" / "busae_service.py"

def ok(m): print(f"OK: {m}")
def fail(m):
    print(f"ERROR: {m}")
    sys.exit(1)

# ── 1. Forzar reescritura de InventarioFlota ─────────────────
if not MODELS.exists():
    fail(f"No existe {MODELS}")

content = MODELS.read_text(encoding="utf-8")

nuevo_modelo = '''class InventarioFlota(models.Model):
    ESTADOS_OPERATIVOS = [
        ('ACTIVO', 'Activo'),
        ('BAJA', 'Fuera de servicio (Baja)'),
        ('MANTENIMIENTO', 'En mantenimiento'),
    ]

    bus_movil = models.IntegerField(unique=True, db_index=True)
    placa = models.CharField(max_length=20, blank=True, db_index=True)
    tipo_flota = models.CharField(max_length=50, default='Torino')
    patio = models.CharField(max_length=100, blank=True, default='LOS PUEBLOS')

    # Campo principal de ciclo de vida (el que usa el poller)
    estado_operativo = models.CharField(
        max_length=20,
        choices=ESTADOS_OPERATIVOS,
        default='ACTIVO',
        db_index=True,
        help_text='ACTIVO = genera reportes | BAJA = no genera reportes'
    )

    # Campo legacy (compatibilidad temporal)
    estado = models.CharField(max_length=50, default='OPERATIVO')

    motivo_baja = models.TextField(blank=True, default='')
    fecha_baja = models.DateTimeField(null=True, blank=True)
    fecha_reactivacion = models.DateTimeField(null=True, blank=True)
    dado_de_baja_por = models.ForeignKey(
        'Usuario',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='unidades_dadas_de_baja'
    )
    notas = models.TextField(blank=True, default='')
    columnas_extra = models.JSONField(default=dict, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['bus_movil']
        verbose_name = 'Unidad de Flota'
        verbose_name_plural = 'Flota'

    def __str__(self):
        return f'Bus {self.bus_movil} - {self.placa} ({self.estado_operativo})'


'''

pattern = re.compile(
    r"class InventarioFlota\(models\.Model\):.*?(?=\nclass |\Z)",
    re.DOTALL
)
match = pattern.search(content)
if not match:
    fail("No se encontró class InventarioFlota")

content = content[:match.start()] + nuevo_modelo + content[match.end():]
MODELS.write_text(content, encoding="utf-8")
ok("models.py → InventarioFlota FORZADO con estado_operativo + campos de baja")

# ── 2. Forzar filtro correcto en el poller ───────────────────
if not POLLER.exists():
    fail(f"No existe {POLLER}")

poller = POLLER.read_text(encoding="utf-8")

# GPS_SIN_SENAL
if "GPS_SIN_SENAL = frozenset({'Offline', 'No records'})" not in poller:
    old = re.search(r"GPS_SIN_SENAL\s*=\s*frozenset\(\{[^}]+\}\)", poller)
    if old:
        poller = poller[:old.start()] + "GPS_SIN_SENAL = frozenset({'Offline', 'No records'})" + poller[old.end():]
        ok("GPS_SIN_SENAL corregido")
    else:
        print("AVISO: No se encontró GPS_SIN_SENAL")

# Filtro Flota (cualquier variante antigua)
new_line = "if not flota or getattr(flota, 'estado_operativo', getattr(flota, 'estado', '')).upper() not in ('ACTIVO', 'OPERATIVO'):"

replaced = False
# Variante 1
if "flota.estado.upper() not in ('OPERATIVO', 'ACTIVO')" in poller:
    poller = poller.replace(
        "if not flota or flota.estado.upper() not in ('OPERATIVO', 'ACTIVO'):",
        new_line
    )
    replaced = True
# Variante 2 (la del commit anterior)
if "getattr(flota, 'estado_operativo', flota.estado).upper() not in ('ACTIVO', 'OPERATIVO')" in poller:
    poller = poller.replace(
        "if not flota or getattr(flota, 'estado_operativo', flota.estado).upper() not in ('ACTIVO', 'OPERATIVO'):",
        new_line
    )
    replaced = True

if not replaced:
    # Búsqueda flexible
    flex = re.compile(r"if not flota or .+?\.upper\(\) not in \([^)]+\):")
    if flex.search(poller):
        poller = flex.sub(new_line, poller)
        replaced = True

if replaced:
    ok("Poller → filtro actualizado a estado_operativo (seguro)")
else:
    print("AVISO: No se pudo localizar el filtro de Flota. Revisar manualmente.")

POLLER.write_text(poller, encoding="utf-8")

print("\n" + "="*60)
print("FORCE completado.")
print("="*60)
print("Ahora ejecuta:")
print("  git diff backend/buses/models.py")
print("  git diff backend/poller/busae_service.py")