"""
backend/buses/management/commands/busae_sync.py
Comando CLI para ejecutar sincronización manual de BusAE.
Uso: python manage.py busae_sync
"""

from django.core.management.base import BaseCommand
from buses.services.busae_service import busae_service


class Command(BaseCommand):
    help = 'Ejecuta la sincronización manual de telemetría de BusAE'

    def handle(self, *args, **options):
        self.stdout.write("Iniciando sincronización manual de BusAE...")
        res = busae_service.sync()
        if res.get('status') == 'success':
            self.stdout.write(self.style.SUCCESS(
                f"✓ Sincronización exitosa: {res.get('saved')} buses procesados y guardados."
            ))
        else:
            self.stdout.write(self.style.WARNING(
                f"! Sincronización terminada con estado: {res.get('status')}. Detalle: {res}"
            ))
