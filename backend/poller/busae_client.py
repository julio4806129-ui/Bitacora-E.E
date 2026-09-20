"""Cliente HTTP/Playwright para el mapa GPS v2 de BUSAE."""
import json
import logging
import os
import re

from django.conf import settings

logger = logging.getLogger('poller.busae')

DEFAULT_LOGIN_PAGE = 'https://login.busae.com/site/login'
DEFAULT_LOGIN_POST = 'https://login.busae.com/user-management/auth/login'
DEFAULT_MAP_PAGE = 'https://login.busae.com/live-gps-map/live-gps-map'
DEFAULT_DATA_URL = 'https://login.busae.com/live-gps-map/update-gps-map-v2'
USER_AGENT = (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
)


def login_page_url():
    return (getattr(settings, 'BUSAE_URL', '') or DEFAULT_LOGIN_PAGE).strip()


def data_url():
    return (getattr(settings, 'BUSAE_DATA_URL', '') or DEFAULT_DATA_URL).strip()


def map_page_url():
    url = data_url()
    if '/live-gps-map/' in url:
        return url.rsplit('/', 1)[0] + '/live-gps-map'
    return DEFAULT_MAP_PAGE


def get_credentials():
    email = ''
    password = ''
    try:
        from buses.models import ConfiguracionSistema
        conf = ConfiguracionSistema.objects.filter(clave='busae_credenciales').first()
        if conf and isinstance(conf.valor, dict):
            email = str(conf.valor.get('email') or '').strip()
            password = str(conf.valor.get('password') or '').strip()
    except Exception:
        pass

    if not email or not password:
        email = (
            os.environ.get('BUSAE_EMAIL')
            or getattr(settings, 'BUSAE_EMAIL', '')
            or ''
        ).strip()
        password = (
            os.environ.get('BUSAE_PASSWORD')
            or getattr(settings, 'BUSAE_PASSWORD', '')
            or ''
        ).strip()
    return email, password


def _is_login_url(url):
    text = (url or '').lower()
    return 'auth/login' in text or 'site/login' in text


def _extract_csrf(html):
    if not html:
        return ''
    match = re.search(r'name="csrf-token"\s+content="([^"]+)"', html)
    if match:
        return match.group(1)
    match = re.search(r'name="_csrf"\s+value="([^"]+)"', html)
    return match.group(1) if match else ''


def _parse_json(text):
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find('{')
        alt = text.find('[')
        if start < 0 and alt < 0:
            return None
        if start < 0:
            start = alt
        elif alt >= 0:
            start = min(start, alt)
        try:
            return json.loads(text[start:])
        except json.JSONDecodeError:
            return None


def fetch_via_http(email, password):
    import requests
    from django.core.cache import cache

    session = requests.Session()
    session.headers.update({
        'User-Agent': USER_AGENT,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
    })
    cookie_key = 'busae:auth:cookies'

    def request_payload(csrf):
        headers = {
            'Referer': map_page_url(),
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        }
        res = session.post(
            data_url(),
            data={'refreshnocache': '1', '_csrf': csrf or ''},
            headers=headers,
            timeout=20,
            allow_redirects=True,
        )
        if res.status_code == 200 and not _is_login_url(res.url):
            payload = _parse_json(res.text)
            if payload is not None:
                return payload
        res = session.get(data_url(), headers={'Referer': map_page_url()}, timeout=20)
        if res.status_code == 200 and not _is_login_url(res.url):
            return _parse_json(res.text)
        return None

    cached = cache.get(cookie_key)
    if cached:
        session.cookies.update(cached)
        csrf = session.cookies.get('_csrf') or ''
        payload = request_payload(csrf)
        if payload is not None:
            logger.info('BUSAE — datos vía HTTP con sesión en caché')
            return payload

    login_page = session.get(login_page_url(), timeout=20)
    csrf = _extract_csrf(login_page.text) or session.cookies.get('_csrf') or ''
    login_res = session.post(
        DEFAULT_LOGIN_POST,
        data={
            '_csrf': csrf,
            'LoginForm[username]': email,
            'LoginForm[password]': password,
            'LoginForm[rememberMe]': '1',
        },
        timeout=25,
        allow_redirects=True,
        headers={'Referer': login_page_url()},
    )
    if _is_login_url(login_res.url):
        logger.error('Login BUSAE HTTP fallido — sigue en página de login')
        return None

    map_res = session.get(map_page_url(), timeout=20)
    csrf = _extract_csrf(map_res.text) or session.cookies.get('_csrf') or csrf
    cache.set(cookie_key, session.cookies.get_dict(), timeout=3600)
    payload = request_payload(csrf)
    if payload is not None:
        logger.info('BUSAE — login HTTP OK y datos descargados')
    return payload


def fetch_via_playwright(email, password):
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        )
        page = browser.new_page()
        page.goto(login_page_url(), wait_until='domcontentloaded', timeout=35000)
        try:
            accept_btn = page.locator('button:has-text("Accept all")')
            if accept_btn.count() > 0:
                accept_btn.first.click(timeout=3000)
                page.wait_for_timeout(500)
        except Exception:
            pass

        user_field = page.locator(
            '#loginform-username, input[name="LoginForm[username]"], input[name="username"]'
        )
        if user_field.count() == 0:
            page.goto(DEFAULT_LOGIN_POST, wait_until='domcontentloaded', timeout=30000)
            user_field = page.locator('#loginform-username, input[name="LoginForm[username]"]')

        user_field.first.fill(email, timeout=10000)
        page.locator(
            '#loginform-password, input[name="LoginForm[password]"], input[type="password"]'
        ).first.fill(password)
        page.locator('#submit_login, button[type="submit"]').first.click()
        page.wait_for_timeout(4000)
        page.wait_for_load_state('domcontentloaded', timeout=15000)

        if _is_login_url(page.url):
            browser.close()
            raise RuntimeError('Credenciales incorrectas en el portal BUSAE.')

        page.goto(map_page_url(), wait_until='domcontentloaded', timeout=35000)
        csrf = page.get_attribute('meta[name="csrf-token"]', 'content') or ''
        result_str = page.evaluate(
            '''async ({ csrf, url }) => {
                const headers = {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                };
                let res = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: new URLSearchParams({ refreshnocache: '1', _csrf: csrf || '' }).toString(),
                    credentials: 'same-origin',
                });
                if (!res.ok) {
                    res = await fetch(url, { method: 'GET', headers, credentials: 'same-origin' });
                }
                return await res.text();
            }''',
            {'csrf': csrf, 'url': data_url()},
        )
        browser.close()
        return _parse_json(result_str)


def fetch_payload():
    email, password = get_credentials()
    if not email or not password:
        logger.warning('BUSAE_EMAIL o BUSAE_PASSWORD no configurados')
        return None

    try:
        payload = fetch_via_http(email, password)
        if payload is not None:
            return payload
    except Exception as exc:
        logger.warning('Falló intento HTTP directo BUSAE (%s)', exc)

    try:
        logger.info('BUSAE — extrayendo con Playwright...')
        return fetch_via_playwright(email, password)
    except Exception as exc:
        logger.error('Error Playwright BUSAE: %s', exc)
        return None
