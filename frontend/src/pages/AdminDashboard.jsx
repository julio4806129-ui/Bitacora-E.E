import React, { useState, useEffect, useCallback } from 'react';
import {
  Bus,
  Wifi,
  WifiOff,
  AlertOctagon,
  Users,
  Clock,
  RefreshCw,
  Bell,
  VolumeX,
  Volume2,
  CheckCircle2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import apiClient from '../api/client';
import HealthStatus from '../components/HealthStatus';
import ApiErrorAlert from '../components/ApiErrorAlert';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [isSilenced, setIsSilenced] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get('/admin/dashboard/stats/');
      setStats(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAlertStatus = useCallback(async () => {
    try {
      const res = await apiClient.get('/alerts/');
      setIsSilenced(res.is_silenced);
    } catch (e) {
      console.debug('Error consultando estado alertas:', e);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    checkAlertStatus();
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStats, checkAlertStatus]);

  const handleTestAlert = async () => {
    try {
      await apiClient.post('/alerts/test/', {
        title: 'Prueba desde Panel de Administración',
        message: 'Validación de conexión de alertas ejecutada correctamente por el Administrador.',
        level: 'info',
        channels: ['slack'],
      });
      setActionSuccess('Alerta de prueba enviada con éxito.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setError(err);
    }
  };

  const handleSilenceAlerts = async () => {
    try {
      await apiClient.post('/alerts/silence/', { duration_minutes: 60 });
      setIsSilenced(true);
      setActionSuccess('Alertas silenciadas durante 60 minutos.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setError(err);
    }
  };

  const handleResumeAlerts = async () => {
    try {
      await apiClient.post('/alerts/resume/');
      setIsSilenced(false);
      setActionSuccess('Alertas reactivadas exitosamente.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Centro de Control Operativo
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
              Admin 360°
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Telemetría de flota, monitoreo de salud y balance operativo en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <HealthStatus />
          <button
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg shadow-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      <ApiErrorAlert error={error} onRetry={fetchStats} onClose={() => setError(null)} />

      {actionSuccess && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300 rounded-xl text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Flota Monitoreada
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Bus className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {stats?.telemetria?.total ?? '--'}
            </span>
            <span className="text-xs text-gray-500 ml-2">buses en registro</span>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <Wifi className="w-3.5 h-3.5" />
              {stats?.telemetria?.conectados ?? 0} Online
            </span>
            <span className="flex items-center gap-1 text-rose-600 font-medium">
              <WifiOff className="w-3.5 h-3.5" />
              {stats?.telemetria?.desconectados ?? 0} Offline
            </span>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Conectividad GPS
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Wifi className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {stats?.telemetria?.porcentaje_online ?? '--'}%
            </span>
            <span className="text-xs text-gray-500 ml-2">disponibilidad</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats?.telemetria?.porcentaje_online ?? 0}%` }}
            />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Reportes Pendientes
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {stats?.reportes?.pendientes_total ?? '--'}
            </span>
            <span className="text-xs text-gray-500 ml-2">requieren atención</span>
          </div>
          <p className="mt-3 text-xs text-gray-500">Buses con corte o sin señal</p>
        </div>

        <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Atenciones Turno
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {stats?.turno_actual?.total_atenciones ?? '--'}
            </span>
            <span className="text-xs text-gray-500 ml-2">completadas hoy</span>
          </div>
          <p className="mt-3 text-xs text-gray-500">Corte turno 08:00 AM</p>
        </div>
      </div>

      {/* Main Grid: Technicians Activity & Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Technicians Table */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Rendimiento de Técnicos (Turno Activo)
              </h3>
            </div>
            <span className="text-xs font-medium text-gray-500">
              {stats?.turno_actual?.actividad_tecnicos?.length ?? 0} técnicos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/40 text-gray-500 text-xs uppercase font-semibold">
                  <th className="py-3 px-4">Técnico</th>
                  <th className="py-3 px-4">Patio</th>
                  <th className="py-3 px-4 text-center">Atendidos</th>
                  <th className="py-3 px-4 text-center">Cuota</th>
                  <th className="py-3 px-4">Cumplimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {stats?.turno_actual?.actividad_tecnicos?.length > 0 ? (
                  stats.turno_actual.actividad_tecnicos.map((tec) => (
                    <tr key={tec.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-white">
                        <div>{tec.nombre}</div>
                        <div className="text-xs text-gray-400 font-mono">Cod: {tec.codigo}</div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300 font-medium">
                        {tec.patio || 'Sin asignar'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-gray-900 dark:text-white">
                        {tec.atendidos_turno}
                      </td>
                      <td className="py-3.5 px-4 text-center text-gray-500">
                        {tec.cuota_diaria}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                tec.cumplimiento_pct >= 100
                                  ? 'bg-emerald-500'
                                  : tec.cumplimiento_pct >= 50
                                  ? 'bg-blue-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(tec.cumplimiento_pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {tec.cumplimiento_pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500 italic">
                      No hay técnicos registrados o activos en este turno.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operational Actions & Patrol summary */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-white text-base mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-500" />
              Gestión de Notificaciones y Alertas
            </h3>

            <div className="space-y-3">
              <button
                onClick={handleTestAlert}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium text-gray-700 dark:text-gray-200 transition-all"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  Enviar Alerta de Prueba (Slack)
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              {isSilenced ? (
                <button
                  onClick={handleResumeAlerts}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/50 text-sm font-medium transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-emerald-600" />
                    Reanudar Alertas
                  </span>
                  <span className="text-xs uppercase font-bold text-emerald-600">Silenciado</span>
                </button>
              ) : (
                <button
                  onClick={handleSilenceAlerts}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-medium text-gray-700 dark:text-gray-200 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <VolumeX className="w-4 h-4 text-amber-500" />
                    Silenciar Alertas por 1 hora
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Pending Reports by Patio */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-white text-base mb-3 flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-gray-500" />
              Reportes Pendientes por Patio
            </h3>

            <div className="space-y-2.5">
              {stats?.reportes?.por_patio?.length > 0 ? (
                stats.reportes.por_patio.map((pat) => (
                  <div
                    key={pat.patio}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/50 text-sm"
                  >
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {pat.patio || 'Sin Patio Asignado'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                      {pat.total}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-xs italic py-2">No hay reportes pendientes activos.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
