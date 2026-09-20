from unittest.mock import patch
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from buses.models import Usuario, ReportePendiente, RegistroBitacora, HistorialAtencion, DatosBusae

class IntegrationFlowTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tecnico = Usuario.objects.create_user(
            username="tec555",
            codigo_empleado="555",
            password="tec_password_123",
            first_name="Pedro",
            last_name="Armuelles",
            patio_asignado="CURUNDU",
            cuota_diaria=15
        )
        self.admin = Usuario.objects.create_user(
            username="admin01",
            codigo_empleado="ADM01",
            password="admin_int_pass_123",
            es_admin=True,
            is_staff=True
        )

        # Crear reporte previo de no transmision
        self.reporte = ReportePendiente.objects.create(
            report_id="REP-20260919-999",
            bus_movil=999,
            patio="CURUNDU",
            diagnostico="Sin senal GPS desde 04:00 AM",
            estado="PENDIENTE"
        )

    def test_complete_technician_flow(self):
        # 1. Login rápido por código de empleado + PIN/contraseña
        login_res = self.client.post('/api/auth/codigo/', {'codigo': '555', 'pin': 'tec_password_123'})
        self.assertEqual(login_res.status_code, 200)
        token = login_res.data.get('access')
        self.assertIsNotNone(token)

        # Autenticar cliente con JWT
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # 2. Consultar bandeja de pendientes
        bandeja_res = self.client.get('/api/reportes-pendientes/')
        self.assertEqual(bandeja_res.status_code, 200)

        # 3. Registrar atención técnica
        atencion_payload = {
            'bus_movil': 999,
            'reportId': 'REP-20260919-999',
            'patio': 'CURUNDU',
            'tipo_atencion': 'CORRECTIVO',
            'gps_estado': 'Funcional',
            'simcard_estado': 'Funcional',
            'serie_sim': '895071234567890',
            'imei_busae': '863412059874123',
            'radio_conexion': 'Sí',
            'radio_instalacion': 'Sí',
            'respuesta_tecnica': 'Antena GPS reconectada con éxito. Equipo transmitiendo con satélites.',
            'observaciones': 'Atención completada en patio.',
        }

        atender_res = self.client.post('/api/bitacora/atender/', atencion_payload)
        self.assertEqual(atender_res.status_code, 200)
        self.assertEqual(atender_res.data.get('status'), 'success')

        # 4. Verificar que el reporte cambió a ATENDIDO
        self.reporte.refresh_from_db()
        self.assertEqual(self.reporte.estado, 'ATENDIDO')

        # 5. Verificar que se creó el registro en Bitácora y en Historial
        self.assertTrue(RegistroBitacora.objects.filter(bus_movil=999, tecnico=self.tecnico).exists())
        self.assertTrue(HistorialAtencion.objects.filter(bus_movil=999, tecnico_codigo='555').exists())

        # 6. Admin consulta el dashboard y ve el incremento del turno (usa /api/token/ — no el endpoint de técnicos)
        admin_token_res = self.client.post('/api/token/', {'username': 'admin01', 'password': 'admin_int_pass_123'})
        self.assertEqual(admin_token_res.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token_res.data["access"]}')
        dash_res = self.client.get('/api/admin/dashboard/stats/')
        self.assertEqual(dash_res.status_code, 200)
        self.assertGreaterEqual(dash_res.data['turno_actual']['total_atenciones'], 1)

    def test_busae_resilience_fallback(self):
        """
        Prueba que si BusAE falla o entra en circuit breaker, el servicio
        retorna estado 'circuit_open' o 'degraded' y la API no colapsa.
        """
        from shared.exceptions import CircuitBreakerOpen
        from buses.services.busae_service import busae_service

        with patch.object(busae_service, 'fetch_raw_data', side_effect=CircuitBreakerOpen('busae_fetch', 300)):
            res = busae_service.sync()
            self.assertEqual(res.get('status'), 'circuit_open')
            self.assertTrue(res.get('fallback_applied'))
