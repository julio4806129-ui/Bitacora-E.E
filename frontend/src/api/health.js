/**
 * frontend/src/api/health.js
 * Cliente de consulta y polling continuo de salud del backend (Health Checks).
 */

import axios from 'axios';

export const checkHealth = async () => {
  try {
    const res = await axios.get('/api/health/', { timeout: 10000 });
    return res.data;
  } catch (err) {
    if (err.response?.data) {
      return err.response.data;
    }
    return {
      status: 'unhealthy',
      total_latency_ms: 0,
      checks: {
        network: {
          status: 'unhealthy',
          message: 'Sin conexión con el servidor backend',
        },
      },
    };
  }
};

/**
 * Inicia polling periódico de estado de salud. Retorna función para cancelar la suscripción.
 */
export const subscribeHealth = (callback, intervalMs = 30000) => {
  let isMounted = true;

  const poll = async () => {
    if (!isMounted) return;
    const health = await checkHealth();
    if (isMounted) {
      callback(health);
    }
  };

  // Primera ejecución inmediata
  poll();
  const timer = setInterval(poll, intervalMs);

  return () => {
    isMounted = false;
    clearInterval(timer);
  };
};
