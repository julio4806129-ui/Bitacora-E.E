/**
 * frontend/src/hooks/useHealth.js
 * Custom hook para suscripción reactiva y polling de salud del sistema.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { checkHealth, subscribeHealth } from '../api/health';

export const useHealth = (pollInterval = 30000, onStatusChange = null) => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const prevStatusRef = useRef(null);

  const handleUpdate = useCallback(
    (newHealth) => {
      setHealth(newHealth);
      setLoading(false);

      if (
        prevStatusRef.current &&
        prevStatusRef.current !== newHealth.status &&
        typeof onStatusChange === 'function'
      ) {
        onStatusChange(newHealth.status, newHealth);
      }
      prevStatusRef.current = newHealth.status;
    },
    [onStatusChange]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await checkHealth();
    handleUpdate(data);
    return data;
  }, [handleUpdate]);

  useEffect(() => {
    const unsubscribe = subscribeHealth(handleUpdate, pollInterval);
    return () => unsubscribe();
  }, [handleUpdate, pollInterval]);

  const isHealthy = health?.status === 'healthy';
  const isDegraded = health?.status === 'degraded';
  const isUnhealthy = health?.status === 'unhealthy';

  return {
    health,
    loading,
    isHealthy,
    isDegraded,
    isUnhealthy,
    refresh,
  };
};

export default useHealth;
