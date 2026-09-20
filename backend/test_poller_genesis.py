import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from poller import genesis_service

print("Testing Genesis poller with VPN...")
try:
    res = genesis_service.run()
    print("Genesis run result:", res)
except Exception as e:
    print("Genesis run exception:", e)
