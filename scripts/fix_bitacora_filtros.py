from pathlib import Path
import re

path = Path("backend/buses/views.py")
content = path.read_text(encoding="utf-8")

if "Excluir buses de BAJA en Flota" in content:
    print("OK: Filtro de Flota en pendientes ya existe")
    exit(0)

# Reemplazar el get_queryset de ReportePendienteViewSet
old_qs = '''    def get_queryset(self):
        qs = ReportePendiente.objects.filter(estado='PENDIENTE')
        patio = self.request.query_params.get('patio')
        bus = self.request.query_params.get('bus_movil')
        if patio:
            qs = qs.filter(patio__icontains=patio)
        if bus:
            qs = qs.filter(bus_movil=bus)
        return qs'''

new_qs = '''    def get_queryset(self):
        """
        Solo pendientes de buses ACTIVO en Flota.
        Filtros: patio, bus_movil, search, estado_gps
        """
        from buses.models import InventarioFlota
        qs = ReportePendiente.objects.filter(estado='PENDIENTE')

        # Excluir buses de BAJA en Flota
        buses_baja = InventarioFlota.objects.filter(
            estado_operativo='BAJA'
        ).values_list('bus_movil', flat=True)
        qs = qs.exclude(bus_movil__in=buses_baja)

        patio = self.request.query_params.get('patio')
        bus = self.request.query_params.get('bus_movil')
        search = self.request.query_params.get('search') or self.request.query_params.get('q')
        estado_gps = self.request.query_params.get('estado_gps')

        if patio:
            qs = qs.filter(patio__icontains=patio)
        if bus:
            qs = qs.filter(bus_movil=bus)
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(bus_movil__icontains=search) |
                Q(patio__icontains=search) |
                Q(diagnostico__icontains=search) |
                Q(report_id__icontains=search)
            )
        if estado_gps:
            qs = qs.filter(estado_gps__iexact=estado_gps)

        return qs.order_by('-creado_en')'''

if old_qs in content:
    content = content.replace(old_qs, new_qs)
    print("OK: get_queryset de ReportePendiente mejorado")
else:
    print("AVISO: Bloque exacto no encontrado. Intentando inserción alternativa...")
    # Fallback: buscar solo el método
    pattern = r"(class ReportePendienteViewSet\(viewsets\.ModelViewSet\):.*?def get_queryset\(self\):.*?)(return qs\n)"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        content = content[:match.start(1)] + "class ReportePendienteViewSet(viewsets.ModelViewSet):\n    queryset = ReportePendiente.objects.filter(estado='PENDIENTE').order_by('-creado_en')\n    serializer_class = ReportePendienteSerializer\n    permission_classes = [EsTecnico]\n\n" + new_qs + "\n\n" + content[match.end():]
        print("OK: get_queryset reemplazado (fallback)")
    else:
        print("ERROR: No se pudo localizar get_queryset. Revisar manualmente.")
        exit(1)

path.write_text(content, encoding="utf-8")
print("Verificando sintaxis...")
