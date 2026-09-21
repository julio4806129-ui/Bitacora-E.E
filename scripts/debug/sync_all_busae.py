import os
import django
import random
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from buses.models import DatosGenesis, DatosBusae

def update_busae_with_real_states():
    genesis_buses = DatosGenesis.objects.all().order_by('bus_movil')
    total_genesis = genesis_buses.count()
    print(f"Total Genesis buses: {total_genesis}")
    
    lat_base = 9.0400000
    lon_base = -79.4800000
    
    now = timezone.now()
    
    # 4 estados oficiales de BUSAE:
    # 'Active', 'Stopped', 'Offline', 'No records'
    
    actualizados = 0
    
    for g in genesis_buses:
        b_num = g.bus_movil
        extra = g.datos_extra or {}
        is_inop = (extra.get('estado') or '').lower() == 'inoperativo'
        
        if is_inop:
            # Los buses inoperativos en patio típicamente no transmiten o están fuera de línea
            estado = 'No records' if (b_num % 2 == 0) else 'Offline'
            vel = 0.0
            ml = False
        else:
            # Flota en operación: distribución realista
            if b_num % 5 == 0:
                estado = 'Stopped'
                vel = 0.0
            elif b_num % 7 == 0:
                estado = 'Offline'
                vel = 0.0
            elif b_num % 11 == 0:
                estado = 'No records'
                vel = 0.0
            else:
                estado = 'Active'
                vel = round(random.uniform(18.0, 58.0), 1)
                
            ml = (b_num % 3 == 0)
            
        lat = lat_base + random.uniform(-0.06, 0.08)
        lon = lon_base + random.uniform(-0.08, 0.09)
        
        DatosBusae.objects.update_or_create(
            bus_movil=b_num,
            defaults={
                'latitud': round(lat, 6),
                'longitud': round(lon, 6),
                'velocidad': vel,
                'estado': estado,
                'manos_libres': ml,
                'telefono': f"6{random.randint(100, 999)}-{random.randint(1000, 9999)}" if ml else "",
                'ultima_transmision': now - timedelta(minutes=random.randint(1, 120)) if estado in ('Active', 'Stopped') else (now - timedelta(hours=random.randint(12, 72)) if estado == 'Offline' else None)
            }
        )
        actualizados += 1
        
    # Imprimir conteos por estado
    print("\n--- DISTRIBUCIÓN DE ESTADOS BUSAE ACTUALIZADOS ---")
    for est in ['Active', 'Stopped', 'Offline', 'No records']:
        cnt = DatosBusae.objects.filter(estado=est).count()
        print(f"  {est}: {cnt} buses")
    print(f"Total en DatosBusae: {DatosBusae.objects.count()}")

if __name__ == '__main__':
    update_busae_with_real_states()
