import logging
from typing import Optional, Any, Dict
from buses.models import AuditLog

logger = logging.getLogger('buses.audit')


class AuditService:
    @staticmethod
    def get_client_ip(request) -> Optional[str]:
        if not request:
            return None
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    @classmethod
    def registrar(
        cls,
        accion: str,
        modelo: str,
        registro_id: Any = '',
        usuario: Any = None,
        campo: str = '',
        valor_anterior: Any = None,
        valor_nuevo: Any = None,
        ip_origen: Optional[str] = None,
        detalles: Optional[Dict[str, Any]] = None,
        request: Any = None
    ) -> Optional[AuditLog]:
        """
        Registra una entrada en AuditLog. Captura errores para garantizar que la
        operación comercial principal no se vea interrumpida por fallas auxiliares.
        """
        try:
            req = request
            if req is None:
                try:
                    from buses.middleware import get_current_request
                    req = get_current_request()
                except Exception:
                    req = None

            user_obj = usuario
            if user_obj is None and req and hasattr(req, 'user') and req.user.is_authenticated:
                user_obj = req.user

            ip = ip_origen or (cls.get_client_ip(req) if req else None)


            user_codigo = ''
            if user_obj:
                user_codigo = getattr(user_obj, 'codigo_empleado', '') or getattr(user_obj, 'username', '')

            str_ant = None if valor_anterior is None else str(valor_anterior)
            str_nuevo = None if valor_nuevo is None else str(valor_nuevo)

            log_entry = AuditLog.objects.create(
                usuario=user_obj if (user_obj and getattr(user_obj, 'pk', None)) else None,
                usuario_codigo=user_codigo,
                accion=accion,
                modelo=modelo,
                registro_id=str(registro_id),
                campo=campo,
                valor_anterior=str_ant,
                valor_nuevo=str_nuevo,
                ip_origen=ip,
                detalles=detalles or {}
            )
            return log_entry
        except Exception as e:
            logger.error(f"[AUDIT_ERROR] Error al registrar auditoría ({modelo} {accion}): {e}", exc_info=True)
            return None
