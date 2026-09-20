/**
 * frontend/src/utils/apiNormalize.js
 * Normalizador universal para respuestas de API y Axios.
 * Permite manejar transparentemente respuestas paginadas (DRF: { count, results: [...] }),
 * listas directas ([...]), y respuestas con o sin interceptor (res.data vs res).
 */

export function normalizeList(res, defaultVal = []) {
  if (!res) return defaultVal;
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.results)) return res.results;
  if (Array.isArray(res.data?.results)) return res.data.results;
  if (Array.isArray(res.data)) return res.data;
  return defaultVal;
}

export function normalizeObject(res, defaultVal = {}) {
  if (!res) return defaultVal;
  if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
    return res.data;
  }
  if (typeof res === 'object') return res;
  return defaultVal;
}

export function normalizeCount(res) {
  if (!res) return 0;
  if (typeof res.count === 'number') return res.count;
  if (typeof res.data?.count === 'number') return res.data.count;
  const list = normalizeList(res);
  return list.length;
}
