PATIOS_CANONICOS = [
    'LOS PUEBLOS',
    'RELEVO CA',
    'CURUNDU',
    'OJO DE AGUA',
    'LA DONA',
    'CHORRILLO',
    'LA CABIMA',
]

TIPOS_FLOTA_DEFAULT = ['Grand Viale', 'Torino', 'County', 'Articulado', 'Padrón']

TIPOS_DANO_DEFAULT = [
    'Falla de Alimentación',
    'Conector Roto',
    'Sin Señal GSM/GPS',
    'Carcasa Rota',
    'Firmware Desactualizado',
    'Bocina Dañada',
    'Botón Pánico Trabado',
    'SIM Card Inactiva',
]

FORMULARIO_ATENCION_DEFAULT = {
    'solicitar_imei': True,
    'solicitar_serie_sim': True,
    'solicitar_serie_ctap': True,
    'firmas_digitales_requeridas': False,
    'permitir_edicion_tecnico': False,
}

CLAVES_SECRETAS = {
    'busae_credenciales',
    'genesis_credenciales',
    'poller_credentials',
    'api_keys',
}

GPS_SIN_TRANSMISION = ('Offline', 'No records', 'OFF', 'off')
GPS_OPERATIVO = ('Active', 'Stopped', 'ON', 'on')


def normalize_patio(value):
    if not value:
        return ''
    raw = str(value).upper().replace('PATIO', ' ').replace('  ', ' ').strip()
    for patio in PATIOS_CANONICOS:
        if patio in raw or raw in patio:
            return patio
    return raw
