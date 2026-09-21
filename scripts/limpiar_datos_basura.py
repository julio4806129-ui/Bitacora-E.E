"""
Script para limpiar datos basura de la base de datos.
Deja solo usuarios de prueba.

Uso:
    python manage.py shell < scripts/limpiar_datos_basura.py
    o
    python manage.py runscript limpiar_datos_basura   (si usas django-extensions)
"""

from django.contrib.auth import get_user_model
from buses.models import (
    ReportePendiente, RegistroBitacora, HistorialAtencion,
    DatosBusae, DatosGenesis, TareaExportacion,
    EEMovil, InventarioFlota
)

Usuario = get_user_model()

print("=== LIMPIEZA DE DATOS BASURA ===")

# 1. Borrar datos operativos
print("Eliminando reportes pendientes...")
ReportePendiente.objects.all().delete()

print("Eliminando registros de bitácora...")
RegistroBitacora.objects.all().delete()

print("Eliminando historial de atenciones...")
HistorialAtencion.objects.all().delete()

print("Eliminando datos BUSAE...")
DatosBusae.objects.all().delete()

print("Eliminando datos Genesis...")
DatosGenesis.objects.all().delete()

print("Eliminando tareas de exportación...")
TareaExportacion.objects.all().delete()

# Opcional: limpiar EEMovil e Inventario si también son basura
# print("Eliminando EEMoviles...")
# EEMovil.objects.all().delete()
# print("Eliminando Inventario Flota...")
# InventarioFlota.objects.all().delete()

# 2. Dejar solo usuarios de prueba
print("\nUsuarios actuales:")
for u in Usuario.objects.all():
    print(f"  - {u.username} | {u.codigo_empleado} | admin={u.is_superuser or u.es_admin}")

# Eliminar usuarios que no sean de prueba (ajusta según tus usuarios reales)
# Ejemplo: mantener solo admin y tecnicos de prueba
usuarios_a_mantener = ['admin', 'tecnico1', 'tecnico2', 'supervisor']  # ← AJUSTA ESTOS NOMBRES

eliminados = 0
for u in Usuario.objects.all():
    if u.username not in usuarios_a_mantener and not u.is_superuser:
        print(f"  Eliminando usuario: {u.username}")
        u.delete()
        eliminados += 1

print(f"\nUsuarios eliminados: {eliminados}")
print("=== LIMPIEZA COMPLETADA ===")
print("Ahora puedes sincronizar datos reales de BUSAE y Genesis.")