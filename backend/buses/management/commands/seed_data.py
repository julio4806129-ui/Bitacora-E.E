import uuid
import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from buses.models import (
    Usuario, ModuloDinamico, CampoConfiguracion, EEMovil,
    ReportePendiente, RegistroBitacora, HistorialAtencion,
    DatosGenesis, DatosBusae
)

class Command(BaseCommand):
    help = 'Inicializa la base de datos con modulos dinamicos, usuarios de MiBus, reportes pendientes y flota'

    def handle(self, *args, **options):
        self.stdout.write("Inicializando base de datos Enterprise Bitacora E.E. - MiBus...")

        # 1. Modulos Dinamicos
        modulos_data = [
            ('bitacora', 'Campos dinámicos para la bitácora de atenciones y revisiones técnicas'),
            ('ee_moviles', 'Campos dinámicos para equipamiento embarcado y componentes de hardware'),
            ('incidencias', 'Campos dinámicos para registro de incidencias y fallas'),
        ]
        
        modulos = {}
        for nombre, desc in modulos_data:
            m, _ = ModuloDinamico.objects.get_or_create(
                nombre=nombre,
                defaults={'descripcion': desc}
            )
            modulos[nombre] = m

        # 2. Campos Dinámicos
        campos_data = [
            (modulos['bitacora'], 'voltaje_bateria', 'Voltaje de Batería (V)', 'NUMBER', [], {'min': 10, 'max': 30}, False, 1),
            (modulos['bitacora'], 'clasificacion_falla', 'Clasificación de Falla', 'SELECT', ['Ninguna', 'Hardware', 'Cableado', 'Firmware', 'Vandalismo'], {}, False, 2),
            (modulos['bitacora'], 'camara_dvr', 'Cámara / DVR Embarcado', 'SELECT', ['OPERATIVA', 'DAÑADA', 'DESCONECTADA', 'NO TIENE'], {}, False, 3),
            (modulos['ee_moviles'], 'operador_sim', 'Operador SIM Card', 'SELECT', ['Tigo', 'Más Móvil', 'Digicel', 'Claro'], {}, True, 1),
            (modulos['ee_moviles'], 'ip_estatica', 'Dirección IP Móvil', 'TEXT', [], {}, False, 2),
        ]

        for mod, clave, etiqueta, tipo, opciones, validaciones, requerido, orden in campos_data:
            CampoConfiguracion.objects.get_or_create(
                modulo=mod,
                clave=clave,
                defaults={
                    'etiqueta': etiqueta,
                    'tipo': tipo,
                    'opciones': opciones,
                    'validaciones': validaciones,
                    'requerido': requerido,
                    'orden': orden,
                    'activo': True,
                }
            )

        # 3. Usuarios Oficiales (Administradores y Técnicos)
        usuarios_data = [
            ('13283', 'Jerald', 'Admin', 'Patio Curundu', 25, True),
            ('10844', 'Carlos', 'Ruiz', 'Patio Ojo de Agua', 20, True),
            ('9335', 'Ana', 'Gomez', 'Patio Los Pueblos', 20, True),
            ('12517', 'Roberto', 'Mendez', 'Patio La Cabima', 20, True),
            ('12505', 'Miguel', 'Sanchez', 'Patio Chorrillo', 20, True),
            ('14101', 'David', 'Castro', 'Patio La Dona', 20, False),
            ('14102', 'Fernando', 'Torres', 'Patio Curundu', 20, False),
            ('14103', 'Luis', 'Herrera', 'Patio Ojo de Agua', 20, False),
            ('admin', 'Super', 'Admin', 'Patio Curundu', 50, True),
        ]

        for cod, fn, ln, patio, cuota, is_adm in usuarios_data:
            u, created = Usuario.objects.get_or_create(
                username=cod,
                defaults={
                    'codigo_empleado': cod,
                    'first_name': fn,
                    'last_name': ln,
                    'email': f'{cod}@mibus.com.pa',
                    'patio_asignado': patio,
                    'cuota_diaria': cuota,
                    'es_admin': is_adm,
                    'is_staff': is_adm,
                    'is_superuser': is_adm
                }
            )
            u.set_password('mibus2026')
            u.es_admin = is_adm
            u.save()

        # 4. Patios y Buses de Inventario E.E.
        patios_list = ['Patio La Cabima', 'Patio Chorrillo', 'Patio Curundu', 'Patio La Dona', 'Patio Los Pueblos', 'Patio Ojo de Agua']
        buses_numeros = [1021, 1045, 1088, 1120, 1155, 1204, 1250, 1310, 1342, 1405, 1450, 1502, 1555, 1601, 1650, 1702, 1750, 1801]

        for i, num in enumerate(buses_numeros):
            patio_bus = patios_list[i % len(patios_list)]
            modem_estado = 'FUNCIONA' if i % 4 != 0 else 'DAÑADO'
            bocina_estado = 'FUNCIONA' if i % 5 != 0 else 'DAÑADA'
            
            EEMovil.objects.get_or_create(
                bus_movil=num,
                defaults={
                    'patio': patio_bus,
                    'hora': f'0{7 + (i % 5)}:30',
                    'estado': 'OPERATIVO' if modem_estado == 'FUNCIONA' else 'INOPERATIVO',
                    'fase_instalacion': 'Fase 2 (Completa)',
                    'fase_bocina': 'Adecuada',
                    'version_firmware': 'v2.4.1-rc3',
                    'estado_fw': 'ACTUALIZADO',
                    'estado_modem': modem_estado,
                    'estado_bocina': bocina_estado,
                    'ultima_atencion': timezone.now() - datetime.timedelta(days=(i % 10)),
                    'diagnostico': 'Monitoreo de telemetría y transmisión activa' if modem_estado == 'FUNCIONA' else 'Revisión técnica de módem requerida'
                }
            )

        # 5. Reportes Pendientes para la Bandeja Diaria (Reportes)
        reportes_data = [
            (1088, 'OFF', 'Patio Curundu', 'Módem sin transmisión GPS desde hace 48h. Posible falla de alimentación.'),
            (1155, 'OFF', 'Patio La Cabima', 'Bocina no emite audio de parada y botón de llamada trabado.'),
            (1250, 'ON', 'Patio Ojo de Agua', 'Actualización de firmware pendiente v2.4.1.'),
            (1342, 'OFF', 'Patio Los Pueblos', 'SIM Card sin GPRS / no reporta datos a BUSAE.'),
            (1450, 'OFF', 'Patio Chorrillo', 'Anillo y CTAP desconectados por adecuación.'),
            (1601, 'OFF', 'Patio La Dona', 'Bocina dañada por vibración interna.'),
        ]

        for b_movil, st_gps, pat, diag in reportes_data:
            r_id = str(uuid.uuid4())[:8].upper()
            ReportePendiente.objects.get_or_create(
                bus_movil=b_movil,
                estado='PENDIENTE',
                defaults={
                    'report_id': f'REP-{b_movil}-{r_id}',
                    'estado_gps': st_gps,
                    'patio': pat,
                    'hora_reporte': '07:45',
                    'diagnostico': diag
                }
            )

        # 6. Registros Históricos de Bitácora para la Semana Actual
        tec_1 = Usuario.objects.filter(codigo_empleado='13283').first()
        tec_2 = Usuario.objects.filter(codigo_empleado='10844').first()
        hoy = timezone.now().date()

        for d_offset in range(5, -1, -1):
            fecha_rec = hoy - datetime.timedelta(days=d_offset)
            dt_rec = timezone.make_aware(datetime.datetime.combine(fecha_rec, datetime.time(9, 30, 0)))
            
            RegistroBitacora.objects.get_or_create(
                bus_movil=2000 + d_offset * 10,
                timestamp=dt_rec,
                defaults={
                    'patio': 'Patio Curundu',
                    'tecnico': tec_1,
                    'tipo_mantenimiento': 'REVISION POR BITACORA',
                    'modem': 'FUNCIONA',
                    'actualizacion_fw': 'ACTUALIZADO',
                    'bocina': 'FUNCIONA',
                    'bocina_adecuacion': 'ADECUADA',
                    'bocina_carcasa': 'INSTALADA',
                    'bocina_regulador': 'FUNCIONA',
                    'boton_llamada': 'FUNCIONA',
                    'boton_panico': 'FUNCIONA',
                    'sim_card': 'ACTIVA',
                    'serie_sim': f'89507123456{d_offset}',
                    'imei_busae': f'3589120567890{d_offset:02d}',
                    'anillo': 'FUNCIONA',
                    'ctap': 'FUNCIONA',
                    'serie_ctap': f'77012{d_offset:03d}',
                    'respuesta_tecnica': 'Mantenimiento preventivo completado satisfactoriamente.',
                    'origen': 'reportes'
                }
            )

        self.stdout.write(self.style.SUCCESS("[OK] Base de datos inicializada exitosamente con datos Enterprise de MiBus."))
