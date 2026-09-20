import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from buses.models import (
    Usuario, TipoComponente, OpcionEstadoComponente, ActivoEE,
    PlanMantenimientoEE, InventarioFlota
)

class Command(BaseCommand):
    help = 'Siembra el catálogo dinámico de componentes E.E. y el inventario de activos físicos'

    def handle(self, *args, **options):
        self.stdout.write("Sembrando catálogo dinámico de componentes E.E. (MiBus Panamá)...")

        # ── 1. Catálogo de Componentes E.E. ──────────────────────────
        catalogos = [
            {
                'nombre': 'Módem 4G / GPS',
                'clave': 'modem',
                'categoria': 'TELEMETRIA_GPS',
                'orden': 1,
                'requiere_serie': True,
                'requiere_imei': True,
                'descripcion': 'Módem telemático principal conectado al bus para transmisión satelital y GPRS.',
                'opciones': [
                    ('FUNCIONA', 'FUNCIONA', 'OPERATIVO', False, 'emerald', 1),
                    ('DESCONECTADO', 'DESCONECTADO', 'FALLA_CRITICA', True, 'amber', 2),
                    ('MOJADO', 'MOJADO', 'FALLA_CRITICA', True, 'rose', 3),
                    ('DAÑADO', 'DAÑADO', 'FALLA_CRITICA', True, 'rose', 4),
                    ('POR INSTALAR', 'POR INSTALAR', 'ADECUACION_PENDIENTE', True, 'blue', 5),
                ]
            },
            {
                'nombre': 'Actualización Firmware',
                'clave': 'actualizacion_fw',
                'categoria': 'TELEMETRIA_GPS',
                'orden': 2,
                'requiere_serie': False,
                'requiere_imei': False,
                'descripcion': 'Versión del software embarcado en la unidad telemática.',
                'opciones': [
                    ('ACTUALIZADO', 'ACTUALIZADO', 'OPERATIVO', False, 'emerald', 1),
                    ('POR ACTUALIZAR', 'POR ACTUALIZAR', 'ADECUACION_PENDIENTE', False, 'amber', 2),
                ]
            },
            {
                'nombre': 'Bocina Alerta',
                'clave': 'bocina',
                'categoria': 'AUDIO_ALERTAS',
                'orden': 3,
                'requiere_serie': False,
                'requiere_imei': False,
                'descripcion': 'Bocina interior de advertencia y sonido de pánico.',
                'opciones': [
                    ('FUNCIONA', 'FUNCIONA', 'OPERATIVO', False, 'emerald', 1),
                    ('VANDALISMO ROBADA', 'VANDALISMO / ROBADA', 'FALLA_CRITICA', True, 'rose', 2),
                    ('DAÑADA', 'DAÑADA', 'FALLA_CRITICA', True, 'rose', 3),
                    ('POR INSTALAR', 'POR INSTALAR', 'ADECUACION_PENDIENTE', True, 'blue', 4),
                ]
            },
            {
                'nombre': 'Adecuación Bocina',
                'clave': 'bocina_adecuacion',
                'categoria': 'AUDIO_ALERTAS',
                'orden': 4,
                'requiere_serie': False,
                'requiere_imei': False,
                'descripcion': 'Ubicación física y ajuste antivibración de la bocina.',
                'opciones': [
                    ('ADECUADA', 'ADECUADA O MOVILIZADA', 'OPERATIVO', False, 'emerald', 1),
                    ('POR ADECUAR', 'POR ADECUAR', 'ADECUACION_PENDIENTE', False, 'amber', 2),
                ]
            },
            {
                'nombre': 'Bocina / Carcasa',
                'clave': 'bocina_carcasa',
                'categoria': 'AUDIO_ALERTAS',
                'orden': 5,
                'requiere_serie': False,
                'requiere_imei': False,
                'descripcion': 'Carcasa protectora metálica / plástica de la bocina.',
                'opciones': [
                    ('INSTALADA', 'INSTALADA', 'OPERATIVO', False, 'emerald', 1),
                    ('NO TIENE', 'NO TIENE', 'FALLA_CRITICA', True, 'rose', 2),
                ]
            },
            {
                'nombre': 'Bocina / Regulador',
                'clave': 'bocina_regulador',
                'categoria': 'AUDIO_ALERTAS',
                'orden': 6,
                'requiere_serie': False,
                'requiere_imei': False,
                'descripcion': 'Regulador de voltaje de alimentación de la bocina.',
                'opciones': [
                    ('FUNCIONA', 'FUNCIONA', 'OPERATIVO', False, 'emerald', 1),
                    ('DAÑADO', 'DAÑADO', 'FALLA_CRITICA', True, 'rose', 2),
                    ('POR INSTALAR', 'POR INSTALAR', 'ADECUACION_PENDIENTE', True, 'blue', 3),
                ]
            },
            {
                'nombre': 'Botón de Llamada',
                'clave': 'boton_llamada',
                'categoria': 'SENSORES_BOTONES',
                'orden': 7,
                'requiere_serie': False,
                'requiere_imei': False,
                'descripcion': 'Pulsador de llamada del conductor al centro de control.',
                'opciones': [
                    ('FUNCIONA', 'FUNCIONA', 'OPERATIVO', False, 'emerald', 1),
                    ('DAÑADO', 'DAÑADO', 'FALLA_CRITICA', True, 'rose', 2),
                    ('POR INSTALAR', 'POR INSTALAR', 'ADECUACION_PENDIENTE', True, 'blue', 3),
                ]
            },
            {
                'nombre': 'Botón de Pánico',
                'clave': 'boton_panico',
                'categoria': 'SENSORES_BOTONES',
                'orden': 8,
                'requiere_serie': False,
                'requiere_imei': False,
                'descripcion': 'Pulsador silencioso de emergencia conectado al CTAP/Módem.',
                'opciones': [
                    ('FUNCIONA', 'FUNCIONA', 'OPERATIVO', False, 'emerald', 1),
                    ('DAÑADO', 'DAÑADO', 'FALLA_CRITICA', True, 'rose', 2),
                    ('POR INSTALAR', 'POR INSTALAR', 'ADECUACION_PENDIENTE', True, 'blue', 3),
                ]
            },
            {
                'nombre': 'SIM Card GPRS',
                'clave': 'sim_card',
                'categoria': 'COMUNICACIONES_CTAP',
                'orden': 9,
                'requiere_serie': True,
                'requiere_imei': False,
                'descripcion': 'Tarjeta SIM de datos celulares para enlace telemático.',
                'opciones': [
                    ('ACTIVA', 'ACTIVA / TRANSMITE', 'OPERATIVO', False, 'emerald', 1),
                    ('NO GPRS', 'NO GPRS / SIN SALDO', 'FALLA_CRITICA', True, 'amber', 2),
                    ('VANDALISMO SUSTRAIDA O ROBADA', 'ROBADA / SUSTRAÍDA', 'FALLA_CRITICA', True, 'rose', 3),
                    ('POR INSTALAR', 'POR INSTALAR', 'ADECUACION_PENDIENTE', True, 'blue', 4),
                ]
            },
            {
                'nombre': 'Anillo de Antena',
                'clave': 'anillo',
                'categoria': 'COMUNICACIONES_CTAP',
                'orden': 10,
                'requiere_serie': False,
                'requiere_imei': False,
                'descripcion': 'Anillo acoplador y fijación de antena en techo.',
                'opciones': [
                    ('FUNCIONA', 'FUNCIONA', 'OPERATIVO', False, 'emerald', 1),
                    ('DAÑADO', 'DAÑADO', 'FALLA_CRITICA', True, 'rose', 2),
                    ('SE AJUSTO', 'SE AJUSTÓ', 'OPERATIVO', False, 'cyan', 3),
                    ('POR INSTALAR', 'POR INSTALAR', 'ADECUACION_PENDIENTE', True, 'blue', 4),
                ]
            },
            {
                'nombre': 'Consola CTAP',
                'clave': 'ctap',
                'categoria': 'COMUNICACIONES_CTAP',
                'orden': 11,
                'requiere_serie': True,
                'requiere_imei': False,
                'descripcion': 'Consola de Terminal de Abordo para Operación y Despacho.',
                'opciones': [
                    ('FUNCIONA', 'FUNCIONA', 'OPERATIVO', False, 'emerald', 1),
                    ('DAÑADO', 'DAÑADO', 'FALLA_CRITICA', True, 'rose', 2),
                    ('EXTRAVIADO', 'EXTRAVIADO', 'FALLA_CRITICA', True, 'rose', 3),
                    ('SE AJUSTO', 'SE AJUSTÓ', 'OPERATIVO', False, 'cyan', 4),
                    ('POR INSTALAR', 'POR INSTALAR', 'ADECUACION_PENDIENTE', True, 'blue', 5),
                ]
            },
            {
                'nombre': 'Radio Base (Parrilla/Pedal/Pantalla)',
                'clave': 'radio_base',
                'categoria': 'COMUNICACIONES_CTAP',
                'orden': 12,
                'requiere_serie': False,
                'requiere_imei': False,
                'descripcion': 'Equipo de radiocomunicación por voz Motorola/TETRA.',
                'opciones': [
                    ('OPERATIVO', 'OPERATIVO COMPLETO', 'OPERATIVO', False, 'emerald', 1),
                    ('PEDAL_DAÑADO', 'PEDAL DAÑADO', 'FALLA_CRITICA', True, 'amber', 2),
                    ('PANTALLA_DAÑADA', 'PANTALLA DAÑADA', 'FALLA_CRITICA', True, 'rose', 3),
                    ('SIN_CONEXION', 'SIN CONEXIÓN / APAGADO', 'FALLA_CRITICA', True, 'rose', 4),
                ]
            }
        ]

        componentes_map = {}
        for cdata in catalogos:
            comp, _ = TipoComponente.objects.update_or_create(
                clave=cdata['clave'],
                defaults={
                    'nombre': cdata['nombre'],
                    'categoria': cdata['categoria'],
                    'orden': cdata['orden'],
                    'requiere_serie': cdata['requiere_serie'],
                    'requiere_imei': cdata['requiere_imei'],
                    'descripcion': cdata['descripcion'],
                    'activo': True,
                }
            )
            componentes_map[cdata['clave']] = comp

            for val, etiq, testado, esfalla, color, ordn in cdata['opciones']:
                OpcionEstadoComponente.objects.update_or_create(
                    componente=comp,
                    valor=val,
                    defaults={
                        'etiqueta': etiq,
                        'tipo_estado': testado,
                        'es_falla': esfalla,
                        'color': color,
                        'orden': ordn,
                        'activo': True,
                    }
                )

        self.stdout.write(self.style.SUCCESS(f"[OK] {len(catalogos)} componentes y sus opciones sembrados."))

        # ── 2. Inventario de Activos Físicos (Hardware Assets) ─────────
        self.stdout.write("Sembrando inventario de equipos (Módem, CTAP, SIM Card)...")
        modem_comp = componentes_map.get('modem')
        ctap_comp = componentes_map.get('ctap')
        sim_comp = componentes_map.get('sim_card')

        buses_muestra = [1001, 1002, 1003, 1005, 1010, 1015, 1020, 1050, 1080, 1100, 1205, 1310]
        activos_creados = 0

        for idx, bus in enumerate(buses_muestra):
            patio = 'Patio Curundu' if idx % 2 == 0 else 'Patio Ojo de Agua'
            
            # Módem
            ActivoEE.objects.update_or_create(
                imei=f"8642090400{bus:04d}",
                defaults={
                    'tipo_componente': modem_comp,
                    'tipo_nombre': 'Módem 4G',
                    'marca_modelo': 'Teltonika FMB640',
                    'serie': f"SN-MDM-{bus}",
                    'bus_asignado': bus,
                    'patio_ubicacion': patio,
                    'estado': 'INSTALADO',
                    'fecha_instalacion': datetime.date.today() - datetime.timedelta(days=90),
                    'observaciones': 'Instalación estándar de fábrica MiBus'
                }
            )

            # CTAP
            ActivoEE.objects.update_or_create(
                serie=f"CTAP-2024-{bus:04d}",
                defaults={
                    'tipo_componente': ctap_comp,
                    'tipo_nombre': 'Consola CTAP',
                    'marca_modelo': 'BUSAE CTAP v3.1',
                    'imei': '',
                    'bus_asignado': bus,
                    'patio_ubicacion': patio,
                    'estado': 'INSTALADO',
                    'fecha_instalacion': datetime.date.today() - datetime.timedelta(days=120),
                    'observaciones': 'Pantalla táctil y teclado numérico'
                }
            )

            # SIM Card
            ActivoEE.objects.update_or_create(
                serie=f"8950712000{bus:05d}",
                defaults={
                    'tipo_componente': sim_comp,
                    'tipo_nombre': 'SIM Card GPRS',
                    'marca_modelo': 'Tigo Panamá M2M',
                    'imei': '',
                    'bus_asignado': bus,
                    'patio_ubicacion': patio,
                    'estado': 'INSTALADO',
                    'fecha_instalacion': datetime.date.today() - datetime.timedelta(days=90),
                    'observaciones': 'Plan de datos ilimitado M2M'
                }
            )
            activos_creados += 3

        # Equipos adicionales en Stock / Taller
        stock_items = [
            ('Módem 4G', modem_comp, 'Teltonika FMB640', 'SN-MDM-STOCK-01', '86420904990001', None, 'Patio Curundu', 'EN_STOCK', 'Módem nuevo en caja'),
            ('Módem 4G', modem_comp, 'Teltonika FMB640', 'SN-MDM-STOCK-02', '86420904990002', None, 'Patio Los Pueblos', 'EN_STOCK', 'Módem nuevo en caja'),
            ('Módem 4G', modem_comp, 'Teltonika FMB640', 'SN-MDM-TALLER-01', '86420904880001', None, 'Patio Curundu', 'EN_TALLER', 'Módem mojado en reparación'),
            ('Consola CTAP', ctap_comp, 'BUSAE CTAP v3.1', 'CTAP-STOCK-01', '', None, 'Patio Curundu', 'EN_STOCK', 'Listo para reemplazo'),
            ('Consola CTAP', ctap_comp, 'BUSAE CTAP v3.1', 'CTAP-TALLER-01', '', None, 'Patio Ojo de Agua', 'EN_TALLER', 'Pantalla quebrada por vandalismo'),
            ('SIM Card GPRS', sim_comp, 'Tigo Panamá M2M', '89507129990001', '', None, 'Patio Curundu', 'EN_STOCK', 'SIM nueva sin asignar'),
            ('SIM Card GPRS', sim_comp, 'Más Móvil M2M', '89507129990002', '', None, 'Patio Los Pueblos', 'EN_STOCK', 'SIM de respaldo'),
        ]

        for tnom, tcomp, mm, ser, imei, bus, pat, est, obs in stock_items:
            lookup = {'imei': imei} if imei else {'serie': ser}
            ActivoEE.objects.update_or_create(
                **lookup,
                defaults={
                    'tipo_componente': tcomp,
                    'tipo_nombre': tnom,
                    'marca_modelo': mm,
                    'serie': ser,
                    'bus_asignado': bus,
                    'patio_ubicacion': pat,
                    'estado': est,
                    'observaciones': obs
                }
            )
            activos_creados += 1

        self.stdout.write(self.style.SUCCESS(f"[OK] {activos_creados} activos de hardware sembrados en inventario."))

        # ── 3. Asegurar contraseñas de usuarios oficiales ─────────────
        usuarios_oficiales = [
            ('13283', 'MiBus2026!', True, 'Jerald', 'Admin'),
            ('10844', 'MiBus2026!', True, 'Carlos', 'Ruiz'),
            ('9335', 'MiBus2026!', True, 'Ana', 'Gomez'),
            ('12517', 'MiBus2026!', True, 'Roberto', 'Mendez'),
            ('12505', 'MiBus2026!', True, 'Miguel', 'Sanchez'),
            ('14101', 'Tecnico2026!', False, 'David', 'Castro'),
            ('14102', 'Tecnico2026!', False, 'Fernando', 'Torres'),
            ('14103', 'Tecnico2026!', False, 'Luis', 'Herrera'),
            ('admin', 'Admin2026!', True, 'Super', 'Admin'),
        ]

        for cod, pwd, is_adm, fn, ln in usuarios_oficiales:
            u, created = Usuario.objects.get_or_create(
                username=cod,
                defaults={
                    'codigo_empleado': cod,
                    'first_name': fn,
                    'last_name': ln,
                    'email': f'{cod}@mibus.com.pa',
                    'patio_asignado': 'Patio Curundu',
                    'cuota_diaria': 20,
                    'es_admin': is_adm,
                    'is_staff': is_adm,
                    'is_active': True,
                }
            )
            u.codigo_empleado = cod
            u.es_admin = is_adm
            u.is_staff = is_adm
            u.is_active = True
            u.set_password(pwd)
            u.save()

        self.stdout.write(self.style.SUCCESS("[OK] Credenciales actualizadas para técnicos y administradores (contraseña base: MiBus2026! / Tecnico2026!)."))
