from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from buses.models import Usuario

class LoginByCodigoTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tecnico = Usuario.objects.create_user(
            username="tec_test",
            codigo_empleado="TEC-999",
            password="pin_seguro_123",
            first_name="Carlos",
            last_name="Tecnico",
            patio_asignado="CURUNDU",
            es_admin=False
        )
        self.admin = Usuario.objects.create_user(
            username="admin_test",
            codigo_empleado="ADM-999",
            password="admin_seguro_123",
            first_name="Super",
            last_name="Admin",
            es_admin=True,
            is_staff=True
        )
        self.inactivo = Usuario.objects.create_user(
            username="inactivo_test",
            codigo_empleado="TEC-000",
            password="clave_inactiva",
            is_active=False
        )

    def test_login_exitoso_tecnico_con_codigo_y_clave(self):
        resp = self.client.post('/api/auth/codigo/', {
            'codigo': 'TEC-999',
            'pin': 'pin_seguro_123'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)
        self.assertEqual(resp.data['user']['rol'], 'tecnico')
        self.assertFalse(resp.data['user']['es_admin'])
        self.assertFalse(resp.data['user']['isAdmin'])

    def test_login_falla_sin_clave(self):
        resp = self.client.post('/api/auth/codigo/', {
            'codigo': 'TEC-999'
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', resp.data)

    def test_login_falla_clave_incorrecta(self):
        resp = self.client.post('/api/auth/codigo/', {
            'codigo': 'TEC-999',
            'pin': 'clave_erronea_xyz'
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('error', resp.data)

    def test_login_falla_codigo_inexistente(self):
        resp = self.client.post('/api/auth/codigo/', {
            'codigo': 'NOEXISTE',
            'pin': 'cualquiera'
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_bloquea_usuario_inactivo(self):
        resp = self.client.post('/api/auth/codigo/', {
            'codigo': 'TEC-000',
            'pin': 'clave_inactiva'
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('inactivo', resp.data['error'].lower())

    def test_login_previene_escalada_de_admin(self):
        """Los administradores no deben poder autenticarse por el endpoint rápido de técnicos."""
        resp = self.client.post('/api/auth/codigo/', {
            'codigo': 'ADM-999',
            'pin': 'admin_seguro_123'
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('administradores', resp.data['error'].lower())
