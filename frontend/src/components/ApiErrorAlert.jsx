import React from 'react';
import { AlertCircle, X, RotateCcw } from 'lucide-react';

export const ApiErrorAlert = ({
  error,
  onRetry,
  onClose,
  className = '',
}) => {
  if (!error) return null;

  const errorMessage =
    error.userMessage ||
    error.response?.data?.error ||
    error.message ||
    'Ha ocurrido un problema al procesar su solicitud.';

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 shadow-sm transition-all animate-in fade-in slide-in-from-top-1 ${className}`}
    >
      <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-rose-900 dark:text-rose-200">Error en la operación</p>
        <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">{errorMessage}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 text-rose-800 dark:text-rose-200 rounded-md text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reintentar
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded text-rose-600 dark:text-rose-400 transition-colors"
            title="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ApiErrorAlert;
