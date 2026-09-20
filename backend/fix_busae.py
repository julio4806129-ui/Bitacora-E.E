import re

with open('poller/busae_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Reemplazar la función _init_browser completa
old_init = '''async def _init_browser():
    if _state['browser']:
        return True
    try:
        from playwright.async_api import async_playwright
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
            try:
                from decouple import config
                email = config('BUSAE_EMAIL', default='')
                password = config('BUSAE_PASSWORD', default='')
            except Exception:
                email = getattr(settings, 'BUSAE_EMAIL', '')
                password = getattr(settings, 'BUSAE_PASSWORD', '')

        if not email or not password:
            logger.warning('BUSAE_EMAIL o BUSAE_PASSWORD no configurados en entorno ni en base de datos')
            return False

        logger.info('Iniciando navegador Playwright (BUSAE)...')
        _state['playwright'] = await async_playwright().start()
        _state['browser'] = await _state['playwright'].chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        )
        _state['page'] = await _state['browser'].new_page()

        await _state['page'].goto(BUSAE_URL, wait_until='networkidle', timeout=30000)
        await _state['page'].fill('#loginform-username', email)
        await _state['page'].fill('#loginform-password', password)

        await asyncio.gather(
            _state['page'].click('#submit_login'),
            _state['page'].wait_for_load_state('networkidle'),
        )

        if 'site/login' in _state['page'].url:
            logger.error('Login BUSAE fallido — credenciales incorrectas')
            await _close_browser()
            return False

        logger.info('Login BUSAE exitoso ✓')
        return True

    except Exception as e:
        logger.error(f'Error iniciando browser BUSAE: {e}')
        await _close_browser()
        return False'''

new_init = '''async def _init_browser():
    if _state['browser']:
        return True
    try:
        from playwright.async_api import async_playwright
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
            try:
                from decouple import config
                email = config('BUSAE_EMAIL', default='')
                password = config('BUSAE_PASSWORD', default='')
            except Exception:
                email = getattr(settings, 'BUSAE_EMAIL', '')
                password = getattr(settings, 'BUSAE_PASSWORD', '')

        if not email or not password:
            logger.warning('BUSAE_EMAIL o BUSAE_PASSWORD no configurados en entorno ni en base de datos')
            return False

        logger.info('Iniciando navegador Playwright (BUSAE)...')
        _state['playwright'] = await async_playwright().start()
        _state['browser'] = await _state['playwright'].chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        )
        _state['page'] = await _state['browser'].new_page()

        await _state['page'].goto(BUSAE_URL, wait_until='domcontentloaded', timeout=30000)

        # Aceptar banner de cookies si aparece
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
        await _state['page'].wait_for_load_state('domcontentloaded', timeout=20000)

        current_url = _state['page'].url
        logger.info(f'URL después de login: {current_url}')

        # Login fallido si seguimos en la página de autenticación
        if 'auth/login' in current_url or 'site/login' in current_url:
            logger.error('Login BUSAE fallido — credenciales incorrectas o página de login')
            await _close_browser()
            return False

        logger.info('Login BUSAE exitoso ✓')
        return True

    except Exception as e:
        logger.error(f'Error iniciando browser BUSAE: {e}')
        await _close_browser()
        return False'''

if old_init in content:
    content = content.replace(old_init, new_init)
    with open('poller/busae_service.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("OK: _init_browser actualizado correctamente")
else:
    print("No se encontró la función exacta. Revisando versión del archivo...")
    # Fallback: buscar por partes
    print("Abre el archivo poller/busae_service.py y avísame para editarlo manualmente.")
