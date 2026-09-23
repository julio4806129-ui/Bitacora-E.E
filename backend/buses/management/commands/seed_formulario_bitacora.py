from django.core.management.base import BaseCommand
from buses.models import ModuloDinamico, CampoConfiguracion

DEFAULTS = [
    ("gps_estado", "Estado GPS físico", "RADIO", ["Funcional", "Corto", "Mojado", "Sin señal"], True, 10),
    ("gps_vandalismo", "Vandalismo GPS", "SELECT", ["N/A", "Pérdida de GPS", "Corto de cables", "Robo de Sim Card"], False, 20),
    ("simcard_estado", "Estado SIM", "SELECT", ["N/A", "Activa", "Deterioro", "Reemplazo"], False, 30),
    ("serie_sim", "Serie SIM", "TEXT", [], False, 40),
    ("imei_busae", "IMEI Módem", "TEXT", [], False, 50),
    ("adecuacion_electrica", "Adecuación eléctrica", "RADIO", ["Adecuada", "No Adecuada"], False, 60),
    ("radio_conexion", "Radio - Conexión", "RADIO", ["Sí", "No"], False, 70),
    ("ctap_estado", "Estado CTAP", "SELECT", ["Funcional", "Dañada", "No Tiene"], False, 80),
    ("boton_panico", "Botón de pánico", "RADIO", ["Funcional", "Dañada"], False, 90),
    ("boton_llamada", "Botón de llamada", "RADIO", ["Funcional", "Dañada"], False, 100),
]

class Command(BaseCommand):
    help = "Crea módulo bitacora y campos dinámicos por defecto del checklist"

    def handle(self, *args, **options):
        mod, created = ModuloDinamico.objects.get_or_create(
            nombre="bitacora",
            defaults={"descripcion": "Formulario de atención técnica Bitácora"},
        )
        self.stdout.write(("Módulo creado" if created else "Módulo existe") + f": {mod.nombre}")
        for other in ("ee_moviles", "incidencias", "inventario"):
            ModuloDinamico.objects.get_or_create(nombre=other, defaults={"descripcion": other})
        n = 0
        for clave, etiqueta, tipo, opciones, req, orden in DEFAULTS:
            _, c = CampoConfiguracion.objects.get_or_create(
                modulo=mod,
                clave=clave,
                defaults={
                    "etiqueta": etiqueta,
                    "tipo": tipo,
                    "opciones": opciones,
                    "requerido": req,
                    "orden": orden,
                    "activo": True,
                },
            )
            if c:
                n += 1
        self.stdout.write(self.style.SUCCESS(f"Campos nuevos: {n} | Total en bitácora: {mod.campos.count()}"))
