"""
backend/buses/handlers/alert_handlers.py
API endpoints para gestión de alertas del sistema.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework import status

from buses.services.notification_service import notification_service


class AlertHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        history = notification_service.get_alert_history()
        is_silenced = notification_service.is_silenced()
        return Response({
            "is_silenced": is_silenced,
            "alerts": history,
            "count": len(history)
        })


class TriggerTestAlertView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, *args, **kwargs):
        title = request.data.get("title", "Alerta de Prueba")
        message = request.data.get("message", "Esta es una alerta de prueba generada manualmente desde Bitácora E.E.")
        level = request.data.get("level", "info")
        channels = request.data.get("channels", ["slack"])

        notification_service.notify(
            title=title,
            message=message,
            level=level,
            channels=tuple(channels)
        )
        return Response({"status": "sent", "title": title, "level": level})


class SilenceAlertsView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, *args, **kwargs):
        duration = int(request.data.get("duration_minutes", 60))
        notification_service.silence_alerts(duration_minutes=duration)
        return Response({
            "status": "silenced",
            "duration_minutes": duration,
            "message": f"Alertas silenciadas durante {duration} minutos."
        })


class ResumeAlertsView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, *args, **kwargs):
        notification_service.resume_alerts()
        return Response({
            "status": "resumed",
            "message": "Sistema de alertas reactivado normalmente."
        })
