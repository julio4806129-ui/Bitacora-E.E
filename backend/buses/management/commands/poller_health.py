from django.core.management.base import BaseCommand
from django.utils import timezone
import time

class Command(BaseCommand):
    help = "Prueba rápida de conectividad BUSAE + Genesis"

    def handle(self, *args, **options):
        self.stdout.write("=" * 60)
        self.stdout.write("HEALTH-CHECK POLLER — " + str(timezone.now()))
        self.stdout.write("=" * 60)

        # ── BUSAE ────────────────────────────────────────────────
        self.stdout.write("\n[1/2] Probando BUSAE...")
        t0 = time.time()
        try:
            from poller.busae_client import fetch_payload
            from poller.busae_parse import normalize_buses
            payload = fetch_payload()
            if payload is None:
                self.stdout.write(self.style.ERROR("  ✗ BUSAE: sin payload (login o red falló)"))
            else:
                buses = normalize_buses(payload)
                elapsed = time.time() - t0
                self.stdout.write(self.style.SUCCESS(
                    f"  ✓ BUSAE OK — {len(buses)} buses en {elapsed:.1f}s"
                ))
                if buses:
                    sample = buses[0]
                    self.stdout.write(f"    Ejemplo: bus {sample.get('numero')} | estado={sample.get('estado_gps')} | placa={sample.get('placa')}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"  ✗ BUSAE ERROR: {e}"))

        # ── GENESIS ──────────────────────────────────────────────
        self.stdout.write("\n[2/2] Probando Genesis...")
        t0 = time.time()
        try:
            from poller.genesis_service import run as run_genesis
            result = run_genesis()
            elapsed = time.time() - t0
            status = result.get("status", "?")
            saved = result.get("saved", 0)
            if status == "ok":
                self.stdout.write(self.style.SUCCESS(
                    f"  ✓ Genesis OK — {saved} buses actualizados en {elapsed:.1f}s"
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    f"  ~ Genesis status={status} | message={result.get('message')}"
                ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"  ✗ Genesis ERROR: {e}"))

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("Fin del health-check")
        self.stdout.write("=" * 60)
