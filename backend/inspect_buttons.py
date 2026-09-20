import asyncio
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from playwright.async_api import async_playwright
from decouple import config

async def inspect_buttons():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        await page.goto('https://login.busae.com/site/login', wait_until='domcontentloaded', timeout=30000)
        print("URL:", page.url)
        
        # Buscar botones y elementos clickeables de submit
        print("\\n--- BOTONES ---")
        buttons = await page.query_selector_all('button, input[type=submit], [type=submit], .btn, #submit_login')
        for btn in buttons:
            id_ = await btn.get_attribute('id') or ''
            name = await btn.get_attribute('name') or ''
            type_ = await btn.get_attribute('type') or ''
            text = (await btn.inner_text()).strip()[:50] if await btn.inner_text() else ''
            value = await btn.get_attribute('value') or ''
            classes = await btn.get_attribute('class') or ''
            print(f"  id={id_!r} name={name!r} type={type_!r} text={text!r} value={value!r} class={classes!r}")
        
        # Ver el formulario
        print("\\n--- FORMULARIO ---")
        forms = await page.query_selector_all('form')
        for form in forms:
            action = await form.get_attribute('action') or ''
            method = await form.get_attribute('method') or ''
            id_ = await form.get_attribute('id') or ''
            print(f"  form id={id_!r} action={action!r} method={method!r}")
        
        await browser.close()

asyncio.run(inspect_buttons())
