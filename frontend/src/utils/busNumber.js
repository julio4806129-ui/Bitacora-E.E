/**
 * Números de móvil como en Genesis: "0806" / "Bus #0001" → 806 / 1.
 */

export function parseBusNumber(value) {
  if (value == null || value === false || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.trunc(value);
    return n > 0 ? n : null;
  }
  const text = String(value)
    .replace(/^\s*bus\s*#?\s*/i, '')
    .replace(/#/g, '')
    .trim();
  const digits = text.replace(/\D/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return n > 0 ? n : null;
}

/** Etiqueta de tabla: 1, 2, 806 (sin ceros ni prefijo Bus #). */
export function formatBusNumber(value) {
  const n = parseBusNumber(value);
  return n == null ? '—' : String(n);
}

export function looksLikeBusQuery(term) {
  return /^\s*(bus\s*)?#?\s*\d+\s*$/i.test(String(term || ''));
}

export function busMatchesQuery(busValue, term) {
  const q = String(term || '').trim();
  if (!q) return true;
  if (looksLikeBusQuery(q)) {
    return parseBusNumber(busValue) === parseBusNumber(q);
  }
  return String(formatBusNumber(busValue)).includes(q.replace(/\s/g, ''));
}

export function nextSort(currentKey, currentDir, column) {
  if (currentKey === column) {
    return { key: column, dir: currentDir === 'asc' ? 'desc' : 'asc' };
  }
  return { key: column, dir: 'asc' };
}

export function sortRows(rows, sortKey, sortDir, getters = {}) {
  if (!sortKey) return rows;
  const dir = sortDir === 'desc' ? -1 : 1;
  const getter = getters[sortKey] || ((row) => row[sortKey]);
  return [...rows].sort((a, b) => {
    const va = getter(a);
    const vb = getter(b);
    const na = parseBusNumber(va);
    const nb = parseBusNumber(vb);
    if (sortKey === 'bus' || sortKey === 'bus_movil' || (na != null && nb != null && looksLikeBusQuery(String(va)))) {
      if (na != null && nb != null) return (na - nb) * dir;
    }
    const sa = va == null ? '' : String(va).toLowerCase();
    const sb = vb == null ? '' : String(vb).toLowerCase();
    return sa.localeCompare(sb, 'es', { numeric: true }) * dir;
  });
}
