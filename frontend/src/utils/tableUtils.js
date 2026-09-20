/**
 * tableUtils.js
 * Utilidades compartidas para configuración de tablas dinámicas.
 * Centraliza getAlignClass y helpers para evitar duplicación entre páginas.
 */

/**
 * Retorna clases Tailwind de alineación de texto para celdas de tabla.
 * @param {'left'|'center'|'right'} align
 */
export function getAlignClass(align) {
  switch (align) {
    case 'center': return 'text-center';
    case 'right':  return 'text-right';
    default:       return 'text-left';
  }
}

/**
 * Retorna clases Tailwind de ancho para columnas.
 * @param {'compact'|'normal'|'wide'|string} width
 */
export function getWidthClass(width) {
  switch (width) {
    case 'compact': return 'w-24';
    case 'normal':  return 'w-36';
    case 'wide':    return 'w-48';
    default:        return width || '';
  }
}

/**
 * Carga la configuración de columnas desde el backend;
 * si falla, retorna el fallback proporcionado.
 * @param {import('../api/client').default} apiClient
 * @param {string} module  e.g. 'bitacora' | 'historial' | 'ee_moviles'
 * @param {Array}  fallback
 */
export async function fetchTableConfig(apiClient, module, fallback) {
  try {
    const res = await apiClient.get(`/configuracion/distribucion-tabla/${module}/`);
    return res?.data?.columnas || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Filtra el array de columnas dejando solo las visibles.
 * @param {Array} columns
 * @returns {Array}
 */
export function getVisibleColumns(columns) {
  return columns.filter(c => c.visible !== false);
}

/**
 * Badge de estado genérico.
 * Retorna { text, cls } a partir de un valor de estado conocido.
 */
export const STATUS_MAP = {
  INSTALADO:  { text: 'Instalado',       cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  EN_STOCK:   { text: 'En Stock',         cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  EN_TALLER:  { text: 'En Taller',        cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  DE_BAJA:    { text: 'Dado de Baja',     cls: 'bg-slate-700/40 text-slate-400 border-slate-600' },
  ACTIVO:     { text: 'Activo',           cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  INACTIVO:   { text: 'Inactivo',         cls: 'bg-slate-700/40 text-slate-400 border-slate-600' },
  PENDIENTE:  { text: 'Pendiente',        cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  CERRADO:    { text: 'Cerrado',          cls: 'bg-slate-700/40 text-slate-400 border-slate-600' },
  FUNCIONA:   { text: 'Funciona',         cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  DAÑADO:     { text: 'Dañado',           cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  DAÑADA:     { text: 'Dañada',           cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  INOPERATIVO:{ text: 'Inoperativo',      cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
};

export function getStatusBadge(value) {
  const key = (value || '').toUpperCase().replace(/\s+/g, '_');
  return STATUS_MAP[key] || { text: value || '—', cls: 'bg-slate-800 text-slate-400 border-slate-700' };
}
