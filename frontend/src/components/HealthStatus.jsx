import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { checkHealth, subscribeHealth } from '../api/health';

const LABELS = {
  database: 'Base de datos',
  redis_cache: 'Caché',
  celery: 'Tareas',
  busae_integration: 'BUSAE',
  genesis_integration: 'Genesis',
};

export const HealthStatus = ({ className = '' }) => {
  const [healthData, setHealthData] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeHealth((data) => {
      setHealthData(data);
    }, 30000);

    return () => unsubscribe();
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    const data = await checkHealth();
    setHealthData(data);
    setIsRefreshing(false);
  };

  const getStatusBadge = () => {
    if (!healthData) {
      return {
        wrap: 'border-slate-700 text-slate-400',
        dot: 'bg-slate-500',
        text: 'Estado',
        icon: Activity,
      };
    }

    switch (healthData.status) {
      case 'healthy':
        return {
          wrap: 'border-slate-700 text-slate-300',
          dot: 'bg-emerald-500',
          text: 'Operativo',
          icon: CheckCircle,
        };
      case 'degraded':
        return {
          wrap: 'border-slate-700 text-slate-300',
          dot: 'bg-amber-400',
          text: 'Atención',
          icon: AlertTriangle,
        };
      case 'unhealthy':
      default:
        return {
          wrap: 'border-rose-500/30 text-rose-300',
          dot: 'bg-rose-500',
          text: 'Incidencia',
          icon: XCircle,
        };
    }
  };

  const badge = getStatusBadge();
  const Icon = badge.icon;

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border bg-slate-900/60 text-[11px] font-medium hover:bg-slate-800/80 ${badge.wrap}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
        <span>{badge.text}</span>
        {isOpen ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-[#0f172a] rounded-xl shadow-xl border border-slate-800 p-3 z-50">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <Icon className="w-3.5 h-3.5 text-slate-500" />
              <h4 className="text-[11px] font-medium tracking-wide text-slate-400">
                Componentes
              </h4>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-1 hover:bg-slate-800 rounded text-slate-500"
              title="Actualizar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-1.5 text-xs">
            {healthData?.checks ? (
              Object.entries(healthData.checks).map(([key, check]) => {
                const isCheckOk = check.status === 'healthy';
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-900/50"
                  >
                    <span className="text-slate-300">
                      {LABELS[key] || key.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {check.latency_ms && (
                        <span className="text-[10px] text-slate-500">{check.latency_ms}ms</span>
                      )}
                      <span className={`text-[10px] ${isCheckOk ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isCheckOk ? 'ok' : check.status}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-slate-500 text-center py-2">Consultando…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthStatus;
