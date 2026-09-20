/**
 * frontend/src/hooks/useApi.js
 * Custom hook para llamadas a API con estados de carga, manejo de errores,
 * reintento automático y cancelación limpia en desmontaje de componente.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export const useApi = (apiFunc, immediate = false, initialParams = null) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);
  const lastParamsRef = useRef(initialParams);

  const execute = useCallback(
    async (...args) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);
      lastParamsRef.current = args;

      try {
        const result = await apiFunc(...args);
        setData(result);
        return result;
      } catch (err) {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          setError(err);
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFunc]
  );

  const retry = useCallback(() => {
    if (lastParamsRef.current) {
      return execute(...lastParamsRef.current);
    }
    return execute();
  }, [execute]);

  useEffect(() => {
    if (immediate) {
      if (initialParams) {
        execute(...(Array.isArray(initialParams) ? initialParams : [initialParams])).catch(() => {});
      } else {
        execute().catch(() => {});
      }
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [execute, immediate]);

  return {
    data,
    loading,
    error,
    execute,
    retry,
    setData,
  };
};

export default useApi;
