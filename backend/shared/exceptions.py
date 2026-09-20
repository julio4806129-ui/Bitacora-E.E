"""
Excepciones personalizadas para Bitácora E.E
"""

class BitacoraAppException(Exception):
    """Excepción base para toda la aplicación Bitácora E.E."""
    default_message = "Ocurrió un error interno en la aplicación."
    status_code = 500

    def __init__(self, message=None, details=None, status_code=None):
        super().__init__(message or self.default_message)
        self.message = message or self.default_message
        self.details = details or {}
        if status_code is not None:
            self.status_code = status_code

    def to_dict(self):
        payload = {"error": self.message}
        if self.details:
            payload["details"] = self.details
        return payload


class ValidationError(BitacoraAppException):
    """Error cuando la validación de esquema o datos de entrada falla."""
    default_message = "Los datos proporcionados no son válidos."
    status_code = 400


class ExternalServiceError(BitacoraAppException):
    """Error al comunicarse con un servicio externo (BusAE, Génesis, Slack, etc.)."""
    default_message = "Fallo en la comunicación con el servicio externo."
    status_code = 502

    def __init__(self, service_name, message=None, details=None, status_code=502):
        self.service_name = service_name
        msg = message or f"Error de comunicación con el servicio externo: {service_name}"
        super().__init__(message=msg, details=details, status_code=status_code)


class CircuitBreakerOpen(BitacoraAppException):
    """Lanzada cuando el Circuit Breaker está abierto para evitar sobrecarga o cascada de fallos."""
    default_message = "El servicio externo se encuentra temporalmente suspendido por fallos reiterados."
    status_code = 503

    def __init__(self, service_name, reset_timeout=300):
        self.service_name = service_name
        self.reset_timeout = reset_timeout
        msg = f"Circuito abierto para '{service_name}'. Se reintentará en {reset_timeout}s."
        super().__init__(message=msg, details={"service": service_name, "retry_after": reset_timeout}, status_code=503)


class ServiceUnavailableError(BitacoraAppException):
    """El servicio no está disponible en este momento."""
    default_message = "El servicio solicitado no está disponible temporalmente."
    status_code = 503


class BusaeIntegrationError(ExternalServiceError):
    """Error específico en la integración o scraping de BusAE."""
    def __init__(self, message="Error en el servicio de BusAE", details=None):
        super().__init__(service_name="BusAE", message=message, details=details, status_code=502)


class GenesisIntegrationError(ExternalServiceError):
    """Error específico en la integración con la API de Génesis."""
    def __init__(self, message="Error en la API de Génesis", details=None):
        super().__init__(service_name="Genesis", message=message, details=details, status_code=502)


class ResourceNotFoundError(BitacoraAppException):
    """Recurso solicitado no encontrado."""
    default_message = "El recurso solicitado no existe."
    status_code = 404
