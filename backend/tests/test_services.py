from unittest.mock import patch, MagicMock
from django.test import TestCase
from shared.decorators import retry_exponential, circuit_breaker, CircuitBreaker
from shared.exceptions import CircuitBreakerOpen, ExternalServiceError
from buses.services.busae_service import busae_service
from buses.services.genesis_service import genesis_service
from buses.models import DatosBusae, DatosGenesis

class ServicesTestCase(TestCase):
    def test_retry_exponential_decorator(self):
        calls = 0

        @retry_exponential(max_retries=3, base_delay=0.01, backoff_factor=1.5)
        def flaky_function():
            nonlocal calls
            calls += 1
            if calls < 3:
                raise ValueError("Falla temporal simulada")
            return "SUCCESS"

        result = flaky_function()
        self.assertEqual(result, "SUCCESS")
        self.assertEqual(calls, 3)

    def test_circuit_breaker_opening(self):
        breaker_name = "test_breaker_unit"
        breaker = CircuitBreaker.get_breaker(breaker_name, failure_threshold=2, timeout=10)

        @circuit_breaker(name=breaker_name, failure_threshold=2, timeout=10)
        def failing_function():
            raise ExternalServiceError("DummyService", "Caída total del servicio")

        # 1er fallo
        with self.assertRaises(ExternalServiceError):
            failing_function()
        # 2do fallo -> Abre el circuito
        with self.assertRaises(ExternalServiceError):
            failing_function()

        # 3er intento -> El circuito ya está abierto, lanza CircuitBreakerOpen sin ejecutar la función
        with self.assertRaises(CircuitBreakerOpen):
            failing_function()

    def test_busae_parse_and_save(self):
        raw_items = [
            {
                "bn": "105",
                "plt": "MB-1005",
                "st": "Active",
                "l_g_s": "2026-09-19 08:30:00",
                "h_ti": 1,
                "tel": "6000-0000",
                "lat": "8.9800",
                "ln": "-79.5200"
            },
            {
                "bn": "205",
                "plt": "MB-2005",
                "st": "Offline",
                "l_g_s": "",
                "h_ti": 0,
                "tel": "",
                "lat": "",
                "ln": ""
            }
        ]

        buses = busae_service.parse_and_validate(raw_items)
        self.assertEqual(len(buses), 2)
        saved = busae_service.save_to_database(buses)
        self.assertEqual(saved, 2)
        self.assertTrue(DatosBusae.objects.filter(bus_movil=105).exists())
        self.assertTrue(DatosBusae.objects.filter(bus_movil=205).exists())

    def test_busae_parse_gps_map_v2(self):
        payload = {
            "buses": {
                "451": {
                    "bus_id": "259",
                    "bus_number": "0806",
                    "has_gps": True,
                    "device_source": "gps",
                    "last_gps_signel": "2026-09-19 15:33:39",
                    "latitude": "9.0505316",
                    "longitude": "-79.4800123",
                    "speed": 12.5,
                },
                "110": {
                    "bus_number": "0110",
                    "has_gps": False,
                    "last_gps_signel": "2026-09-19 10:32:00",
                    "latitude": "",
                    "longitude": "",
                },
            }
        }
        buses = busae_service.parse_and_validate(payload["buses"])
        self.assertEqual(len(buses), 2)
        by_num = {b.numero: b for b in buses}
        self.assertEqual(by_num[806].estado_gps, "ON")
        self.assertEqual(by_num[110].estado_gps, "OFF")
        self.assertEqual(by_num[806].ultima_transmision, "2026-09-19 15:33:39")
        saved = busae_service.save_to_database(buses)
        self.assertEqual(saved, 2)
        self.assertEqual(DatosBusae.objects.get(bus_movil=806).estado, "ON")

    def test_genesis_save_to_database(self):
        mock_items = [
            {
                "Bus": "105",
                "Origen": "Curundu",
                "Destino": "Los Andes",
                "Estado": "Operativo",
                "Horafin": "09:00:00",
                "Opreal": "1"
            }
        ]
        saved = genesis_service.save_to_database(mock_items, incremental=False)
        self.assertEqual(saved, 1)
        record = DatosGenesis.objects.filter(bus_movil=105).first()
        self.assertIsNotNone(record)
        self.assertEqual(record.patio_ubicacion, "Los Andes")
