import time
import functools
import logging
import threading
from typing import Type, Tuple, Callable, Any
from pydantic import BaseModel, ValidationError as PydanticValidationError
from .exceptions import CircuitBreakerOpen, ValidationError as CustomValidationError

logger = logging.getLogger(__name__)

def retry_exponential(
    max_retries: int = 3,
    base_delay: float = 2.0,
    backoff_factor: float = 2.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,)
):
    """
    Decorador para reintentar operaciones con backoff exponencial.
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            attempt = 0
            delay = base_delay
            while attempt < max_retries:
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    attempt += 1
                    if attempt >= max_retries:
                        logger.error(
                            f"[RETRY] Función {func.__name__} falló tras {attempt} intentos. Error: {str(e)}",
                            exc_info=True
                        )
                        raise
                    logger.warning(
                        f"[RETRY] Intento {attempt}/{max_retries} para {func.__name__} falló ({str(e)}). "
                        f"Reintentando en {delay:.2f} segundos..."
                    )
                    time.sleep(delay)
                    delay *= backoff_factor
        return wrapper
    return decorator


class CircuitBreakerState:
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


class CircuitBreaker:
    _instances = {}
    _lock = threading.Lock()

    @classmethod
    def get_breaker(cls, name: str, failure_threshold: int = 5, timeout: int = 300):
        with cls._lock:
            if name not in cls._instances:
                cls._instances[name] = cls(name, failure_threshold, timeout)
            return cls._instances[name]

    def __init__(self, name: str, failure_threshold: int = 5, timeout: int = 300):
        self.name = name
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0
        self._state_lock = threading.Lock()

    def can_execute(self) -> bool:
        with self._state_lock:
            now = time.time()
            if self.state == CircuitBreakerState.OPEN:
                if now - self.last_failure_time >= self.timeout:
                    self.state = CircuitBreakerState.HALF_OPEN
                    logger.info(f"[CIRCUIT_BREAKER] {self.name}: Pasando a HALF_OPEN para probar recuperación.")
                    return True
                return False
            return True

    def record_success(self):
        with self._state_lock:
            if self.state in (CircuitBreakerState.HALF_OPEN, CircuitBreakerState.OPEN):
                logger.info(f"[CIRCUIT_BREAKER] {self.name}: Operación exitosa. Circuito restablecido a CLOSED.")
            self.failure_count = 0
            self.state = CircuitBreakerState.CLOSED

    def record_failure(self):
        with self._state_lock:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.state == CircuitBreakerState.HALF_OPEN or self.failure_count >= self.failure_threshold:
                self.state = CircuitBreakerState.OPEN
                logger.error(
                    f"[CIRCUIT_BREAKER] {self.name}: Umbral de fallas ({self.failure_count}) alcanzado. "
                    f"Circuito ABIERTO durante {self.timeout}s."
                )


def circuit_breaker(name: str = None, failure_threshold: int = 5, timeout: int = 300):
    """
    Decorador Circuit Breaker para evitar llamadas continuas a servicios caídos.
    """
    def decorator(func: Callable) -> Callable:
        breaker_name = name or func.__qualname__
        breaker = CircuitBreaker.get_breaker(breaker_name, failure_threshold, timeout)

        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            if not breaker.can_execute():
                raise CircuitBreakerOpen(breaker_name, reset_timeout=breaker.timeout)
            try:
                result = func(*args, **kwargs)
                breaker.record_success()
                return result
            except Exception as e:
                breaker.record_failure()
                raise
        return wrapper
    return decorator


def validate_data(schema: Type[BaseModel]):
    """
    Decorador para validar argumentos con Pydantic.
    Valida el primer diccionario encontrado en kwargs o args (o request.data en DRF).
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            payload = None
            if "data" in kwargs and isinstance(kwargs["data"], dict):
                payload = kwargs["data"]
            elif len(args) > 1 and isinstance(args[1], dict):
                payload = args[1]
            elif len(args) > 0 and hasattr(args[0], 'data') and isinstance(args[0].data, dict):
                payload = args[0].data
            elif len(args) > 1 and hasattr(args[1], 'data') and isinstance(args[1].data, dict):
                payload = args[1].data

            if payload is not None:
                try:
                    schema.model_validate(payload)
                except PydanticValidationError as err:
                    logger.warning(f"[VALIDATION_ERROR] Validación fallida para {func.__name__}: {err.errors()}")
                    raise CustomValidationError(
                        message="Error de validación de datos.",
                        details=err.errors()
                    )
            return func(*args, **kwargs)
        return wrapper
    return decorator
