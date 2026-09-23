#!/usr/bin/env python3
"""
Script seguro Fase 0.3 + 0.1/0.2
- Alinea models.py (InventarioFlota) con la migración 0011
- Corrige el filtro del poller para usar estado_operativo
- Idempotente: se puede ejecutar varias veces sin romper nada
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / "backend" / "buses" / "models.py"
POLLER = ROOT / "backend" / "poller" / "busae_service.py"

def fail(msg):
    print(f"ERROR: {msg}")
    sys.exit(1)

def ok(msg):
    print(f"OK: {msg}")

# ─────────────────────────────────────────────────────────────
# 1. Actualizar InventarioFlota en models.py
# ─────────────────────────────────────────────────────────────
if not MODELS.exists():
    fail(f"No existe {MODELS}")

content = MODELS.read_text(encoding="utf-8")

# ¿Ya está actualizado?
if "estado_operativo" in content and "dado_de_baja_por" in content:
    ok("models.py ya tiene estado_operativo y campos de baja (idempotente)")
else:
    # Buscar la clase InventarioFlota completa (hasta la siguiente class o final)
    pattern = re.compile(
        r"class InventarioFlota\(models\.Model\):.*?(?=\nclass |\Z)",
        re.DOTALL
    )
    match = pattern.search(content)
    if not match:
        fail("No se encontró la clase InventarioFlota en models.py")

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

    content = content[:match.start()] + nuevo_modelo + content[match.end():]
    MODELS.write_text(content, encoding="utf-8")
    ok("models.py → InventarioFlota actualizado con estado_operativo + campos de baja")

# ─────────────────────────────────────────────────────────────
# 2. Corregir filtro del poller (estado → estado_operativo)
# ─────────────────────────────────────────────────────────────
if not POLLER.exists():
    fail(f"No existe {POLLER}")

poller = POLLER.read_text(encoding="utf-8")

# Asegurar GPS_SIN_SENAL correcto
if "GPS_SIN_SENAL = frozenset({'Offline', 'No records'})" not in poller:
    old = re.search(r"GPS_SIN_SENAL\s*=\s*frozenset\(\{[^}]+\}\)", poller)
    if old:
        poller = poller[:old.start()] + "GPS_SIN_SENAL = frozenset({'Offline', 'No records'})" + poller[old.end():]
        ok("GPS_SIN_SENAL corregido a solo Offline / No records")
    else:
        print("AVISO: No se encontró GPS_SIN_SENAL (revisar manualmente)")

# Reemplazar filtro antiguo por el correcto
old_filter = (
    "if not flota or flota.estado.upper() not in ('OPERATIVO', 'ACTIVO'):"
)
new_filter = (
    "if not flota or getattr(flota, 'estado_operativo', flota.estado).upper() not in ('ACTIVO', 'OPERATIVO'):"
)

if "estado_operativo" in poller and "getattr(flota" in poller:
    ok("Poller ya usa estado_operativo (idempotente)")
elif old_filter in poller:
    poller = poller.replace(old_filter, new_filter)
    ok("Poller actualizado: ahora filtra por estado_operativo")
else:
    # Intento más flexible
    pattern_flex = re.compile(
        r"if not flota or flota\.estado\.upper\(\) not in \([^)]+\):"
    )
    if pattern_flex.search(poller):
        poller = pattern_flex.sub(new_filter, poller)
        ok("Poller actualizado (match flexible) → estado_operativo")
    else:
        print("AVISO: No se encontró el filtro de Flota en el poller. Revisar manualmente.")

POLLER.write_text(poller, encoding="utf-8")

print("\n" + "="*60)
print("LISTO. Cambios aplicados de forma segura.")
print("="*60)
print("Siguiente paso recomendado:")
print("  1. git diff backend/buses/models.py")
print("  2. git diff backend/poller/busae_service.py")
print("  3. python manage.py migrate   (si aún no corriste la 0011)")
print("  4. git add . && git commit && git push")