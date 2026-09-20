import re
from pathlib import Path

path = Path('poller/busae_service.py')
content = path.read_text(encoding='utf-8')

# Buscar y reemplazar toda la función _init_browser
pattern = r'async def _init_browser\(\):.*?(?=\nasync def |\ndef |\Z)'
new_func = '''async def _init_browser():
    if _state['browser']:
        return True
    try:
        from playwright.async_api import async_playwright
        from decouple import config

        email = ''
        password = ''
        try:
            from buses.models import ConfiguracionSistema
            conf = ConfiguracionSistema.objects.filter(clave='busae_credenciales').first()
            if conf and isinstance(conf.valor, dict):
                email = conf.valor.get('email', '')
                password = conf.valor.get('password', '')
        except Exception:
            pass

        if not email or not password:
            email = config('BUSAE_EMAIL', default='')
            password = config('BUSAE_PASSWORD', default='')

        if not email or not password:
            logger.warning('BUSAE_EMAIL o BUSAE_PASSWORD no configurados')
            return False

        logger.info('Iniciando navegador Playwright (BUSAE)...')
        _state['playwright'] = await async_playwright().start()
        _state['browser'] = await _state['playwright'].chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        )
        _state['page'] = await _state['browser'].new_page()

        await _state['page'].goto(BUSAE_URL, wait_until='domcontentloaded', timeout=30000)

        # Aceptar banner de cookies
        try:
            accept_btn = _state['page'].locator('button:has-text(\"Accept all\")')
            if await accept_btn.count() > 0:
                await accept_btn.first.click(timeout=3000)
                logger.info('Banner de cookies aceptado')
                await _state['page'].wait_for_timeout(1000)
        except Exception:
            pass

        await _state['page'].fill('#loginform-username', email)
        await _state['page'].fill('#loginform-password', password)
        await _state['page'].click('#submit_login')

        # Esperar a que la navegación termine
        await _state['page'].wait_for_timeout(4000)
        await _state['page'].wait_for_load_state('domcontentloaded', timeout=15000)

        current_url = _state['page'].url
        logger.info(f'URL después de login: {current_url}')

        if 'auth/login' in current_url or 'site/login' in current_url:
            logger.error('Login BUSAE fallido — credenciales incorrectas o página de login')
            await _close_browser()
            return False

        logger.info('Login BUSAE exitoso ✓')
        return True

    except Exception as e:
        logger.error(f'Error iniciando browser BUSAE: {e}')
        await _close_browser()
        return False

'''

new_content, count = re.subn(pattern, new_func, content, count=1, flags=re.DOTALL)
if count == 1:
    path.write_text(new_content, encoding='utf-8')
    print('Función _init_browser reemplazada correctamente')
else:
    print(f'No se pudo reemplazar automáticamente (encontrados: {count}).')
