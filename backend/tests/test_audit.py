from django.test import TestCase, RequestFactory
from django.utils import timezone
from buses.models import (
    Usuario, RegistroBitacora, ReportePendiente,
    ConfiguracionSistema, InventarioEE, AuditLog
)
from buses.services.audit_service import AuditService
from buses.middleware import AuditContextMiddleware


class AuditServiceTestCase(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.admin = Usuario.objects.create_superuser(
            username='admin_audit',
            codigo_empleado='ADM-999',
            password='adminpassword123',
            es_admin=True
        )
        self.tecnico = Usuario.objects.create_user(
            username='tec_audit',
            codigo_empleado='TEC-999',
            password='tecnicopassword123',
            patio_asignado='CURUNDU',
            cuota_diaria=20,
            es_admin=False
        )

    def test_direct_audit_registrar(self):
        log = AuditService.registrar(
            accion='CONFIG',
            modelo='ConfiguracionSistema',
            registro_id='form_bitacora',
            usuario=self.admin,
            campo='valor',
            valor_anterior='{}',
            valor_nuevo='{"campos": []}',
            ip_origen='192.168.1.50',
            detalles={'origen': 'test'}
        )
        self.assertIsNotNone(log)
        self.assertEqual(log.accion, 'CONFIG')
        self.assertEqual(log.usuario, self.admin)
        self.assertEqual(log.usuario_codigo, 'ADM-999')
        self.assertEqual(log.ip_origen, '192.168.1.50')

    def test_signals_audit_on_models(self):
        # 1. ConfiguracionSistema CREATE y UPDATE
        initial_count = AuditLog.objects.count()
        config = ConfiguracionSistema.objects.create(
            clave='audit_test_key',
            valor={'test': True},
            descripcion='Prueba de auditoria'
        )
        self.assertGreater(AuditLog.objects.filter(modelo='ConfiguracionSistema', accion='CREATE').count(), 0)

        config.descripcion = 'Prueba modificada'
        config.save()
        self.assertGreater(AuditLog.objects.filter(modelo='ConfiguracionSistema', accion='UPDATE').count(), 0)

        # 2. InventarioEE CREATE
        inv = InventarioEE.objects.create(
            bus_movil=901,
            componente='Modem GPS',
            funcional=True
        )
        self.assertGreater(AuditLog.objects.filter(modelo='InventarioEE', accion='CREATE').count(), 0)

        # 3. DELETE
        inv_id = inv.id
        inv.delete()
        self.assertGreater(AuditLog.objects.filter(modelo='InventarioEE', accion='DELETE', registro_id=str(inv_id)).count(), 0)

    def test_audit_context_middleware(self):
        middleware = AuditContextMiddleware(lambda req: req)
        request = self.factory.get('/api/bitacora/', REMOTE_ADDR='10.0.0.99')
        request.user = self.tecnico

        response = middleware(request)
        self.assertEqual(response, request)

    def test_audit_log_viewset_permissions_and_filters(self):
        from rest_framework.test import APIClient
        client = APIClient()

        # 1. Unauthenticated -> 401
        res = client.get('/api/audit-logs/')
        self.assertEqual(res.status_code, 401)

        # 2. Technician -> 403 Forbidden
        client.force_authenticate(user=self.tecnico)
        res = client.get('/api/audit-logs/')
        self.assertEqual(res.status_code, 403)

        # 3. Admin -> 200 OK
        client.force_authenticate(user=self.admin)
        res = client.get('/api/audit-logs/')
        self.assertEqual(res.status_code, 200)

        # 4. Filters work
        AuditLog.objects.create(
            usuario=self.admin,
            usuario_codigo='ADM-999',
            accion='CONFIG',
            modelo='ConfiguracionSistema',
            registro_id='test_key_filter'
        )
        res_filter = client.get('/api/audit-logs/?accion=CONFIG&modelo=ConfiguracionSistema')
        self.assertEqual(res_filter.status_code, 200)
        data = res_filter.json()
        results = data.get('results', data) if isinstance(data, dict) else data
        self.assertTrue(any(item['registro_id'] == 'test_key_filter' for item in results))

