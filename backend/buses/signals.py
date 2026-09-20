import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from buses.models import (
    RegistroBitacora,
    EEMovil,
    InventarioEE,
    InventarioFlota,
    ConfiguracionSistema,
    Usuario
)
from buses.services.audit_service import AuditService

logger = logging.getLogger('buses.audit')

AUDITED_MODELS = (
    RegistroBitacora,
    EEMovil,
    InventarioEE,
    InventarioFlota,
    ConfiguracionSistema,
    Usuario
)


@receiver(post_save)
def audit_post_save(sender, instance, created, **kwargs):
    if sender not in AUDITED_MODELS:
        return
    action = 'CREATE' if created else 'UPDATE'
    model_name = sender.__name__
    record_id = getattr(instance, 'pk', '')

    detalles = {}
    if hasattr(instance, 'bus_movil'):
        detalles['bus_movil'] = getattr(instance, 'bus_movil')
    if hasattr(instance, 'clave'):
        detalles['clave'] = getattr(instance, 'clave')
    if hasattr(instance, 'username'):
        detalles['username'] = getattr(instance, 'username')

    AuditService.registrar(
        accion=action,
        modelo=model_name,
        registro_id=str(record_id),
        detalles=detalles
    )


@receiver(post_delete)
def audit_post_delete(sender, instance, **kwargs):
    if sender not in AUDITED_MODELS:
        return
    model_name = sender.__name__
    record_id = getattr(instance, 'pk', '')

    detalles = {}
    if hasattr(instance, 'bus_movil'):
        detalles['bus_movil'] = getattr(instance, 'bus_movil')
    if hasattr(instance, 'clave'):
        detalles['clave'] = getattr(instance, 'clave')
    if hasattr(instance, 'username'):
        detalles['username'] = getattr(instance, 'username')

    AuditService.registrar(
        accion='DELETE',
        modelo=model_name,
        registro_id=str(record_id),
        detalles=detalles
    )
