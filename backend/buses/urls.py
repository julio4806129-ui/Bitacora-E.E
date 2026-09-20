from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    UsuarioViewSet, ModuloDinamicoViewSet, CampoConfiguracionViewSet,
    EEMovilViewSet, ReportePendienteViewSet, RegistroBitacoraViewSet,
    HistorialAtencionViewSet, DatosGenesisViewSet, DatosBusaeViewSet,
    TareaExportacionViewSet, ResumenSemanalView, ResumenEquiposView,
    ReporteEstadoComponentesView, ReporteIncidenciasView,
    ReporteRendimientoTecnicosView, ReporteBusesSinTransmisionView,
    DashboardStatsView, ExportarReporteView, EstadoExportacionView,
    DescargarExportacionView, CustomTokenObtainPairView, LoginByCodigoView,
    CargaMasivaView, PollerSyncView, BitacoraTablaView,
    InventarioFlotaViewSet, InventarioEEViewSet, ConfiguracionSistemaViewSet,
    AuditLogViewSet,
    TipoComponenteViewSet, OpcionEstadoComponenteViewSet,
    ActivoEEViewSet, UnidadFueraServicioViewSet, PlanMantenimientoEEViewSet
)
from .handlers.health_handlers import HealthCheckView
from .handlers.alert_handlers import (
    AlertHistoryView, TriggerTestAlertView, SilenceAlertsView, ResumeAlertsView
)
from .handlers.admin_handlers import AdminDashboardStatsView

router = DefaultRouter()

# Primary endpoints
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'modulos-dinamicos', ModuloDinamicoViewSet, basename='modulo-dinamico')
router.register(r'campos-configuracion', CampoConfiguracionViewSet, basename='campo-configuracion')
router.register(r'ee-moviles', EEMovilViewSet, basename='ee-movil')
router.register(r'reportes-pendientes', ReportePendienteViewSet, basename='reporte-pendiente')
router.register(r'registros-bitacora', RegistroBitacoraViewSet, basename='registro-bitacora')
router.register(r'historial-atenciones', HistorialAtencionViewSet, basename='historial-atencion')
router.register(r'datos-genesis', DatosGenesisViewSet, basename='datos-genesis')
router.register(r'datos-busae', DatosBusaeViewSet, basename='datos-busae')
router.register(r'exportaciones', TareaExportacionViewSet, basename='exportacion')
router.register(r'inventario-flota', InventarioFlotaViewSet, basename='inventario-flota')
router.register(r'inventario-ee', InventarioEEViewSet, basename='inventario-ee')
router.register(r'configuracion', ConfiguracionSistemaViewSet, basename='configuracion')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
router.register(r'auditoria', AuditLogViewSet, basename='auditoria')

# Catálogo dinámico y Activos Físicos E.E.
router.register(r'catalogo-componentes', TipoComponenteViewSet, basename='catalogo-componente')
router.register(r'tipos-componentes', TipoComponenteViewSet, basename='tipo-componente')
router.register(r'opciones-componentes', OpcionEstadoComponenteViewSet, basename='opcion-componente')
router.register(r'activos-ee', ActivoEEViewSet, basename='activo-ee')
router.register(r'inventario-equipos', ActivoEEViewSet, basename='inventario-equipo')
router.register(r'unidades-fuera-servicio', UnidadFueraServicioViewSet, basename='unidad-fuera-servicio')
router.register(r'fuera-servicio', UnidadFueraServicioViewSet, basename='fuera-servicio')
router.register(r'planes-mantenimiento', PlanMantenimientoEEViewSet, basename='plan-mantenimiento')
router.register(r'mantenimiento-predictivo', PlanMantenimientoEEViewSet, basename='mantenimiento-predictivo')

# Aliases
router.register(r'modulos', ModuloDinamicoViewSet, basename='modulo')
router.register(r'campos', CampoConfiguracionViewSet, basename='campo')
router.register(r'eemoviles', EEMovilViewSet, basename='eemovil')
router.register(r'bitacora', RegistroBitacoraViewSet, basename='bitacora')
router.register(r'historial', HistorialAtencionViewSet, basename='historial')
router.register(r'genesis', DatosGenesisViewSet, basename='genesis')
router.register(r'busae', DatosBusaeViewSet, basename='busae')
router.register(r'flota', InventarioFlotaViewSet, basename='flota')


urlpatterns = [
    # Auth endpoints
    path('auth/codigo/', LoginByCodigoView.as_view(), name='login_por_codigo'),
    path('auth/login-codigo/', LoginByCodigoView.as_view(), name='login_por_codigo_alias'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair_auth'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh_auth'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Health check & Operaciones
    path('health/', HealthCheckView.as_view(), name='health_check'),
    path('admin/dashboard/stats/', AdminDashboardStatsView.as_view(), name='admin_dashboard_stats'),
    path('alerts/', AlertHistoryView.as_view(), name='alert_history'),
    path('alerts/test/', TriggerTestAlertView.as_view(), name='alert_test'),
    path('alerts/silence/', SilenceAlertsView.as_view(), name='alert_silence'),
    path('alerts/resume/', ResumeAlertsView.as_view(), name='alert_resume'),

    # Reports, Analytics & Resúmenes
    path('reportes/resumen-semanal/', ResumenSemanalView.as_view(), name='reporte_resumen_semanal'),
    path('reportes/resumen-equipos/', ResumenEquiposView.as_view(), name='reporte_resumen_equipos'),
    path('reportes/dashboard-stats/', DashboardStatsView.as_view(), name='reporte_dashboard_stats'),
    path('reportes/estado-componentes/', ReporteEstadoComponentesView.as_view(), name='reporte_estado_componentes'),
    path('reportes/incidencias/', ReporteIncidenciasView.as_view(), name='reporte_incidencias'),
    path('reportes/rendimiento/', ReporteRendimientoTecnicosView.as_view(), name='reporte_rendimiento'),
    path('reportes/rendimiento-tecnicos/', ReporteRendimientoTecnicosView.as_view(), name='reporte_rendimiento_tecnicos'),
    path('reportes/sin-transmision/', ReporteBusesSinTransmisionView.as_view(), name='reporte_sin_transmision'),
    path('reportes/buses-sin-transmision/', ReporteBusesSinTransmisionView.as_view(), name='reporte_buses_sin_transmision'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    
    # Async Exporting
    path('exportar/', ExportarReporteView.as_view(), name='exportar_reporte'),
    path('reportes/exportar/', ExportarReporteView.as_view(), name='reportes_exportar'),
    path('reportes/exportar/estado/<int:pk>/', EstadoExportacionView.as_view(), name='reportes_exportar_estado'),
    path('exportar/<int:pk>/descargar/', DescargarExportacionView.as_view(), name='descargar_exportacion'),
    path('reportes/exportar/descargar/<int:pk>/', DescargarExportacionView.as_view(), name='reportes_descargar_exportacion'),

    # Carga masiva
    path('bitacora/carga-masiva/', CargaMasivaView.as_view(), name='carga_masiva'),
    path('reportes-pendientes/carga-masiva/', CargaMasivaView.as_view(), name='carga_masiva_alias'),

    # Poller sync
    path('poller/sync/', PollerSyncView.as_view(), name='poller_sync'),

    # Bitácora vista consolidada (Genesis + Busae)
    path('bitacora/tabla/', BitacoraTablaView.as_view(), name='bitacora_tabla'),

    # ViewSet Router
    path('', include(router.urls)),
]
