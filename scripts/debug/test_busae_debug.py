import asyncio
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from poller import busae_service

async def main():
    print("1. Cerrando browser anterior...")
    await busae_service._close_browser()

    print("2. Iniciando browser (puede tardar 20-40 segundos)...")
    ok = await busae_service._init_browser()
    if not ok:
        print("ERROR: No se pudo iniciar el browser o login falló")
        return

    print("3. Login OK. Obteniendo CSRF...")
    page = busae_service._state['page']
    print("URL actual:", page.url)

    try:
        csrf = await page.get_attribute('meta[name="csrf-token"]', 'content')
        print("CSRF:", csrf)
    except Exception as e:
        print("ERROR CSRF:", e)
        csrf = ""

    print("4. Llamando al endpoint de GPS...")
    result = await page.evaluate('''async (csrf) => {
        try {
            const res = await fetch('/driver-line-mapping/update-gps-map', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                },
                body: new URLSearchParams({ refreshnocache: '1', _csrf: csrf }).toString(),
                credentials: 'same-origin',
            });
            return { status: res.status, text: await res.text() };
        } catch (err) {
            return { status: 0, text: "FETCH ERROR: " + err.toString() };
        }
    }''', csrf or "")

    print("Status HTTP:", result['status'])
    print("\\n--- RESPUESTA (primeros 3000 caracteres) ---")
    print(result['text'][:3000])
    print("--- FIN ---")

    await busae_service._close_browser()
    print("Listo.")

if __name__ == "__main__":
    asyncio.run(main())
