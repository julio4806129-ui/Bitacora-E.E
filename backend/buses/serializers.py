import re
from datetime import datetime
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.hashers import make_password
from .models import (
    Usuario, ModuloDinamico, CampoConfiguracion, EEMovil,
    ReportePendiente, RegistroBitacora, HistorialAtencion,
    DatosGenesis, DatosBusae, TareaExportacion,
    InventarioFlota, InventarioEE, ConfiguracionSistema, AuditLog,
    TipoComponente, OpcionEstadoComponente, RevisionComponente,
    ActivoEE, HistorialMovimientoEquipo, UnidadFueraServicio,
    PlanMantenimientoEE
)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['codigo_empleado'] = user.codigo_empleado
        token['es_admin'] = user.es_admin
        token['patio_asignado'] = user.patio_asignado
        token['cuota_diaria'] = user.cuota_diaria
        token['nombre'] = user.get_full_name() or user.username
        return token

class UsuarioSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        exclude = ('password',)

    def get_nombre(self, obj):
        return obj.get_full_name() or obj.username

class UsuarioCreateSerializer(serializers.ModelSerializer):
    password_confirmation = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Usuario
        fields = ('id', 'username', 'password', 'password_confirmation', 'first_name', 'last_name', 'codigo_empleado', 'patio_asignado', 'cuota_diaria', 'es_admin', 'is_active')
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'username': {'required': False}
        }

    def create(self, validated_data):
        if not validated_data.get('username'):
            validated_data['username'] = validated_data.get('codigo_empleado')
        raw_password = validated_data.pop('password', None)
        if not raw_password:
            raise serializers.ValidationError({'password': 'La contraseña es requerida.'})
        validated_data.pop('password_confirmation', None)
        validated_data['password'] = make_password(raw_password)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('password_confirmation', None)
        raw_password = validated_data.pop('password', None)
        if raw_password:
            instance.password = make_password(raw_password)
        return super().update(instance, validated_data)

class CampoConfiguracionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampoConfiguracion
        fields = '__all__'

class ModuloDinamicoSerializer(serializers.ModelSerializer):
    campos = CampoConfiguracionSerializer(many=True, read_only=True)
    
    class Meta:
        model = ModuloDinamico
        fields = '__all__'

def validar_datos_dinamicos(datos, modulo_nombre):
    if not isinstance(datos, dict):
        return {}
    try:
        modulo = ModuloDinamico.objects.get(nombre=modulo_nombre)
    except ModuloDinamico.DoesNotExist:
        return datos

    campos_activos = modulo.campos.filter(activo=True)
    errores = {}

    for campo in campos_activos:
        valor = datos.get(campo.clave)
        
        if campo.requerido and (valor is None or valor == ''):
            errores[campo.clave] = 'Este campo es requerido.'
            continue
            
        if valor is not None and valor != '':
            if campo.tipo == 'NUMBER':
                try:
                    float(valor)
                except ValueError:
                    errores[campo.clave] = 'Debe ser un número válido.'
            elif campo.tipo == 'DATE':
                try:
                    datetime.strptime(str(valor), "%Y-%m-%d")
                except ValueError:
                    errores[campo.clave] = 'Formato de fecha inválido (YYYY-MM-DD).'
            elif campo.tipo in ['SELECT', 'RADIO', 'MULTISELECT']:
                if campo.tipo in ['SELECT', 'RADIO'] and campo.opciones and valor not in campo.opciones:
                    errores[campo.clave] = f'Opción inválida. Opciones: {campo.opciones}'
                elif campo.tipo == 'MULTISELECT':
                    if not isinstance(valor, list):
                        errores[campo.clave] = 'Debe ser una lista de opciones.'
                    elif campo.opciones and not all(v in campo.opciones for v in valor):
                        errores[campo.clave] = f'Una o más opciones son inválidas. Opciones: {campo.opciones}'
            elif campo.tipo == 'BOOLEAN':
                if not isinstance(valor, bool):
                    errores[campo.clave] = 'Debe ser un valor booleano.'
            
            # Validaciones extra
            val_rules = campo.validaciones
            if isinstance(val_rules, dict):
                if 'min' in val_rules and campo.tipo == 'NUMBER' and float(valor) < val_rules['min']:
                    errores[campo.clave] = f"El valor mínimo es {val_rules['min']}."
                if 'max' in val_rules and campo.tipo == 'NUMBER' and float(valor) > val_rules['max']:
                    errores[campo.clave] = f"El valor máximo es {val_rules['max']}."
                if 'regex' in val_rules and campo.tipo in ['TEXT', 'TEXTAREA']:
                    if not re.match(val_rules['regex'], str(valor)):
                        errores[campo.clave] = 'El formato del texto no es válido.'

    if errores:
        raise serializers.ValidationError(errores)
    
    return datos

class EEMovilSerializer(serializers.ModelSerializer):
    class Meta:
        model = EEMovil
        fields = '__all__'

    def validate_datos_dinamicos(self, value):
        return validar_datos_dinamicos(value, 'ee_moviles')

class ReportePendienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportePendiente
        fields = '__all__'

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any

class RegistroBitacoraPydanticSchema(BaseModel):
    bus_movil: int = Field(gt=0, description="Número de bus debe ser positivo")
    patio: str = Field(min_length=2, max_length=100)
    tipo_mantenimiento: str = Field(min_length=2, max_length=50)
    gps_estado: Optional[str] = Field(default='Funcional')
    gps_vandalismo: Optional[str] = Field(default='N/A')
    simcard_estado: Optional[str] = Field(default='N/A')
    serie_sim: Optional[str] = Field(default='')
    imei_busae: Optional[str] = Field(default='')
    adecuacion_electrica: Optional[str] = Field(default='Adecuada')
    radio_conexion: Optional[str] = Field(default='Sí')
    radio_instalacion: Optional[str] = Field(default='Sí')
    radio_parrilla: Optional[str] = Field(default='Funcional')
    radio_pedal: Optional[str] = Field(default='Funcional')
    radio_pantalla: Optional[str] = Field(default='Funcional')
    serie_ctap: Optional[str] = Field(default='')
    ctap_estado: Optional[str] = Field(default='Funcional')
    ctap_anillo: Optional[str] = Field(default='Funcional')
    boton_llamada: Optional[str] = Field(default='Funcional')
    boton_panico: Optional[str] = Field(default='Funcional')
    boton_puerta: Optional[str] = Field(default='Funcional')
    respuesta_tecnica: Optional[str] = Field(default='')
    observaciones: Optional[str] = Field(default='')

    @field_validator('patio', 'tipo_mantenimiento', mode='before')
    def sanitize_strings(cls, v):
        if isinstance(v, str):
            # Eliminar tags html o secuencias potencialmente peligrosas
            clean = re.sub(r'[<>{}]', '', v).strip()
            return clean
        return v


class RegistroBitacoraSerializer(serializers.ModelSerializer):
    tecnico_nombre = serializers.CharField(source='tecnico.get_full_name', read_only=True)
    tecnico_codigo = serializers.CharField(source='tecnico.codigo_empleado', read_only=True)

    class Meta:
        model = RegistroBitacora
        fields = '__all__'
        read_only_fields = ('tecnico',)

    def validate(self, attrs):
        # Sanitizar strings generales
        for field in ['patio', 'tipo_mantenimiento', 'respuesta_tecnica', 'observaciones']:
            if field in attrs and isinstance(attrs[field], str):
                attrs[field] = re.sub(r'[<>{}]', '', attrs[field]).strip()

        # Validación cruzada con Pydantic si es creación o actualización
        try:
            payload = {
                'bus_movil': attrs.get('bus_movil') or getattr(self.instance, 'bus_movil', 1),
                'patio': attrs.get('patio') or getattr(self.instance, 'patio', 'CURUNDU'),
                'tipo_mantenimiento': attrs.get('tipo_mantenimiento') or getattr(self.instance, 'tipo_mantenimiento', 'PREVENTIVO'),
                'gps_estado': attrs.get('gps_estado', 'Funcional'),
                'observaciones': attrs.get('observaciones', ''),
                'respuesta_tecnica': attrs.get('respuesta_tecnica', ''),
            }
            RegistroBitacoraPydanticSchema.model_validate(payload)
        except Exception as pe:
            raise serializers.ValidationError({"pydantic_validation": str(pe)})

        return attrs

    def validate_datos_dinamicos(self, value):
        return validar_datos_dinamicos(value, 'bitacora')

class HistorialAtencionSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialAtencion
        fields = '__all__'

class DatosGenesisSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatosGenesis
        fields = '__all__'

class DatosBusaeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatosBusae
        fields = '__all__'

class TareaExportacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TareaExportacion
        fields = '__all__'
        read_only_fields = ('estado', 'archivo_resultado', 'error_mensaje', 'creado_en', 'completado_en', 'usuario')



class InventarioFlotaSerializer(serializers.ModelSerializer):
    """Catálogo Flota + telemetría BUSAE + operación Genesis (solo lectura)."""
    estado_gps = serializers.SerializerMethodField()
    sin_senal = serializers.SerializerMethodField()
    ultima_transmision = serializers.SerializerMethodField()
    velocidad = serializers.SerializerMethodField()
    patio_genesis = serializers.SerializerMethodField()
    hora_entrada = serializers.SerializerMethodField()
    estado_genesis = serializers.SerializerMethodField()

    class Meta:
        model = InventarioFlota
        fields = '__all__'

    def _busae(self, obj):
        cache = self.context.get('_busae_map')
        if cache is not None:
            return cache.get(obj.bus_movil)
        from buses.models import DatosBusae
        return DatosBusae.objects.filter(bus_movil=obj.bus_movil).first()

    def _genesis(self, obj):
        cache = self.context.get('_genesis_map')
        if cache is not None:
            return cache.get(obj.bus_movil)
        from buses.models import DatosGenesis
        return DatosGenesis.objects.filter(bus_movil=obj.bus_movil).order_by('-sincronizado_en').first()

    def get_estado_gps(self, obj):
        b = self._busae(obj)
        return (b.estado if b else '') or 'Sin datos'

    def get_sin_senal(self, obj):
        from buses.catalogos import GPS_SIN_TRANSMISION
        b = self._busae(obj)
        if not b:
            return True
        return (b.estado or '') in GPS_SIN_TRANSMISION

    def get_ultima_transmision(self, obj):
        b = self._busae(obj)
        if not b:
            return None
        ts = getattr(b, 'ultima_transmision', None) or getattr(b, 'fecha_hora_gps', None)
        return ts.isoformat() if ts and hasattr(ts, 'isoformat') else (str(ts) if ts else None)

    def get_velocidad(self, obj):
        b = self._busae(obj)
        return getattr(b, 'velocidad', None) if b else None

    def get_patio_genesis(self, obj):
        g = self._genesis(obj)
        if g and getattr(g, 'patio_ubicacion', None):
            return g.patio_ubicacion
        return obj.patio or ''

    def get_hora_entrada(self, obj):
        g = self._genesis(obj)
        if not g or not getattr(g, 'hora_entrada', None):
            return ''
        he = g.hora_entrada
        return he.strftime('%H:%M:%S') if hasattr(he, 'strftime') else str(he)

    def get_estado_genesis(self, obj):
        g = self._genesis(obj)
        if not g:
            return ''
        # Preferir campo explícito; si no, inferir de datos típicos
        for attr in ('estado_bus', 'estado', 'estado_operativo'):
            val = getattr(g, attr, None)
            if val:
                return str(val)
        return 'Operativo' if g else ''


class InventarioEESerializer(serializers.ModelSerializer):
    class Meta:
        model = InventarioEE
        fields = '__all__'


class ConfiguracionSistemaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionSistema
        fields = '__all__'


class AuditLogSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'usuario', 'usuario_nombre', 'usuario_codigo',
            'accion', 'modelo', 'registro_id', 'campo',
            'valor_anterior', 'valor_nuevo', 'ip_origen',
            'detalles', 'timestamp'
        ]
        read_only_fields = fields

    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return obj.usuario.get_full_name() or obj.usuario.username
        return obj.usuario_codigo or 'Sistema'


class OpcionEstadoComponenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpcionEstadoComponente
        fields = '__all__'


class TipoComponenteSerializer(serializers.ModelSerializer):
    opciones = OpcionEstadoComponenteSerializer(many=True, read_only=True)
    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)

    class Meta:
        model = TipoComponente
        fields = '__all__'


class RevisionComponenteSerializer(serializers.ModelSerializer):
    componente_nombre = serializers.CharField(source='componente.nombre', read_only=True)
    opcion_etiqueta = serializers.CharField(source='opcion.etiqueta', read_only=True)

    class Meta:
        model = RevisionComponente
        fields = '__all__'


class HistorialMovimientoEquipoSerializer(serializers.ModelSerializer):
    tecnico_nombre = serializers.CharField(source='tecnico.get_full_name', read_only=True)

    class Meta:
        model = HistorialMovimientoEquipo
        fields = '__all__'


class ActivoEESerializer(serializers.ModelSerializer):
    movimientos = HistorialMovimientoEquipoSerializer(many=True, read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = ActivoEE
        fields = '__all__'


class UnidadFueraServicioSerializer(serializers.ModelSerializer):
    motivo_display = serializers.CharField(source='get_motivo_display', read_only=True)
    usuario_registro_nombre = serializers.CharField(source='usuario_registro.get_full_name', read_only=True)
    usuario_cierre_nombre = serializers.CharField(source='usuario_cierre.get_full_name', read_only=True)

    class Meta:
        model = UnidadFueraServicio
        fields = '__all__'


class PlanMantenimientoEESerializer(serializers.ModelSerializer):
    componente_nombre = serializers.CharField(source='componente.nombre', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = PlanMantenimientoEE
        fields = '__all__'



