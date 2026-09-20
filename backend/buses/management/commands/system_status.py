"""
backend/buses/management/commands/system_status.py
Comando CLI para inspeccionar el estado de salud y servicios del sistema Bitácora E.E.
Uso: python manage.py system_status
"""

from django.core.management.base import BaseCommand
from django.db import connection
from django.core.cache import cache
from buses.services.busae_service import busae_service
from buses.services.genesis_service import genesis_service
from buses.models import Usuario, RegistroBitacora, ReportePendiente, DatosBusae


class Command(BaseCommand):
    help = 'Muestra el estado de salud general y métricas del sistema Bitácora E.E'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("==================================================="))
        self.stdout.write(self.style.MIGRATE_HEADING("     ESTADO DEL SISTEMA -- BITACORA E.E"))
        self.stdout.write(self.style.MIGRATE_HEADING("===================================================\n"))

        # 1. Base de datos
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                cursor.fetchone()
            self.stdout.write(self.style.SUCCESS("[OK] Base de Datos: OPERATIVA"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"[FAIL] Base de Datos: ERROR ({e})"))

        # 2. Redis / Cache
        try:
            cache.set("cli_status_ping", "1", timeout=5)
            if cache.get("cli_status_ping") == "1":
                self.stdout.write(self.style.SUCCESS("[OK] Redis / Cache: OPERATIVO"))
            else:
                self.stdout.write(self.style.WARNING("[WARN] Redis / Cache: DEGRADADO"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"[FAIL] Redis / Cache: NO DISPONIBLE ({e})"))

        # 3. Servicios Externos
        busae_health = busae_service.get_health_status()
        if busae_health.get('healthy'):
            self.stdout.write(self.style.SUCCESS(f"[OK] BusAE Integration: OPERATIVO (Ultimo exito: {busae_health.get('last_success')})"))
        else:
            self.stdout.write(self.style.WARNING(f"[WARN] BusAE Integration: INACTIVO/DEGRADADO (Errores: {busae_health.get('error_count')})"))

        genesis_health = genesis_service.get_health_status()
        if genesis_health.get('healthy'):
            self.stdout.write(self.style.SUCCESS(f"[OK] Genesis Integration: OPERATIVO (Ultimo exito: {genesis_health.get('last_success')})"))
        else:
            self.stdout.write(self.style.WARNING(f"[WARN] Genesis Integration: INACTIVO/DEGRADADO (Errores: {genesis_health.get('error_count')})"))

        # 4. Métricas de datos
        self.stdout.write("\n" + self.style.MIGRATE_LABEL("--- Metricas de Operacion ---"))
        self.stdout.write(f"* Usuarios registrados: {Usuario.objects.count()}")
        self.stdout.write(f"* Tecnicos activos: {Usuario.objects.filter(is_active=True, es_admin=False).count()}")
        self.stdout.write(f"* Registros en Bitacora: {RegistroBitacora.objects.count()}")
        self.stdout.write(f"* Reportes pendientes hoy: {ReportePendiente.objects.filter(estado='PENDIENTE').count()}")
        self.stdout.write(f"* Buses en telemetria BusAE: {DatosBusae.objects.count()}\n")
