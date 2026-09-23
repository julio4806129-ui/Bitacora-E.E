from pathlib import Path
import re

path = Path("backend/buses/views.py")
content = path.read_text(encoding="utf-8")

# Verificar si ya se aplicó
if "def dar_de_baja(self, request, pk=None):" in content:
    print("OK: Acciones de Flota ya existen (idempotente)")
    exit(0)

# Código nuevo a insertar justo antes del final de la clase InventarioFlotaViewSet
# Buscamos el final de la clase (siguiente class o final de archivo después de carga_masiva)

new_actions = '''
    def get_queryset(self):
        qs = super().get_queryset()
        estado = self.request.query_params.get("estado_operativo")
        patio = self.request.query_params.get("patio")
        search = self.request.query_params.get("search") or self.request.query_params.get("q")

        if estado:
            qs = qs.filter(estado_operativo=estado.upper())
        if patio:
            qs = qs.filter(patio__icontains=patio)
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(bus_movil__icontains=search) |
                Q(placa__icontains=search) |
                Q(patio__icontains=search)
            )
        return qs.order_by("bus_movil")

    @action(detail=True, methods=["post"])
    def dar_de_baja(self, request, pk=None):
        """
        POST /api/inventario-flota/{id}/dar_de_baja/
        Body: { "motivo": "texto opcional" }
        """
        unidad = self.get_object()
        motivo = str(request.data.get("motivo") or "").strip()
        if unidad.estado_operativo == "BAJA":
            return Response(
                {"error": "La unidad ya está de baja."},
                status=status.HTTP_400_BAD_REQUEST
            )
        unidad.dar_de_baja(usuario=request.user, motivo=motivo)
        return Response({
            "status": "ok",
            "message": f"Bus {unidad.bus_movil} dado de baja.",
            "bus_movil": unidad.bus_movil,
            "estado_operativo": unidad.estado_operativo,
            "motivo_baja": unidad.motivo_baja,
            "fecha_baja": unidad.fecha_baja,
        })

    @action(detail=True, methods=["post"])
    def reactivar(self, request, pk=None):
        """
        POST /api/inventario-flota/{id}/reactivar/
        Body: { "notas": "texto opcional" }
        """
        unidad = self.get_object()
        notas = str(request.data.get("notas") or "").strip()
        if unidad.estado_operativo == "ACTIVO":
            return Response(
                {"error": "La unidad ya está activa."},
                status=status.HTTP_400_BAD_REQUEST
            )
        unidad.reactivar(usuario=request.user, notas=notas)
        return Response({
            "status": "ok",
            "message": f"Bus {unidad.bus_movil} reactivado.",
            "bus_movil": unidad.bus_movil,
            "estado_operativo": unidad.estado_operativo,
            "fecha_reactivacion": unidad.fecha_reactivacion,
        })

    @action(detail=False, methods=["get"])
    def estadisticas(self, request):
        """
        GET /api/inventario-flota/estadisticas/
        """
        from django.db.models import Count
        total = InventarioFlota.objects.count()
        por_estado = (
            InventarioFlota.objects
            .values("estado_operativo")
            .annotate(cantidad=Count("id"))
            .order_by("estado_operativo")
        )
        por_patio = (
            InventarioFlota.objects
            .values("patio")
            .annotate(cantidad=Count("id"))
            .order_by("-cantidad")[:15]
        )
        return Response({
            "total": total,
            "por_estado": list(por_estado),
            "por_patio": list(por_patio),
        })

'''

# Insertar las nuevas acciones al final de la clase InventarioFlotaViewSet
# Buscamos la siguiente clase después de InventarioFlotaViewSet
match = re.search(
    r"(class InventarioFlotaViewSet\(viewsets\.ModelViewSet\):.*?)(\nclass |\Z)",
    content,
    re.DOTALL
)

if not match:
    print("ERROR: No se encontró InventarioFlotaViewSet")
    exit(1)

# Insertar antes del siguiente class
insert_pos = match.end(1)
content = content[:insert_pos] + new_actions + content[insert_pos:]

path.write_text(content, encoding="utf-8")
print("OK: Acciones dar_de_baja / reactivar / estadisticas + get_queryset añadidas")
print("Siguiente: verificar sintaxis y probar endpoints")
