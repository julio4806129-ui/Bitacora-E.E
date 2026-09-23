#!/usr/bin/env python3
"""
Script 0.3 — Mejorar modelo InventarioFlota → Flota real
Añade campos de alta/baja/reactivación de forma segura.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / "backend" / "buses" / "models.py"

if not MODELS.exists():
    print(f"ERROR: No se encontro {MODELS}")
    sys.exit(1)

content = MODELS.read_text(encoding="utf-8")

# Verificar si ya se aplicó
if "estado_operativo" in content and "motivo_baja" in content:
    print("OK: Campos de Flota ya existen (idempotente). No se modificó nada.")
    sys.exit(0)

# Buscar la clase InventarioFlota
match = re.search(
    r"(class InventarioFlota\(models\.Model\):.*?)(class |$)",
    content,
    re.DOTALL
)

if not match:
    print("ERROR: No se encontro la clase InventarioFlota")
    sys.exit(1)

clase_original = match.group(1)

# Nueva versión de la clase con campos añadidos
nueva_clase = '''class InventarioFlota(models.Model):
    """
    Catálogo maestro de la Flota.
    Controla alta / baja / reactivación de unidades.
    Solo los buses con estado_operativo = ACTIVO generan reportes pendientes.
    """
    ESTADOS_OPERATIVOS = [
        ('ACTIVO', 'Activo'),
        ('BAJA', 'Fuera de servicio (Baja)'),
        ('MANTENIMIENTO', 'En mantenimiento'),
    ]

    bus_movil = models.IntegerField(unique=True, db_index=True)
    placa = models.CharField(max_length=20, blank=True, db_index=True)
    tipo_flota = models.CharField(max_length=50, default='Torino')
    patio = models.CharField(max_length=100, blank=True, default='LOS PUEBLOS')

    # Campo legacy (se mantiene por compatibilidad)
    estado = models.CharField(max_length=50, default='OPERATIVO')

    # ── Nuevos campos de control de alta/baja ──────────────────────────────
    estado_operativo = models.CharField(
        max_length=20,
        choices=ESTADOS_OPERATIVOS,
        default='ACTIVO',
        db_index=True,
        help_text='ACTIVO = genera reportes | BAJA = no genera reportes'
    )
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

    def dar_de_baja(self, usuario=None, motivo=''):
        """Marca la unidad como BAJA y sincroniza el campo legacy."""
        from django.utils import timezone
        self.estado_operativo = 'BAJA'
        self.estado = 'BAJA'
        self.motivo_baja = motivo or self.motivo_baja
        self.fecha_baja = timezone.now()
        self.dado_de_baja_por = usuario
        self.save()

    def reactivar(self, usuario=None, notas=''):
        """Reactiva la unidad."""
        from django.utils import timezone
        self.estado_operativo = 'ACTIVO'
        self.estado = 'OPERATIVO'
        self.fecha_reactivacion = timezone.now()
        if notas:
            self.notas = (self.notas + '\\n' + notas).strip()
        self.save()

'''

# Reemplazar la clase completa
content = content[:match.start()] + nueva_clase + content[match.end(1):]

MODELS.write_text(content, encoding="utf-8")
print("OK: Modelo InventarioFlota actualizado con campos de alta/baja")
print(f"Archivo: {MODELS}")
print("\\nSiguiente paso: crear y aplicar la migración.")
