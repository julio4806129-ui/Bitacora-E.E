import asyncio
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from playwright.async_api import async_playwright
from decouple import config

async def inspect_login():
    email = config('BUSAE_EMAIL', default='')
    password = config('BUSAE_PASSWORD', default='')
    print(f"Email configurado: {email[:3]}***")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        print("Navegando a login...")
        await page.goto('https://login.busae.com/site/login', wait_until='domcontentloaded', timeout=30000)
        print("URL actual:", page.url)
        
        # Guardar el HTML de la página de login
        content = await page.content()
        with open('busae_login_page.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print("HTML guardado en busae_login_page.html")
        
        # Buscar inputs
        inputs = await page.query_selector_all('input')
        print(f"\\nSe encontraron {len(inputs)} inputs:")
        for inp in inputs:
            name = await inp.get_attribute('name') or ''
            id_ = await inp.get_attribute('id') or ''
            type_ = await inp.get_attribute('type') or ''
            placeholder = await inp.get_attribute('placeholder') or ''
            print(f"  - id={id_!r} name={name!r} type={type_!r} placeholder={placeholder!r}")
        
        await browser.close()

asyncio.run(inspect_login())
