"""
backend/buses/services/notification_service.py
Servicio unificado de alertas y notificaciones vía Slack Webhook y Email SMTP.
Maneja historial de alertas y silenciado temporal.
"""

import json
import logging
import time
import requests
from typing import Dict, Any, List, Optional
from django.conf import settings
from django.core.mail import send_mail
from django.core.cache import cache

logger = logging.getLogger('buses.services.notification')

REDIS_KEY_ALERT_HISTORY = "alerts:history:log"
REDIS_KEY_ALERT_SILENCED = "alerts:silenced_until"


class NotificationService:
    def __init__(self):
        self.slack_webhook_url = getattr(settings, 'SLACK_WEBHOOK_URL', '')

    def is_silenced(self) -> bool:
        silenced_until = cache.get(REDIS_KEY_ALERT_SILENCED)
        if silenced_until and time.time() < float(silenced_until):
            return True
        return False

    def silence_alerts(self, duration_minutes: int = 60):
        until = time.time() + (duration_minutes * 60)
        cache.set(REDIS_KEY_ALERT_SILENCED, until, timeout=duration_minutes * 60)
        logger.info(f"[ALERTS] Notificaciones silenciadas por {duration_minutes} minutos.")

    def resume_alerts(self):
        cache.delete(REDIS_KEY_ALERT_SILENCED)
        logger.info("[ALERTS] Notificaciones reanudadas.")

    def log_alert(self, title: str, message: str, level: str = "warning", channel: str = "all"):
        alert_entry = {
            "id": f"alert-{int(time.time()*1000)}",
            "title": title,
            "message": message,
            "level": level,
            "channel": channel,
            "timestamp": time.time(),
        }
        history = cache.get(REDIS_KEY_ALERT_HISTORY) or []
        history.insert(0, alert_entry)
        # Mantener últimos 100
        history = history[:100]
        cache.set(REDIS_KEY_ALERT_HISTORY, history, timeout=86400 * 7)
        return alert_entry

    def get_alert_history(self) -> List[Dict[str, Any]]:
        return cache.get(REDIS_KEY_ALERT_HISTORY) or []

    def send_slack_alert(self, title: str, message: str, level: str = "warning") -> bool:
        if self.is_silenced():
            logger.info("[ALERTS] Alerta omitida (sistema de alertas silenciado).")
            return False

        webhook_url = self.slack_webhook_url or getattr(settings, 'SLACK_WEBHOOK_URL', '')
        if not webhook_url:
            logger.debug("[SLACK] Webhook URL no configurada, alerta no enviada a Slack.")
            return False

        color_map = {
            "info": "#36a64f",
            "warning": "#ecaa38",
            "error": "#e01e5a",
            "critical": "#8b0000"
        }
        payload = {
            "attachments": [
                {
                    "fallback": f"[{level.upper()}] {title}: {message}",
                    "color": color_map.get(level.lower(), "#ecaa38"),
                    "title": f":warning: Bitácora E.E — {title}",
                    "text": message,
                    "footer": "Bitacora E.E Alert System",
                    "ts": int(time.time())
                }
            ]
        }

        try:
            res = requests.post(webhook_url, json=payload, timeout=5)
            if res.status_code == 200:
                logger.info(f"[SLACK] Alerta enviada con éxito: {title}")
                return True
            else:
                logger.error(f"[SLACK] Error en webhook: {res.status_code} {res.text}")
                return False
        except Exception as e:
            logger.error(f"[SLACK] Excepción enviando webhook: {e}")
            return False

    def send_email_alert(self, subject: str, body: str, recipients: Optional[List[str]] = None) -> bool:
        if self.is_silenced():
            return False

        target_recipients = recipients or getattr(settings, 'ALERT_EMAIL_RECIPIENTS', [])
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'alerts@bitacoraee.com')

        if not target_recipients:
            logger.debug("[EMAIL] No hay destinatarios configurados para alertas.")
            return False

        try:
            send_mail(
                subject=f"[Bitácora E.E] {subject}",
                message=body,
                from_email=from_email,
                recipient_list=target_recipients,
                fail_silently=False
            )
            logger.info(f"[EMAIL] Alerta enviada a {target_recipients}")
            return True
        except Exception as e:
            logger.error(f"[EMAIL] Error enviando correo de alerta: {e}")
            return False

    def notify(self, title: str, message: str, level: str = "warning", channels: Tuple = ("slack", "email")):
        self.log_alert(title=title, message=message, level=level, channel=",".join(channels))

        if "slack" in channels:
            self.send_slack_alert(title, message, level)
        if "email" in channels:
            self.send_email_alert(title, message)


notification_service = NotificationService()
