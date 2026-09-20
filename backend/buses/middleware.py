import contextvars

_current_request = contextvars.ContextVar('current_request', default=None)


def set_current_request(request):
    return _current_request.set(request)


def get_current_request():
    return _current_request.get()


class AuditContextMiddleware:
    """
    Middleware para almacenar el request actual en un ContextVar por hilo/corutina,
    permitiendo que las señales y servicios capturen la IP y el usuario autenticado
    de forma transparente.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        token = set_current_request(request)
        try:
            response = self.get_response(request)
            return response
        finally:
            _current_request.reset(token)
