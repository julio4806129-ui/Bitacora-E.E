import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def run_simulation():
    print("=== INICIANDO SIMULACIÓN COMPLETA DEL SISTEMA ===")
    results = {"passed": 0, "failed": 0, "errors": []}

    session = requests.Session()

    # 1. TEST LOGIN POR CÓDIGO LEGADO
    print("\n[TEST 1] Autenticación por Código Legado (13283)...")
    try:
        resp = session.post(f"{BASE_URL}/auth/login-codigo/", json={"codigo": "13283"})
        if resp.status_code == 200:
            data = resp.json()
            token = data.get("access")
            user = data.get("user")
            session.headers.update({"Authorization": f"Bearer {token}"})
            print(f"  -> ÉXITO. Usuario: {user.get('nombre')}, Admin: {user.get('es_admin')}, Contador Turno: {user.get('shift_counter')}")
            results["passed"] += 1
        else:
            print(f"  -> FALLO: {resp.status_code} - {resp.text}")
            results["failed"] += 1
            results["errors"].append("Login por código legado falló")
    except Exception as e:
        print(f"  -> ERROR: {e}")
        results["failed"] += 1
        results["errors"].append(str(e))

    # 2. TEST DASHBOARD STATS
    print("\n[TEST 2] Verificando Dashboard Stats...")
    try:
        resp = session.get(f"{BASE_URL}/reportes/dashboard-stats/")
        if resp.status_code == 200:
            stats = resp.json()
            print(f"  -> ÉXITO. Total buses: {stats.get('total_buses')}, Alertas: {stats.get('alertas_activas')}, Revisiones Hoy: {stats.get('revisiones_hoy')}, Técnicos: {stats.get('tecnicos_activos')}")
            results["passed"] += 1
        else:
            print(f"  -> FALLO: {resp.status_code} - {resp.text}")
            results["failed"] += 1
    except Exception as e:
        print(f"  -> ERROR: {e}")
        results["failed"] += 1

    # 3. TEST BANDEJA DE ATENCIONES
    print("\n[TEST 3] Consultando Bandeja de Atenciones Pendientes...")
    selected_bus = None
    try:
        resp = session.get(f"{BASE_URL}/registros-bitacora/bandeja/")
        if resp.status_code == 200:
            bandeja = resp.json()
            print(f"  -> ÉXITO. Buses pendientes en bandeja: {len(bandeja)}")
            if len(bandeja) > 0:
                selected_bus = bandeja[0]
                print(f"     Primer bus en cola: Bus #{selected_bus.get('bus_movil')} ({selected_bus.get('patio')}) - Alerta: {selected_bus.get('diagnostico')}")
            results["passed"] += 1
        else:
            print(f"  -> FALLO: {resp.status_code} - {resp.text}")
            results["failed"] += 1
    except Exception as e:
        print(f"  -> ERROR: {e}")
        results["failed"] += 1

    # 4. TEST ATENCIÓN DE UN BUS (PROCESO COMPLETO DE BITÁCORA)
    print("\n[TEST 4] Registrando Atención Técnica de Mantenimiento...")
    bus_to_attend = selected_bus.get("bus_movil") if selected_bus else "1001"
    payload = {
        "bus_movil": bus_to_attend,
        "movil": bus_to_attend,
        "patio": "La Cabima",
        "tipoInventario": "REVISION POR BITACORA",
        "tecnico": "Jerald Barria",
        "modem": "FUNCIONA",
        "modemA": "ACTUALIZADO",
        "bocina": "FUNCIONA",
        "bocinaA": "ADECUADA O MOVILIZADA",
        "bocinaC": "INSTALADA",
        "bocinaR": "FUNCIONA",
        "botonLlamada": "FUNCIONA",
        "botonPanico": "FUNCIONA",
        "simCard": "ACTIVA",
        "serieSim": "89507000000001",
        "imei": "864200000000001",
        "anillo": "FUNCIONA",
        "ctap": "FUNCIONA",
        "serieCtap": "CTAP-9901",
        "respuestaTecnica": "Simulación automatizada: Revisión preventiva OK, firmware actualizado y antenas calibradas.",
        "reportId": selected_bus.get("reportId") if selected_bus else None,
        "source": selected_bus.get("source") if selected_bus else "reportes",
        "datos_dinamicos": {"temperatura_gabinete": "32C", "voltaje_bateria": "24.2V"}
    }
    try:
        resp = session.post(f"{BASE_URL}/registros-bitacora/atender/", json=payload)
        if resp.status_code in [200, 201]:
            data = resp.json()
            print(f"  -> ÉXITO. Respuesta: {data.get('message')}. Nuevo contador turno: {data.get('nuevo_contador')}")
            results["passed"] += 1
        else:
            print(f"  -> FALLO: {resp.status_code} - {resp.text}")
            results["failed"] += 1
            results["errors"].append(f"Atender bus: {resp.text}")
    except Exception as e:
        print(f"  -> ERROR: {e}")
        results["failed"] += 1

    # 5. TEST RESUMEN SEMANAL
    print("\n[TEST 5] Verificando Reporte de Resumen Semanal...")
    try:
        resp = session.get(f"{BASE_URL}/reportes/resumen-semanal/")
        if resp.status_code == 200:
            resumen = resp.json()
            headers = resumen.get("headers", [])
            print(f"  -> ÉXITO. Headers: {headers}")
            print(f"     Tipos mantenimiento filas: {len(resumen.get('tiposMantenimiento', []))}")
            print(f"     Patios filas: {len(resumen.get('atencionesPorPatio', []))}")
            results["passed"] += 1
        else:
            print(f"  -> FALLO: {resp.status_code} - {resp.text}")
            results["failed"] += 1
    except Exception as e:
        print(f"  -> ERROR: {e}")
        results["failed"] += 1

    # 6. TEST RESUMEN EQUIPOS
    print("\n[TEST 6] Verificando Reporte de Resumen Equipos...")
    try:
        resp = session.get(f"{BASE_URL}/reportes/resumen-equipos/")
        if resp.status_code == 200:
            equipos = resp.json()
            print(f"  -> ÉXITO. Estado Flota filas: {len(equipos.get('estadoFlota', []))}")
            print(f"     Bocinas Dañadas filas: {len(equipos.get('bocinasDañadas', []))}")
            results["passed"] += 1
        else:
            print(f"  -> FALLO: {resp.status_code} - {resp.text}")
            results["failed"] += 1
    except Exception as e:
        print(f"  -> ERROR: {e}")
        results["failed"] += 1

    # 7. TEST ESTADO COMPONENTES Y RENDIMIENTO
    print("\n[TEST 7] Verificando Estado de Componentes y Rendimiento...")
    try:
        resp1 = session.get(f"{BASE_URL}/reportes/estado-componentes/")
        resp2 = session.get(f"{BASE_URL}/reportes/rendimiento-tecnicos/")
        if resp1.status_code == 200 and resp2.status_code == 200:
            print(f"  -> ÉXITO. Componentes: {len(resp1.json())} items, Técnicos: {len(resp2.json())} items")
            results["passed"] += 1
        else:
            print(f"  -> FALLO: {resp1.status_code} / {resp2.status_code}")
            results["failed"] += 1
    except Exception as e:
        print(f"  -> ERROR: {e}")
        results["failed"] += 1

    # 8. TEST INVENTARIO EE, GENESIS Y BUSAE
    print("\n[TEST 8] Consultando Endpoints de Datos (EE, Genesis, Busae)...")
    try:
        r_ee = session.get(f"{BASE_URL}/ee-moviles/")
        r_gen = session.get(f"{BASE_URL}/genesis/")
        r_busae = session.get(f"{BASE_URL}/busae/")
        if r_ee.status_code == 200 and r_gen.status_code == 200 and r_busae.status_code == 200:
            print(f"  -> ÉXITO. EE Móviles: {r_ee.json().get('count', len(r_ee.json()))}, Genesis: {r_gen.json().get('count', len(r_gen.json()))}, Busae: {r_busae.json().get('count', len(r_busae.json()))}")
            results["passed"] += 1
        else:
            print(f"  -> FALLO: EE={r_ee.status_code}, Gen={r_gen.status_code}, Busae={r_busae.status_code}")
            results["failed"] += 1
    except Exception as e:
        print(f"  -> ERROR: {e}")
        results["failed"] += 1

    # 9. TEST EXPORTACIÓN
    print("\n[TEST 9] Probando Exportación de Datos a CSV...")
    try:
        r_exp = session.get(f"{BASE_URL}/reportes/exportar/?tipo=bitacora")
        if r_exp.status_code == 200 and "text/csv" in r_exp.headers.get("Content-Type", ""):
            print(f"  -> ÉXITO. Descarga CSV recibida ({len(r_exp.content)} bytes)")
            results["passed"] += 1
        else:
            print(f"  -> FALLO: status={r_exp.status_code}, content-type={r_exp.headers.get('Content-Type')}")
            results["failed"] += 1
    except Exception as e:
        print(f"  -> ERROR: {e}")
        results["failed"] += 1

    print("\n==========================================")
    print(f"RESUMEN DE SIMULACIÓN: {results['passed']} pasados, {results['failed']} fallados")
    if results['errors']:
        print("ERRORES DETECTADOS:")
        for err in results['errors']:
            print(f" - {err}")
    print("==========================================")

if __name__ == "__main__":
    run_simulation()
