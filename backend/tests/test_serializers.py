from django.test import TestCase
from buses.models import Usuario, RegistroBitacora
from buses.serializers import RegistroBitacoraSerializer, RegistroBitacoraPydanticSchema

class SerializersTestCase(TestCase):
    def setUp(self):
        self.tecnico = Usuario.objects.create_user(
            username="tec102",
            codigo_empleado="TEC-102",
            first_name="Carlos",
            last_name="Gomez",
            patio_asignado="LOS PUEBLOS"
        )

    def test_pydantic_schema_validation(self):
        valid_payload = {
            "bus_movil": 802,
            "patio": "LOS PUEBLOS",
            "tipo_mantenimiento": "CORRECTIVO",
            "gps_estado": "Funcional",
            "observaciones": "Equipo operativo."
        }
        item = RegistroBitacoraPydanticSchema.model_validate(valid_payload)
        self.assertEqual(item.bus_movil, 802)
        self.assertEqual(item.patio, "LOS PUEBLOS")

    def test_registro_bitacora_serializer_valid(self):
        data = {
            "bus_movil": 802,
            "patio": "LOS PUEBLOS",
            "tipo_mantenimiento": "PREVENTIVO",
            "gps_estado": "Funcional",
            "respuesta_tecnica": "Ajuste de conexiones y validación con centro de control."
        }
        serializer = RegistroBitacoraSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save(tecnico=self.tecnico)
        self.assertEqual(instance.bus_movil, 802)
        self.assertEqual(instance.tecnico, self.tecnico)

    def test_serializer_sanitization(self):
        data = {
            "bus_movil": 802,
            "patio": "<script>alert('xss')</script>CURUNDU",
            "tipo_mantenimiento": "PREVENTIVO",
            "gps_estado": "Funcional",
            "respuesta_tecnica": "Respuesta limpia <b>ok</b>"
        }
        serializer = RegistroBitacoraSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save(tecnico=self.tecnico)
        self.assertNotIn("<script>", instance.patio)
