import urllib.request
import json

base_url = "http://127.0.0.1:8000/api"

# First get a JWT token
login_data = json.dumps({"username": "admin", "password": "adminpassword"}).encode("utf-8")
req = urllib.request.Request(f"{base_url}/token/", data=login_data, headers={"Content-Type": "application/json"})

try:
    with urllib.request.urlopen(req) as resp:
        tokens = json.loads(resp.read().decode("utf-8"))
        token = tokens.get("access")
        print("Token obtained successfully.")
except Exception as e:
    # Try login by code
    print("Trying login by code or checking admin user:", e)
    login_data = json.dumps({"codigo": "9999"}).encode("utf-8")
    req = urllib.request.Request(f"{base_url}/auth/codigo/", data=login_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        tokens = json.loads(resp.read().decode("utf-8"))
        token = tokens.get("access")
        print("Token obtained via code successfully.")

headers = {"Authorization": f"Bearer {token}"}

endpoints = [
    "/bitacora/tabla/?page=1&page_size=5",
    "/inventario-flota/",
    "/inventario-ee/",
    "/configuracion/catalogos/",
    "/reportes/dashboard-stats/",
]

for ep in endpoints:
    url = f"{base_url}{ep}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if isinstance(data, dict):
                keys = list(data.keys())[:5]
                count = data.get("count", len(data))
                print(f"SUCCESS {ep} -> status {resp.status}, count={count}, sample keys={keys}")
            elif isinstance(data, list):
                print(f"SUCCESS {ep} -> status {resp.status}, list items={len(data)}")
    except Exception as err:
        print(f"FAILED {ep} -> {err}")
