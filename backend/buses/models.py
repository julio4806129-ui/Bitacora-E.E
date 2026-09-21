from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
try:
    from django.contrib.postgres.indexes import GinIndex
    HAS_POSTGRES = True
except ImportError:
    HAS_POSTGRES = False

class Usuario(AbstractUser):
    codigo_empleado = models.CharField(max_length=20, unique=True, db_index=True)
    patio_asignado = models.CharField(max_length=100, blank=True, default='CURUNDU')
    cuota_diaria = models.IntegerField(default=20)
    es_admin = models.BooleanField(default=False)

    def __str__(self):
        nombre = self.get_full_name() or self.username
        return f'{self.codigo_empleado} - {nombre}'

class ModuloDinamico(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True)

    def __str__(self):
        return self.nombre

class CampoConfiguracion(models.Model):
    TIPOS = [
        ('TEXT', 'Texto'),
        ('TEXTAREA', 'Área de Texto'),
        ('NUMBER', 'Número'),
        ('SELECT', 'Selección Única'),
        ('MULTISELECT', 'Selección Múltiple'),
        ('RADIO', 'Grupo Radio'),
        ('BOOLEAN', 'Booleano'),
        ('DATE', 'Fecha'),
        ('FILE', 'Archivo'),
    ]
    modulo = models.ForeignKey(ModuloDinamico, on_delete=models.CASCADE, related_name='campos')
    clave = models.SlugField(max_length=50)
    etiqueta = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=TIPOS)
    opciones = models.JSONField(default=list, blank=True)
    validaciones = models.JSONField(default=dict, blank=True)
    requerido = models.BooleanField(default=False)
    orden = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = ('modulo', 'clave')
        ordering = ['orden']

    def __str__(self):
        return f'{self.modulo.nombre} - {self.clave}'

class EEMovil(models.Model):
    bus_movil = models.IntegerField(unique=True, db_index=True)
    patio = models.CharField(max_length=100, blank=True, default='CURUNDU')
    hora = models.CharField(max_length=20, blank=True, default='08:00')
    estado = models.CharField(max_length=50, blank=True, default='OPERATIVO')
    fase_instalacion = models.CharField(max_length=50, blank=True, default='Operativo')
    fase_bocina = models.CharField(max_length=50, blank=True, default='Adecuada')
    version_firmware = models.CharField(max_length=50, blank=True, default='v2.4.1')
    estado_fw = models.CharField(max_length=50, blank=True, default='ACTUALIZADO')
    estado_modem = models.CharField(max_length=50, blank=True, default='FUNCIONA')
    estado_bocina = models.CharField(max_length=50, blank=True, default='FUNCIONA')
    ultima_atencion = models.DateTimeField(null=True, blank=True)
    gps_ok_post_atencion = models.BooleanField(default=True)
    diagnostico = models.TextField(blank=True, default='Equipo en monitoreo preventivo')
    datos_dinamicos = models.JSONField(default=dict, blank=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['bus_movil']

    def __str__(self):
        return f'Bus Movil: {self.bus_movil}'

class ReportePendiente(models.Model):
    report_id = models.CharField(max_length=64, unique=True, db_index=True)
    bus_movil = models.IntegerField(db_index=True)
    estado_gps = models.CharField(max_length=50, default='OFF')
    patio = models.CharField(max_length=100, db_index=True)
    fecha_reporte = models.DateField(auto_now_add=True)
    hora_reporte = models.CharField(max_length=20, blank=True)
    diagnostico = models.TextField()
    estado = models.CharField(max_length=20, default='PENDIENTE') # PENDIENTE, ATENDIDO
    prioridad = models.CharField(max_length=20, default='MEDIA') # BAJA, MEDIA, ALTA, CRITICA
    sla_limite_horas = models.IntegerField(default=8)
    sla_escalado = models.BooleanField(default=False)
    tecnico_asignado = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name='reportes_asignados')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado_en']
        indexes = [
            models.Index(fields=['patio', 'estado'], name='idx_rep_patio_estado'),
            models.Index(fields=['bus_movil', 'fecha_reporte'], name='idx_rep_bus_fecha'),
        ]

    def __str__(self):
        return f'Reporte {self.bus_movil} - {self.patio}'

class RegistroBitacora(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    bus_movil = models.IntegerField(db_index=True)
    patio = models.CharField(max_length=100, db_index=True)
    tecnico = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='atenciones')
    tipo_mantenimiento = models.CharField(max_length=50)

    # ── 2.1 Bitácora GPS ──────────────────────────────────────────
    gps_estado = models.CharField(max_length=50, blank=True, default='Funcional')  # Funcional | Corto | Mojado
    gps_vandalismo = models.CharField(max_length=50, blank=True, default='N/A')    # N/A | Pérdida de GPS | Corto de cables | Robo de Sim Card
    simcard_estado = models.CharField(max_length=50, blank=True, default='N/A')    # N/A | Deterioro | Reemplazo
    serie_sim = models.CharField(max_length=50, blank=True)
    imei_busae = models.CharField(max_length=30, blank=True)

    # ── 2.2 Adecuaciones ─────────────────────────────────────────
    adecuacion_electrica = models.CharField(max_length=50, blank=True, default='Adecuada')  # Adecuada | No Adecuada

    # ── 2.3 Radios Base ──────────────────────────────────────────
    radio_conexion = models.CharField(max_length=10, blank=True, default='Sí')    # Sí | No
    radio_instalacion = models.CharField(max_length=10, blank=True, default='Sí') # Sí | No
    radio_parrilla = models.CharField(max_length=20, blank=True, default='Funcional') # Funcional | Dañada
    radio_pedal = models.CharField(max_length=20, blank=True, default='Funcional')    # Funcional | Dañada
    radio_pantalla = models.CharField(max_length=20, blank=True, default='Funcional') # Funcional | Dañada

    # ── 2.4 CTAP ─────────────────────────────────────────────────
    serie_ctap = models.CharField(max_length=50, blank=True)
    ctap_estado = models.CharField(max_length=20, blank=True, default='Funcional')  # Funcional | Dañada | No Tiene
    ctap_anillo = models.CharField(max_length=20, blank=True, default='Funcional')  # Funcional | Dañada | No Tiene

    # ── 2.5 Botones ──────────────────────────────────────────────
    boton_llamada = models.CharField(max_length=20, blank=True, default='Funcional') # Funcional | Dañada
    boton_panico = models.CharField(max_length=20, blank=True, default='Funcional')  # Funcional | Dañada
    boton_puerta = models.CharField(max_length=20, blank=True, default='Funcional')  # Funcional | Dañada

    # ── Cierre ───────────────────────────────────────────────────
    respuesta_tecnica = models.TextField(blank=True)
    observaciones = models.TextField(blank=True)

    # ── Legacy / Compatibilidad ───────────────────────────────────
    modem = models.CharField(max_length=50, blank=True, default='FUNCIONA')
    actualizacion_fw = models.CharField(max_length=50, blank=True, default='ACTUALIZADO')
    bocina = models.CharField(max_length=50, blank=True, default='FUNCIONA')
    bocina_adecuacion = models.CharField(max_length=50, blank=True, default='ADECUADA')
    bocina_carcasa = models.CharField(max_length=50, blank=True, default='INSTALADA')
    bocina_regulador = models.CharField(max_length=50, blank=True, default='FUNCIONA')
    sim_card = models.CharField(max_length=50, blank=True, default='ACTIVA')
    anillo = models.CharField(max_length=50, blank=True, default='FUNCIONA')
    ctap = models.CharField(max_length=50, blank=True, default='FUNCIONA')

    origen = models.CharField(max_length=30, default='reportes')  # reportes | inventario | manual
    datos_dinamicos = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['bus_movil', 'timestamp'], name='idx_bit_bus_time'),
            models.Index(fields=['patio', 'timestamp'], name='idx_bit_patio_time'),
            models.Index(fields=['tecnico', 'timestamp'], name='idx_bit_tec_time'),
        ]

    def __str__(self):
        return f'Registro {self.id} - Bus {self.bus_movil} ({self.tecnico.codigo_empleado})'

class HistorialAtencion(models.Model):
    timestamp_atencion = models.DateTimeField(auto_now_add=True, db_index=True)
    bus_movil = models.IntegerField(db_index=True)
    estado_gps = models.CharField(max_length=50, blank=True)
    patio = models.CharField(max_length=100, db_index=True)
    fecha_reporte = models.DateField(null=True, blank=True)
    hora_reporte = models.CharField(max_length=20, blank=True)
    diagnostico = models.TextField(blank=True)
    tecnico_nombre = models.CharField(max_length=150)
    tecnico_codigo = models.CharField(max_length=50, db_index=True)
    reporte_id = models.CharField(max_length=64, blank=True)
    tipo_mantenimiento = models.CharField(max_length=100, blank=True)
    # Snapshot completo del formulario de atención
    datos_formulario = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp_atencion']

    def __str__(self):
        return f'Historial {self.bus_movil} - {self.tecnico_codigo}'

class DatosGenesis(models.Model):
    bus_movil = models.IntegerField(db_index=True)
    origen = models.CharField(max_length=200)
    destino = models.CharField(max_length=200)
    hora_entrada = models.DateTimeField(null=True, blank=True)
    patio_ubicacion = models.CharField(max_length=100, blank=True)
    datos_extra = models.JSONField(default=dict, blank=True)
    sincronizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-hora_entrada']

    def __str__(self):
        return f'Genesis {self.bus_movil}'

class DatosBusae(models.Model):
    bus_movil = models.IntegerField(db_index=True)
    latitud = models.DecimalField(max_digits=10, decimal_places=7, null=True)
    longitud = models.DecimalField(max_digits=10, decimal_places=7, null=True)
    velocidad = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    estado = models.CharField(max_length=50, blank=True)
    manos_libres = models.BooleanField(default=False)
    telefono = models.CharField(max_length=20, blank=True)
    odometro = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    ultima_transmision = models.DateTimeField(null=True)
    sincronizado_en = models.DateTimeField(auto_now=True)

    @property
    def has_app(self):
        return bool(self.manos_libres)

    class Meta:
        ordering = ['-sincronizado_en']
        indexes = [
            models.Index(fields=['bus_movil', 'sincronizado_en'], name='idx_busae_bus_sync'),
        ]

    def __str__(self):
        return f'Busae {self.bus_movil}'

class TareaExportacion(models.Model):
    FORMATOS = [
        ('CSV', 'CSV'),
        ('EXCEL', 'Excel'),
        ('PDF', 'PDF'),
    ]
    ESTADOS = [
        ('PENDIENTE', 'Pendiente'),
        ('PROCESANDO', 'Procesando'),
        ('COMPLETADA', 'Completada'),
        ('ERROR', 'Error'),
    ]
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    tipo_reporte = models.CharField(max_length=50)
    formato = models.CharField(max_length=10, choices=FORMATOS)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
    parametros = models.JSONField(default=dict)
    archivo_resultado = models.FileField(upload_to='exports/', blank=True)
    error_mensaje = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    completado_en = models.DateTimeField(null=True)

    def __str__(self):
        return f'Exportación {self.id} - {self.tipo_reporte}'


class InventarioFlota(models.Model):
    bus_movil = models.IntegerField(unique=True, db_index=True)
    placa = models.CharField(max_length=20, blank=True, db_index=True)
    tipo_flota = models.CharField(max_length=50, default='Torino')
    patio = models.CharField(max_length=100, blank=True, default='LOS PUEBLOS')
    estado = models.CharField(max_length=50, default='OPERATIVO')
    columnas_extra = models.JSONField(default=dict, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['bus_movil']

    def __str__(self):
        return f'Bus {self.bus_movil} - {self.placa} ({self.tipo_flota})'


class InventarioEE(models.Model):
    ESTADOS_ACCION = [
        ('Pendiente de revision', 'Pendiente de revisión'),
        ('Reparado', 'Reparado'),
        ('Reemplazado', 'Reemplazado'),
        ('Actualizado', 'Actualizado'),
    ]
    bus_movil = models.IntegerField(db_index=True)
    componente = models.CharField(max_length=100)
    serie = models.CharField(max_length=100, blank=True)
    imei = models.CharField(max_length=100, blank=True)
    funcional = models.BooleanField(default=True)
    danado = models.BooleanField(default=False)
    tipo_dano = models.CharField(max_length=100, blank=True)
    estado_accion = models.CharField(max_length=50, choices=ESTADOS_ACCION, default='Pendiente de revision')
    observaciones = models.TextField(blank=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['bus_movil', 'componente']

    def __str__(self):
        return f'Bus {self.bus_movil} - {self.componente} ({self.estado_accion})'


class ConfiguracionSistema(models.Model):
    clave = models.CharField(max_length=100, unique=True, db_index=True)
    valor = models.JSONField(default=dict)
    descripcion = models.CharField(max_length=255, blank=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.clave


class AuditLog(models.Model):
    ACCIONES = [
        ('CREATE', 'Creación'),
        ('UPDATE', 'Actualización'),
        ('DELETE', 'Eliminación'),
        ('ATENDER', 'Atención de Falla'),
        ('LOGIN', 'Inicio de Sesión'),
        ('CONFIG', 'Cambio de Configuración'),
    ]

    usuario = models.ForeignKey(
        'Usuario',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs_auditoria'
    )
    usuario_codigo = models.CharField(max_length=50, blank=True, help_text="Código o username de respaldo")
    accion = models.CharField(max_length=20, choices=ACCIONES, db_index=True)
    modelo = models.CharField(max_length=100, db_index=True)
    registro_id = models.CharField(max_length=100, blank=True, db_index=True)
    campo = models.CharField(max_length=100, blank=True)
    valor_anterior = models.TextField(blank=True, null=True)
    valor_nuevo = models.TextField(blank=True, null=True)
    ip_origen = models.GenericIPAddressField(null=True, blank=True)
    detalles = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['modelo', 'registro_id']),
            models.Index(fields=['accion', 'timestamp']),
            models.Index(fields=['usuario', 'timestamp']),
        ]

    def __str__(self):
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {self.usuario_codigo or 'Anon'} - {self.accion} en {self.modelo}#{self.registro_id}"


# ==============================================================================
# 1. CATÁLOGO DINÁMICO DE COMPONENTES E.E. (100% CONFIGURABLE EN BD)
# ==============================================================================

class TipoComponente(models.Model):
    CATEGORIAS = [
        ('TELEMETRIA_GPS', 'Telemetría & GPS'),
        ('AUDIO_ALERTAS', 'Audio & Alertas'),
        ('COMUNICACIONES_CTAP', 'Comunicaciones & CTAP'),
        ('SENSORES_BOTONES', 'Sensores & Botones'),
        ('ENERGIA_CABLEADO', 'Energía & Cableado'),
        ('OTROS', 'Otros Componentes'),
    ]
    nombre = models.CharField(max_length=100, unique=True)
    clave = models.SlugField(max_length=50, unique=True)
    categoria = models.CharField(max_length=40, choices=CATEGORIAS, default='TELEMETRIA_GPS')
    orden = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)
    requiere_serie = models.BooleanField(default=False, help_text="Solicita ingresar serie al revisar")
    requiere_imei = models.BooleanField(default=False, help_text="Solicita ingresar IMEI al revisar")
    descripcion = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['orden', 'nombre']

    def __str__(self):
        return f"{self.nombre} ({self.get_categoria_display()})"


class OpcionEstadoComponente(models.Model):
    TIPOS_ESTADO = [
        ('OPERATIVO', 'Operativo / Normal'),
        ('FALLA_CRITICA', 'Falla Crítica / Dañado'),
        ('ADECUACION_PENDIENTE', 'Adecuación / Por Instalar'),
        ('NO_APLICA', 'No Aplica / No Tiene'),
    ]
    componente = models.ForeignKey(TipoComponente, on_delete=models.CASCADE, related_name='opciones')
    etiqueta = models.CharField(max_length=100)
    valor = models.CharField(max_length=100)
    tipo_estado = models.CharField(max_length=30, choices=TIPOS_ESTADO, default='OPERATIVO')
    es_falla = models.BooleanField(default=False)
    color = models.CharField(max_length=30, default='emerald', help_text="emerald, rose, amber, slate, cyan")
    orden = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = ('componente', 'valor')
        ordering = ['orden', 'id']

    def __str__(self):
        return f"{self.componente.nombre} -> {self.etiqueta}"


class RevisionComponente(models.Model):
    registro = models.ForeignKey('RegistroBitacora', on_delete=models.CASCADE, related_name='revisiones_componentes')
    componente = models.ForeignKey(TipoComponente, on_delete=models.PROTECT)
    opcion = models.ForeignKey(OpcionEstadoComponente, on_delete=models.SET_NULL, null=True, blank=True)
    valor_texto = models.CharField(max_length=100, blank=True)
    serie = models.CharField(max_length=100, blank=True)
    imei = models.CharField(max_length=100, blank=True)
    observaciones = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['componente__orden', 'id']

    def __str__(self):
        return f"Rev {self.registro_id} - {self.componente.nombre}: {self.valor_texto or (self.opcion.etiqueta if self.opcion else 'N/A')}"


# ==============================================================================
# 2. INVENTARIO FÍSICO DE EQUIPOS E.E. (ACTIVOS CON IMEI, SERIE Y BUS ASIGNADO)
# ==============================================================================

class ActivoEE(models.Model):
    ESTADOS = [
        ('INSTALADO', 'Instalado en Móvil'),
        ('EN_STOCK', 'En Stock / Almacén'),
        ('EN_TALLER', 'En Reparación / Taller'),
        ('DE_BAJA', 'Dado de Baja / Descartado'),
    ]
    tipo_componente = models.ForeignKey(TipoComponente, on_delete=models.SET_NULL, null=True, blank=True, related_name='activos')
    tipo_nombre = models.CharField(max_length=100, help_text="Tipo de equipo: Módem, CTAP, SIM Card, Sensor, etc.")
    marca_modelo = models.CharField(max_length=100, blank=True)
    serie = models.CharField(max_length=100, blank=True, db_index=True)
    imei = models.CharField(max_length=50, blank=True, db_index=True)
    bus_asignado = models.IntegerField(null=True, blank=True, db_index=True, help_text="Número de bus donde está instalado")
    patio_ubicacion = models.CharField(max_length=100, default='CURUNDU')
    estado = models.CharField(max_length=30, choices=ESTADOS, default='EN_STOCK', db_index=True)
    fecha_instalacion = models.DateField(null=True, blank=True)
    observaciones = models.TextField(blank=True)
    datos_adicionales = models.JSONField(default=dict, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['tipo_nombre', 'serie']
        indexes = [
            models.Index(fields=['bus_asignado', 'tipo_nombre']),
            models.Index(fields=['estado', 'patio_ubicacion']),
        ]

    def __str__(self):
        bus_str = f"Bus #{self.bus_asignado}" if self.bus_asignado else "Sin asignar"
        id_str = f"IMEI: {self.imei}" if self.imei else f"Serie: {self.serie}"
        return f"[{self.tipo_nombre}] {id_str} ({bus_str} - {self.get_estado_display()})"


class HistorialMovimientoEquipo(models.Model):
    equipo = models.ForeignKey(ActivoEE, on_delete=models.CASCADE, related_name='movimientos')
    bus_anterior = models.IntegerField(null=True, blank=True)
    bus_nuevo = models.IntegerField(null=True, blank=True)
    estado_anterior = models.CharField(max_length=30, blank=True)
    estado_nuevo = models.CharField(max_length=30, blank=True)
    motivo = models.CharField(max_length=150)
    tecnico = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    notas = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.equipo.tipo_nombre} #{self.equipo.id}: Bus {self.bus_anterior or 'N/A'} -> {self.bus_nuevo or 'N/A'} ({self.timestamp.strftime('%d/%m/%Y')})"


# ==============================================================================
# 3. UNIDADES FUERA DE SERVICIO (EXCLUSIÓN AUTOMÁTICA DE REVISIONES DIARIAS)
# ==============================================================================

class UnidadFueraServicio(models.Model):
    MOTIVOS = [
        ('TALLER_MANTENIMIENTO', 'Taller de Mantenimiento Mecánico'),
        ('ACCIDENTE_SINIESTRO', 'Accidente / Siniestro'),
        ('BAJA_TEMPORAL', 'Baja Temporal / Espera de Repuestos'),
        ('PROCESO_LEGAL', 'Proceso Legal / Retenido'),
        ('OTRO', 'Otro Motivo'),
    ]
    ESTADOS = [
        ('ACTIVO', 'Fuera de Servicio (Activo)'),
        ('CERRADO', 'Reactivado / En Servicio'),
    ]
    bus_movil = models.IntegerField(db_index=True)
    motivo = models.CharField(max_length=50, choices=MOTIVOS, default='TALLER_MANTENIMIENTO')
    departamento_responsable = models.CharField(max_length=100, default='Taller de Mantenimiento')
    fecha_inicio = models.DateTimeField(default=timezone.now, db_index=True)
    fecha_fin_estimada = models.DateField(null=True, blank=True)
    fecha_fin_real = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='ACTIVO', db_index=True)
    usuario_registro = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name='unidades_fuera_servicio_creadas')
    usuario_cierre = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name='unidades_fuera_servicio_cerradas')
    notas = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_inicio']
        indexes = [
            models.Index(fields=['bus_movil', 'estado']),
        ]

    def __str__(self):
        return f"Bus {self.bus_movil} - {self.get_motivo_display()} ({self.estado})"


# ==============================================================================
# 4. MANTENIMIENTO PREDICTIVO & PREVENTIVO E.E.
# ==============================================================================

class PlanMantenimientoEE(models.Model):
    ESTADOS = [
        ('AL_DIA', 'Al Día'),
        ('PROXIMO', 'Próximo a Vencer (< 15 días)'),
        ('VENCIDO', 'Mantenimiento Vencido'),
    ]
    bus_movil = models.IntegerField(db_index=True)
    componente = models.ForeignKey(TipoComponente, on_delete=models.CASCADE, related_name='planes_preventivos')
    ciclo_dias = models.IntegerField(default=90, help_text="Periodicidad recomendada en días")
    fecha_ultimo_mantenimiento = models.DateField()
    fecha_proximo_vencimiento = models.DateField(db_index=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='AL_DIA')
    alertado = models.BooleanField(default=False)
    notas = models.TextField(blank=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('bus_movil', 'componente')
        ordering = ['fecha_proximo_vencimiento']

    def __str__(self):
        return f"Bus {self.bus_movil} - {self.componente.nombre} (Vence: {self.fecha_proximo_vencimiento})"



