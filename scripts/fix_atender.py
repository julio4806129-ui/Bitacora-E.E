from pathlib import Path
import re

path = Path("backend/buses/views.py")
content = path.read_text(encoding="utf-8")

# ── 1. Insertar validación de Flota justo después de validar respuesta_tecnica ──
marker = "if not str(data.get('respuesta_tecnica') or '').strip():"
if "Validar que el bus esté en Flota" in content:
    print("OK: Validación de Flota ya existe (idempotente)")
else:
    injection = '''
        # Validar que el bus esté en Flota y activo (salvo modo proactivo forzado)
        from buses.models import InventarioFlota
        flota = InventarioFlota.objects.filter(bus_movil=int(bus_movil)).first()
        modo_proactivo = str(data.get("modo") or data.get("tipo_atencion") or "").upper() in (
            "PROACTIVO", "PREVENTIVO", "REVISION PREVENTIVA", "PROACTIVA"
        )
        if flota and flota.estado_operativo == "BAJA" and not modo_proactivo:
            return Response({
                "status": "error",
                "message": f"Bus {bus_movil} está de BAJA. Use modo proactivo o reactivelo primero."
            }, status=status.HTTP_400_BAD_REQUEST)
        if not flota and not modo_proactivo:
            # Permitir atención proactiva aunque no esté en flota (se puede crear después)
            pass

'''
    # Insertar después del bloque de validación de respuesta_tecnica
    pattern = r"(if not str\(data\.get\('respuesta_tecnica'\) or ''\)\.strip\(\):.*?status=status\.HTTP_400_BAD_REQUEST\))"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        content = content[:match.end()] + injection + content[match.end():]
        print("OK: Validación de Flota + modo proactivo insertada")
    else:
        print("AVISO: No se encontró el marcador de respuesta_tecnica. Revisar manualmente.")

# ── 2. Corregir contador para usar tecnico_user ──
old_counter = """nuevo_contador = RegistroBitacora.objects.filter(
                    tecnico=request.user,
                    timestamp__gte=start_dt,
                    timestamp__lt=end_dt
                ).count()"""

new_counter = """nuevo_contador = RegistroBitacora.objects.filter(
                    tecnico=tecnico_user,
                    timestamp__gte=start_dt,
                    timestamp__lt=end_dt
                ).count()"""

if old_counter in content:
    content = content.replace(old_counter, new_counter)
    print("OK: Contador corregido → usa tecnico_user")
else:
    print("AVISO: Bloque de contador no encontrado exactamente (puede ya estar bien)")

path.write_text(content, encoding="utf-8")
print("\\nListo. Verificando sintaxis...")
