import asyncio
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from playwright.async_api import async_playwright
from decouple import config

async def test_login_detail():
    email = config('BUSAE_EMAIL', default='')
    password = config('BUSAE_PASSWORD', default='')
    print(f"Probando con email: {email}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        await page.goto('https://login.busae.com/site/login', wait_until='domcontentloaded', timeout=30000)
        
        # Aceptar cookies
        try:
            btn = page.locator('button:has-text("Accept all")')
            if await btn.count() > 0:
                await btn.first.click(timeout=3000)
                await page.wait_for_timeout(800)
                print("Cookies aceptadas")
        except Exception:
            pass
        
        await page.fill('#loginform-username', email)
        await page.fill('#loginform-password', password)
        await page.click('#submit_login')
        await page.wait_for_timeout(4000)
        
        print("URL final:", page.url)
        
        error_selectors = [
            '.help-block', '.error', '.alert', '.invalid-feedback',
            '.field-error', '.login-error', '.has-error', '[class*="error"]',
            '.text-danger', '.alert-danger'
        ]
        
        print("\\n--- Posibles mensajes de error ---")
        for sel in error_selectors:
            els = await page.query_selector_all(sel)
            for el in els:
                text = (await el.inner_text()).strip()
                if text:
                    print(f"  [{sel}] {text[:200]}")
        
        await page.screenshot(path='busae_login_result.png')
        content = await page.content()
        with open('busae_login_result.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print("\\nScreenshot guardado: busae_login_result.png")
        print("HTML guardado: busae_login_result.html")
        
        await browser.close()

asyncio.run(test_login_detail())
