#!/usr/bin/env python3
"""
Reparación 0.3b — Limpia InventarioFlota rota y deja una versión correcta.
"""
from pathlib import Path
import re
import sys

MODELS = Path(__file__).resolve().parent.parent / "backend" / "buses" / "models.py"
content = MODELS.read_text(encoding="utf-8")

# 1. Eliminar TODO lo que esté entre "class InventarioFlota" y "class InventarioEE"
# (incluye la clase rota + el class Meta suelto)
pattern = r"class InventarioFlota\(models\.Model\):.*?class InventarioEE\(models\.Model\):"
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
            self.notas = (self.notas + "\\n" + notas).strip()
        self.save()


class InventarioEE(models.Model):'''

if not re.search(pattern, content, re.DOTALL):
    print("ERROR: No se encontró el bloque InventarioFlota → InventarioEE")
    sys.exit(1)

content = re.sub(pattern, nueva_clase, content, count=1, flags=re.DOTALL)

MODELS.write_text(content, encoding="utf-8")
print("OK: InventarioFlota reparada correctamente.")
print("Verificando sintaxis...")
