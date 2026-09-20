"""
backend/buses/handlers/admin_handlers.py
API endpoints para Dashboard Administrativo en tiempo real con agregaciones de datos
y caché en Redis (TTL 30 segundos).
"""

import time
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from buses.models import Usuario, RegistroBitacora, ReportePendiente, DatosBusae, DatosGenesis
from buses.permissions import EsAdmin
from buses.views import get_effective_shift_range

ADMIN_STATS_CACHE_KEY = "admin:dashboard:stats"
CACHE_TTL = 30  # 30 segundos


class AdminDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, EsAdmin]

    def get(self, request, *args, **kwargs):
        cached_stats = cache.get(ADMIN_STATS_CACHE_KEY)
        if cached_stats:
            return Response(cached_stats)

        start_dt, end_dt = get_effective_shift_range()

        # 1. Telemetría Buses (BusAE)
        total_buses = DatosBusae.objects.count()
        buses_online = DatosBusae.objects.filter(estado__in=['Active', 'Stopped', 'ON']).count()
        buses_offline = DatosBusae.objects.filter(estado__in=['Offline', 'No records', 'OFF']).count()

        # 2. Reportes Pendientes
        reportes_pendientes_count = ReportePendiente.objects.filter(estado='PENDIENTE').count()
        reportes_por_patio = list(
            ReportePendiente.objects.filter(estado='PENDIENTE')
            .values('patio')
            .annotate(total=Count('id'))
            .order_by('-total')
        )

        # 3. Actividad de Técnicos en el turno actual
        tecnicos_qs = Usuario.objects.filter(is_active=True).exclude(es_admin=True)
        actividad_tecnicos = []
        for tec in tecnicos_qs:
            atendidos = RegistroBitacora.objects.filter(
                tecnico=tec,
                timestamp__gte=start_dt,
                timestamp__lt=end_dt
            ).count()
            actividad_tecnicos.append({
                "id": tec.id,
                "codigo": tec.codigo_empleado,
                "nombre": tec.get_full_name() or tec.username,
                "patio": tec.patio_asignado,
                "atendidos_turno": atendidos,
                "cuota_diaria": tec.cuota_diaria,
                "cumplimiento_pct": round((atendidos / tec.cuota_diaria * 100), 1) if tec.cuota_diaria else 0
            })

        # 4. Total de atenciones turno
        total_atenciones_turno = RegistroBitacora.objects.filter(
            timestamp__gte=start_dt,
            timestamp__lt=end_dt
        ).count()

        payload = {
            "timestamp": timezone.now().isoformat(),
            "telemetria": {
                "total": total_buses,
                "conectados": buses_online,
                "desconectados": buses_offline,
                "porcentaje_online": round((buses_online / total_buses * 100), 1) if total_buses else 0
            },
            "reportes": {
                "pendientes_total": reportes_pendientes_count,
                "por_patio": reportes_por_patio,
            },
            "turno_actual": {
                "inicio": start_dt.isoformat(),
                "fin": end_dt.isoformat(),
                "total_atenciones": total_atenciones_turno,
                "actividad_tecnicos": sorted(actividad_tecnicos, key=lambda x: x["atendidos_turno"], reverse=True)
            }
        }

        cache.set(ADMIN_STATS_CACHE_KEY, payload, timeout=CACHE_TTL)
        return Response(payload)
