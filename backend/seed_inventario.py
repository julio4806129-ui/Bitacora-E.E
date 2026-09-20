import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from buses.models import DatosGenesis, DatosBusae, InventarioFlota, InventarioEE

def seed():
    flota_count = InventarioFlota.objects.count()
    print(f"Current InventarioFlota count: {flota_count}")
    
    if flota_count == 0:
        print("Seeding InventarioFlota from DatosGenesis...")
        genesis_records = DatosGenesis.objects.all().order_by('bus_movil')
        to_create = []
        for g in genesis_records:
            bus_num = g.bus_movil
            extra = g.datos_extra or {}
            est_gen = (extra.get('estado') or extra.get('estado_bus') or 'OPERATIVO').upper()
            patio = g.patio_ubicacion or extra.get('origen') or extra.get('destino') or 'LOS PUEBLOS'
            
            # Asignar tipo de flota según rango
            if bus_num < 300:
                tipo = 'Torino'
            elif bus_num < 700:
                tipo = 'Grand Viale'
            elif bus_num < 1000:
                tipo = 'County'
            elif bus_num < 1300:
                tipo = 'Articulado'
            else:
                tipo = 'Padrón'
                
            placa = f"MB{bus_num:04d}" if est_gen == 'OPERATIVO' else '—'
            
            to_create.append(InventarioFlota(
                bus_movil=bus_num,
                placa=placa,
                tipo_flota=tipo,
                patio=patio,
                estado=est_gen
            ))
            
            if len(to_create) >= 500:
                InventarioFlota.objects.bulk_create(to_create, ignore_conflicts=True)
                to_create = []
        if to_create:
            InventarioFlota.objects.bulk_create(to_create, ignore_conflicts=True)
        print(f"InventarioFlota seeded: {InventarioFlota.objects.count()} buses.")

    ee_count = InventarioEE.objects.count()
    print(f"Current InventarioEE count: {ee_count}")
    if ee_count == 0:
        print("Seeding sample InventarioEE...")
        componentes = ["Modem GPS", "Bocina Intercom", "Boton Panico", "CTAP Validador", "SIM Card M2M"]
        to_create_ee = []
        # Sample buses
        sample_buses = [1, 2, 3, 5, 8, 12, 15, 20, 25, 30, 45, 50, 100, 101, 102, 200, 500, 700, 1024, 1200]
        for bus_num in sample_buses:
            for comp in componentes:
                danado = (bus_num % 5 == 0 and comp == "Modem GPS")
                to_create_ee.append(InventarioEE(
                    bus_movil=bus_num,
                    componente=comp,
                    serie=f"SN-{comp[:3].upper()}-{bus_num:04d}",
                    imei=f"86420104{bus_num:06d}" if "Modem" in comp or "SIM" in comp else "",
                    funcional=not danado,
                    danado=danado,
                    tipo_dano="Sin señal GSM/GPS" if danado else "",
                    estado_accion="Pendiente de revision" if danado else "Actualizado",
                    observaciones="Revisado en preventivo" if not danado else "Requiere cambio de antena"
                ))
        InventarioEE.objects.bulk_create(to_create_ee)
        print(f"InventarioEE seeded: {InventarioEE.objects.count()} componentes.")

if __name__ == '__main__':
    seed()
