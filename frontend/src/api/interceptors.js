/**
 * frontend/src/api/interceptors.js
 * Interceptores de request, response y manejo global de errores con retry exponencial
 * y cola concurrente de token refresh.
 */

import axios from 'axios';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setupInterceptors = (apiClient) => {
  // Request Interceptor
  apiClient.interceptors.request.use(
    (config) => {
      config.metadata = { startTime: new Date().getTime() };
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response & Error Interceptor
  apiClient.interceptors.response.use(
    (response) => {
      if (response.config?.metadata) {
        const duration = new Date().getTime() - response.config.metadata.startTime;
        // Opcional: log en dev
        if (import.meta.env?.DEV && duration > 1000) {
          console.warn(`[SLOW API] ${response.config.method?.toUpperCase()} ${response.config.url} tomó ${duration}ms`);
        }
      }
      return response.data;
    },
    async (error) => {
      const originalRequest = error.config;
      if (!originalRequest) return Promise.reject(error);

      // Manejo de 401 y Refresh Token con queue
      if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('auth/')) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          isRefreshing = false;
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          return Promise.reject(error);
        }

        try {
          const res = await axios.post('/api/token/refresh/', { refresh: refreshToken });
          const newAccess = res.data?.access;
          if (newAccess) {
            localStorage.setItem('token', newAccess);
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            processQueue(null, newAccess);
            return apiClient(originalRequest);
          }
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }

      // Reintentos automáticos con backoff exponencial en errores de red o temporales de servidor (502, 503, 504)
      const shouldRetry =
        !originalRequest._hasRetried &&
        (!error.response || [502, 503, 504].includes(error.response.status)) &&
        originalRequest.method?.toLowerCase() === 'get';

      if (shouldRetry) {
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
        if (originalRequest._retryCount <= 2) {
          const delayMs = originalRequest._retryCount * 1500;
          await new Promise((res) => setTimeout(res, delayMs));
          return apiClient(originalRequest);
        }
      }

      // Normalizar mensaje de error legible
      let normalizedMessage = 'Error inesperado de comunicación con el servidor.';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          normalizedMessage = error.response.data;
        } else if (error.response.data.error) {
          normalizedMessage = error.response.data.error;
        } else if (error.response.data.detail) {
          normalizedMessage = error.response.data.detail;
        } else if (error.response.data.message) {
          normalizedMessage = error.response.data.message;
        }
      } else if (error.request) {
        normalizedMessage = 'No se pudo contactar al servidor. Compruebe su conexión a internet.';
      }

      error.userMessage = normalizedMessage;
      return Promise.reject(error);
    }
  );
};
