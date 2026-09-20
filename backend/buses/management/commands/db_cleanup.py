"""
backend/buses/management/commands/db_cleanup.py
Comando CLI para limpieza de datos obsoletos (exportaciones expiradas, reportes atendidos antiguos).
Uso: python manage.py db_cleanup --days 30
"""

import os
from datetime import timedelta
from django.utils import timezone
from django.core.management.base import BaseCommand
from buses.models import TareaExportacion, ReportePendiente


class Command(BaseCommand):
    help = 'Limpia archivos de exportaciones antiguos y depura reportes atendidos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Número de días de antigüedad para depurar (default: 30)'
        )

    def handle(self, *args, **options):
        days = options['days']
        cutoff_date = timezone.now() - timedelta(days=days)
        self.stdout.write(f"Iniciando depuración de registros anteriores a {cutoff_date.date()}...")

        # 1. Limpiar archivos y registros de TareaExportacion
        tareas_viejas = TareaExportacion.objects.filter(creado_en__lt=cutoff_date)
        eliminadas_archivos = 0
        for t in tareas_viejas:
            if t.archivo_resultado and os.path.exists(t.archivo_resultado.path):
                try:
                    os.remove(t.archivo_resultado.path)
                    eliminadas_archivos += 1
                except Exception:
                    pass
        count_exp, _ = tareas_viejas.delete()
        self.stdout.write(self.style.SUCCESS(f"✓ Tareas de exportación eliminadas: {count_exp} ({eliminadas_archivos} archivos en disco)."))

        # 2. Limpiar Reportes Pendientes que ya fueron atendidos hace más de X días
        rep_atendidos_viejos = ReportePendiente.objects.filter(estado='ATENDIDO', creado_en__lt=cutoff_date)
        count_rep, _ = rep_atendidos_viejos.delete()
        self.stdout.write(self.style.SUCCESS(f"✓ Reportes atendidos antiguos depurados: {count_rep}."))
