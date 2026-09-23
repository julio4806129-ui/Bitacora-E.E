#!/usr/bin/env python3
"""
Script 0.1 + 0.2 — Corrección crítica del poller BUSAE
- Quita 'Active' y 'Stopped' de GPS_SIN_SENAL
- Solo genera reportes para buses que existen en InventarioFlota con estado ACTIVO/OPERATIVO
- Idempotente y seguro
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "backend" / "poller" / "busae_service.py"

if not TARGET.exists():
    print(f"ERROR: No se encontro {TARGET}")
    sys.exit(1)

content = TARGET.read_text(encoding="utf-8")

# ── 1. Corregir el frozenset ────────────────────────────────────────────────
old_frozenset = re.search(
    r"GPS_SIN_SENAL\s*=\s*frozenset\(\{[^}]+\}\)",
    content
)
if not old_frozenset:
    print("AVISO: No se encontro GPS_SIN_SENAL. Revisar manualmente.")
else:
    new_frozenset = "GPS_SIN_SENAL = frozenset({'Offline', 'No records'})"
    content = content[:old_frozenset.start()] + new_frozenset + content[old_frozenset.end():]
    print("OK: GPS_SIN_SENAL corregido → solo Offline / No records")

# ── 2. Añadir filtro por Flota activa ───────────────────────────────────────
marker = "if is_offline:"
if marker not in content:
    print("ERROR: No se encontro el bloque 'if is_offline:'. Abortando.")
    sys.exit(1)

# Evitar insertar dos veces si se ejecuta de nuevo
if "Solo generar reporte si el bus esta ACTIVO en Flota" in content or "Solo generar reporte si el bus está ACTIVO en Flota" in content:
    print("OK: Filtro por Flota ya estaba insertado (idempotente)")
else:
    injection = '''
            # Solo generar reporte si el bus está ACTIVO en Flota
            from buses.models import InventarioFlota
            flota = InventarioFlota.objects.filter(bus_movil=num).first()
            if not flota or flota.estado.upper() not in ('OPERATIVO', 'ACTIVO'):
                # Unidad de baja o inexistente → no crear reporte
                saved += 1
                continue

'''
    content = content.replace(
        "            if is_offline:",
        injection + "            if is_offline:",
        1
    )
    print("OK: Filtro por Flota activa insertado")

# ── 3. Guardar ─────────────────────────────────────────────────────────────
TARGET.write_text(content, encoding="utf-8")
print(f"\nLISTO: Archivo actualizado → {TARGET}")
print("Siguiente: revisa el diff con: git diff backend/poller/busae_service.py")
