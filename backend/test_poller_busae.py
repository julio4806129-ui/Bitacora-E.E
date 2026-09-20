import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from poller import busae_service

print("Testing Busae poller...")
try:
    res = busae_service.run()
    print("Busae run result:", res)
except Exception as e:
    print("Busae run exception:", e)
