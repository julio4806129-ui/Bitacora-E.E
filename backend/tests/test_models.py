from django.test import TestCase
from django.utils import timezone
from buses.models import Usuario, RegistroBitacora, ReportePendiente, DatosBusae, DatosGenesis, AuditLog

class ModelsTestCase(TestCase):
    def setUp(self):
        self.tecnico = Usuario.objects.create_user(
            username="tec101",
            codigo_empleado="TEC-101",
            first_name="Juan",
            last_name="Perez",
            patio_asignado="CURUNDU",
            cuota_diaria=20
        )

    def test_usuario_str_and_properties(self):
        self.assertIn("TEC-101", str(self.tecnico))
        self.assertEqual(self.tecnico.cuota_diaria, 20)
        self.assertFalse(self.tecnico.es_admin)

    def test_reporte_pendiente_creation(self):
        reporte = ReportePendiente.objects.create(
            report_id="REP-20260919-501",
            bus_movil=501,
            patio="CURUNDU",
            diagnostico="Sin transmisión GPS"
        )
        self.assertEqual(reporte.bus_movil, 501)
        self.assertEqual(reporte.estado, "PENDIENTE")
        self.assertIn("501", str(reporte))

    def test_registro_bitacora_creation(self):
        registro = RegistroBitacora.objects.create(
            bus_movil=501,
            patio="CURUNDU",
            tecnico=self.tecnico,
            tipo_mantenimiento="PREVENTIVO",
            gps_estado="Funcional",
            respuesta_tecnica="Revisión de cableado y antena OK."
        )
        self.assertEqual(registro.bus_movil, 501)
        self.assertEqual(registro.tecnico, self.tecnico)
        self.assertEqual(registro.gps_estado, "Funcional")

    def test_datos_busae_and_genesis(self):
        busae = DatosBusae.objects.create(
            bus_movil=501,
            latitud=8.9824,
            longitud=-79.5199,
            estado="Active"
        )
        self.assertEqual(busae.bus_movil, 501)
        self.assertEqual(busae.estado, "Active")

        genesis = DatosGenesis.objects.create(
            bus_movil=501,
            origen="Curundu",
            destino="Albrook",
            hora_entrada=timezone.now(),
            patio_ubicacion="Curundu"
        )
        self.assertEqual(genesis.bus_movil, 501)
        self.assertEqual(genesis.patio_ubicacion, "Curundu")

    def test_audit_log_creation_and_str(self):
        log = AuditLog.objects.create(
            usuario=self.tecnico,
            usuario_codigo=self.tecnico.codigo_empleado,
            accion="ATENDER",
            modelo="RegistroBitacora",
            registro_id="101",
            campo="gps_estado",
            valor_anterior="No funcional",
            valor_nuevo="Funcional",
            ip_origen="127.0.0.1",
            detalles={"motivo": "Reemplazo de fusible"}
        )
        self.assertEqual(log.usuario, self.tecnico)
        self.assertEqual(log.accion, "ATENDER")
        self.assertIn("TEC-101", str(log))
        self.assertIn("ATENDER", str(log))
        self.assertIn("RegistroBitacora#101", str(log))

