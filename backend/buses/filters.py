import django_filters
from .models import RegistroBitacora, EEMovil, DatosBusae, DatosGenesis, AuditLog

class RegistroBitacoraFilter(django_filters.FilterSet):
    fecha_inicio = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr='gte')
    fecha_fin = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr='lte')

    class Meta:
        model = RegistroBitacora
        fields = ['bus_movil', 'patio', 'tecnico', 'tipo_mantenimiento']

class EEMovilFilter(django_filters.FilterSet):
    class Meta:
        model = EEMovil
        fields = ['bus_movil', 'fase_instalacion', 'estado_fw']

class DatosBusaeFilter(django_filters.FilterSet):
    bus_movil = django_filters.CharFilter(method='filter_bus')
    estado = django_filters.CharFilter(field_name='estado', lookup_expr='iexact')

    class Meta:
        model = DatosBusae
        fields = ['bus_movil', 'estado']

    def filter_bus(self, qs, name, value):
        from .bus_number import parse_bus_number
        num = parse_bus_number(value)
        return qs.filter(bus_movil=num) if num else qs

class DatosGenesisFilter(django_filters.FilterSet):
    fecha_inicio = django_filters.DateTimeFilter(field_name="hora_entrada", lookup_expr='gte')
    fecha_fin = django_filters.DateTimeFilter(field_name="hora_entrada", lookup_expr='lte')
    bus_movil = django_filters.CharFilter(method='filter_bus')
    patio_ubicacion = django_filters.CharFilter(field_name='patio_ubicacion', lookup_expr='icontains')

    class Meta:
        model = DatosGenesis
        fields = ['bus_movil', 'patio_ubicacion']

    def filter_bus(self, qs, name, value):
        from .bus_number import parse_bus_number
        num = parse_bus_number(value)
        return qs.filter(bus_movil=num) if num else qs


class AuditLogFilter(django_filters.FilterSet):
    fecha_inicio = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr='gte')
    fecha_fin = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr='lte')
    usuario = django_filters.NumberFilter(field_name="usuario__id")
    usuario_codigo = django_filters.CharFilter(field_name="usuario_codigo", lookup_expr='icontains')
    accion = django_filters.CharFilter(field_name="accion", lookup_expr='exact')
    modelo = django_filters.CharFilter(field_name="modelo", lookup_expr='iexact')
    registro_id = django_filters.CharFilter(field_name="registro_id", lookup_expr='exact')

    class Meta:
        model = AuditLog
        fields = ['accion', 'modelo', 'registro_id', 'usuario', 'usuario_codigo']

