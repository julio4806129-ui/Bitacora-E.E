from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    Usuario, ModuloDinamico, CampoConfiguracion, EEMovil,
    RegistroBitacora, DatosGenesis, DatosBusae, TareaExportacion
)

@admin.register(Usuario)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'codigo_empleado', 'get_full_name', 'es_admin', 'patio_asignado')
    search_fields = ('username', 'codigo_empleado', 'first_name', 'last_name')
    list_filter = ('es_admin', 'patio_asignado')
    
    fieldsets = UserAdmin.fieldsets + (
        ('Información Adicional', {'fields': ('codigo_empleado', 'patio_asignado', 'cuota_diaria', 'es_admin')}),
    )

@admin.register(ModuloDinamico)
class ModuloDinamicoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'descripcion')

@admin.register(CampoConfiguracion)
class CampoConfiguracionAdmin(admin.ModelAdmin):
    list_display = ('modulo', 'clave', 'etiqueta', 'tipo', 'requerido', 'activo')
    list_filter = ('modulo', 'tipo', 'requerido', 'activo')
    search_fields = ('clave', 'etiqueta')

@admin.register(EEMovil)
class EEMovilAdmin(admin.ModelAdmin):
    list_display = ('bus_movil', 'fase_instalacion', 'fase_bocina', 'estado_fw', 'actualizado_en')
    search_fields = ('bus_movil',)
    list_filter = ('fase_instalacion', 'estado_fw')

@admin.register(RegistroBitacora)
class RegistroBitacoraAdmin(admin.ModelAdmin):
    list_display = ('id', 'timestamp', 'bus_movil', 'patio', 'tecnico', 'tipo_mantenimiento')
    list_filter = ('patio', 'tipo_mantenimiento', 'tecnico')
    search_fields = ('bus_movil', 'tecnico__username')
    date_hierarchy = 'timestamp'

@admin.register(DatosGenesis)
class DatosGenesisAdmin(admin.ModelAdmin):
    list_display = ('bus_movil', 'origen', 'destino', 'hora_entrada', 'patio_ubicacion')
    search_fields = ('bus_movil',)
    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False

@admin.register(DatosBusae)
class DatosBusaeAdmin(admin.ModelAdmin):
    list_display = ('bus_movil', 'velocidad', 'estado', 'ultima_transmision')
    search_fields = ('bus_movil',)
    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False

@admin.register(TareaExportacion)
class TareaExportacionAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'tipo_reporte', 'formato', 'estado', 'creado_en')
    list_filter = ('estado', 'tipo_reporte', 'formato')
