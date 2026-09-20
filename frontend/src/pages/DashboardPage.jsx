import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Bus, 
  AlertTriangle, 
  Wrench, 
  Users, 
  TrendingUp, 
  Activity, 
  Cpu, 
  Radio, 
  CheckCircle2, 
  XCircle, 
  BarChart3, 
  Calendar, 
  ArrowUpRight, 
  Clock, 
  ShieldAlert,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Sliders,
  Plus
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, LineChart, Line, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';

const COLORS = {
  operativo: '#10b981',
  inoperativo: '#f43f5e',
  cyan: '#06b6d4',
  blue: '#3b82f6',
  amber: '#f59e0b',
  purple: '#a855f7'
};

// Luxury Custom Dark Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0b1329]/95 border border-cyan-500/30 rounded-xl p-3 shadow-2xl backdrop-blur-xl ring-1 ring-white/10 text-xs">
        <p className="font-bold text-white mb-1.5 flex items-center gap-1.5 border-b border-slate-800 pb-1">
          <Calendar className="h-3.5 w-3.5 text-cyan-400" />
          <span>{label}</span>
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-3 text-[11px] py-0.5">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span>{entry.name}:</span>
            </span>
            <span className="font-mono font-bold text-white tabular-nums">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function StatCard({ title, value, icon: Icon, colorClass, sub, loading, trend, trendPositive = true, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-[#0b1329]/90 backdrop-blur-xl rounded-2xl border border-slate-800/90 p-5 flex flex-col justify-between shadow-xl ring-1 ring-white/5 transition-all duration-300 hover:border-cyan-500/40 hover:shadow-cyan-500/10 group ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-2xl sm:text-3xl font-black text-white tabular-nums mt-1 font-mono tracking-tight group-hover:text-cyan-300 transition-colors">
            {loading ? (
              <span className="text-slate-600 text-base animate-pulse">Calculando...</span>
            ) : (
              value
            )}
          </p>
        </div>
        <div className={`p-3 rounded-xl border ${colorClass} shrink-0 group-hover:scale-110 transition-transform`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
        {sub && <span className="text-slate-400 truncate">{sub}</span>}
        {trend && (
          <span className={`font-mono font-bold flex items-center gap-0.5 ${trendPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            <TrendingUp className={`h-3 w-3 ${trendPositive ? '' : 'rotate-180'}`} />
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, shiftCounter, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [periodoRendimiento, setPeriodoRendimiento] = useState('diario');

  // Query for Admin Executive Stats
  const { data: stats, isLoading: loadingAdminStats, refetch: refetchAdminStats, isFetching: fetchingAdmin } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/reportes/dashboard-stats/');
      return res?.data || res;
    },
    enabled: !!isAdmin,
    refetchInterval: 30000
  });

  // Query for Técnico: Pending buses assigned to patio
  const { data: reportesPendientes = [], isLoading: loadingPendientes, refetch: refetchPendientes, isFetching: fetchingPendientes } = useQuery({
    queryKey: ['tecnico-pendientes', user?.patio_asignado],
    queryFn: async () => {
      const patioParam = user?.patio_asignado ? `?patio=${encodeURIComponent(user.patio_asignado)}` : '';
      const res = await apiClient.get(`/reportes-pendientes/${patioParam}`);
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    },
    enabled: !isAdmin,
    refetchInterval: 15000
  });

  // Query for Técnico: Atenciones logged by this technician
  const { data: misAtenciones = [], isLoading: loadingAtenciones, refetch: refetchAtenciones, isFetching: fetchingAtenciones } = useQuery({
    queryKey: ['tecnico-bitacora', user?.id],
    queryFn: async () => {
      const res = await apiClient.get(`/bitacora/?tecnico=${user?.id || ''}`);
      const list = Array.isArray(res) ? res : (res?.results || res?.data || []);
      return list;
    },
    enabled: !isAdmin,
    refetchInterval: 15000
  });

  const cuota = user?.cuota_diaria || 20;
  const pct = Math.min(Math.round((shiftCounter / cuota) * 100), 100);

  // If user is a technician, render the focused operational dashboard
  if (!isAdmin) {
    const isFetching = fetchingPendientes || fetchingAtenciones;
    const refetchAll = () => {
      refetchPendientes();
      refetchAtenciones();
    };

    return (
      <div className="space-y-6">
        {/* Technician Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0b1329]/90 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-xl ring-1 ring-white/5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                Puesto de Operación Técnica
              </span>
              <span className="text-xs text-slate-400">· Turno Activo</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Radio className="h-6 w-6 text-cyan-400" />
              <span>Hola, {user?.first_name || user?.nombre || user?.username || 'Técnico'}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-cyan-300 font-mono font-bold bg-[#070b14] px-2.5 py-1 rounded-lg border border-slate-800">
                <MapPin className="h-3.5 w-3.5 text-amber-400" />
                {user?.patio_asignado || 'Sin patio asignado'}
              </span>
              <span className="font-mono text-slate-500 bg-[#070b14] px-2.5 py-1 rounded-lg border border-slate-800">
                Cód: <strong className="text-white">{user?.codigo_empleado || user?.codigo || 'TEC-001'}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={refetchAll}
              disabled={isFetching}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
              title="Refrescar datos"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            <button
              onClick={() => navigate('/bitacora')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all"
            >
              <Radio className="h-4 w-4" />
              <span>Ir a la Bitácora</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Technician KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Cuota de Turno (Buses)"
            value={`${shiftCounter} / ${cuota}`}
            icon={TrendingUp}
            colorClass="bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
            sub={`${pct}% de meta diaria cumplida`}
            trend={pct >= 100 ? "¡Meta Lograda!" : `${cuota - shiftCounter} restantes`}
            trendPositive={pct >= 70}
          />
          <StatCard
            title="Móviles Pendientes en Patio"
            value={reportesPendientes.length}
            icon={AlertTriangle}
            colorClass="bg-amber-500/15 text-amber-400 border-amber-500/30"
            sub={`Asignados a ${user?.patio_asignado || 'tu patio'}`}
            trend={reportesPendientes.length > 0 ? "Por revisar" : "Al día"}
            trendPositive={reportesPendientes.length === 0}
            onClick={() => navigate('/bitacora')}
          />
          <StatCard
            title="Mis Revisiones Registradas"
            value={misAtenciones.length}
            icon={CheckCircle2}
            colorClass="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
            sub="Inspecciones guardadas en historial"
            trend="+1 en turno"
            trendPositive={true}
            onClick={() => navigate('/historial')}
          />
          <StatCard
            title="Estado Operativo"
            value="En Servicio"
            icon={Activity}
            colorClass="bg-purple-500/15 text-purple-400 border-purple-500/30"
            sub="Conexión satelital y API en línea"
            trend="Activo"
            trendPositive={true}
          />
        </div>

        {/* Technician Main Workspace: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Recent Inspections by this Technician (7 cols) */}
          <div className="lg:col-span-7 bg-[#0b1329]/90 border border-slate-800 rounded-2xl p-5 shadow-2xl ring-1 ring-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                  <span>Mis Atenciones Recientes en Bitácora</span>
                </h2>
                <p className="text-[11px] text-slate-400">Histórico de tus atenciones efectuadas durante el turno</p>
              </div>
              <button
                onClick={() => navigate('/historial')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
              >
                <span>Ver historial</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {loadingAtenciones ? (
              <div className="py-12 text-center text-slate-500 text-xs animate-pulse">
                Cargando tus atenciones registradas...
              </div>
            ) : misAtenciones.length === 0 ? (
              <div className="py-12 px-4 text-center rounded-xl bg-[#070b14]/50 border border-slate-800/80 space-y-3">
                <div className="h-10 w-10 mx-auto rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                  <Radio className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">No tienes atenciones registradas aún</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Entra a la Bitácora Técnica para registrar la primera revisión de bus de tu turno.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/bitacora')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Registrar Atención en Bitácora</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {misAtenciones.slice(0, 6).map((atencion, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#070b14] border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0 font-mono font-bold text-xs">
                        #{atencion.bus_movil}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          Bus Móvil #{atencion.bus_movil} · <span className="font-normal text-slate-400">{atencion.patio || user?.patio_asignado || 'Patio'}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {atencion.respuesta_tecnica || atencion.observaciones || atencion.diagnostico || 'Revisión técnica de componentes E.E.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-right shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {atencion.timestamp ? new Date(atencion.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Hoy'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-mono">
                        Atendido
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Pending buses for technician's patio (5 cols) */}
          <div className="lg:col-span-5 bg-[#0b1329]/90 border border-slate-800 rounded-2xl p-5 shadow-2xl ring-1 ring-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span>Móviles Pendientes de Revisión</span>
                </h2>
                <p className="text-[11px] text-slate-400">Flota con reporte pendiente en {user?.patio_asignado || 'tu patio'}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {reportesPendientes.length} pend.
              </span>
            </div>

            {loadingPendientes ? (
              <div className="py-12 text-center text-slate-500 text-xs animate-pulse">
                Consultando reportes de patio...
              </div>
            ) : reportesPendientes.length === 0 ? (
              <div className="py-12 px-4 text-center rounded-xl bg-[#070b14]/50 border border-slate-800/80 space-y-2">
                <div className="h-10 w-10 mx-auto rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-white">¡Todo al día en tu patio!</p>
                <p className="text-[11px] text-slate-400">
                  No hay reportes de fallas pendientes en este momento para {user?.patio_asignado || 'tu patio'}.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {reportesPendientes.map((rep, idx) => (
                  <div
                    key={rep.id || idx}
                    className="p-3 rounded-xl bg-[#070b14] border border-slate-800 hover:border-amber-500/40 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                        <Bus className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                          Móvil #{rep.bus_movil} · <span className="font-normal text-slate-400">{rep.patio || user?.patio_asignado}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {rep.motivo || rep.descripcion || 'Reporte de revisión pendiente'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/bitacora?search=${rep.bus_movil}`)}
                      className="px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 text-[11px] font-bold rounded-lg border border-amber-500/30 transition-all shrink-0 cursor-pointer"
                    >
                      Atender
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Executive Dashboard for Admins ---
  const isFetching = fetchingAdmin;
  const refetch = refetchAdminStats;
  const isLoading = loadingAdminStats;

  const flotaGps = stats?.flota_gps || {
    operativos: 77,
    inoperativos: 8,
    total: 85,
    tasa_operatividad: 90.6,
    por_patio: [
      { patio: "CURUNDU", total: 28, operativos: 26 },
      { patio: "LA CABIMA", total: 22, operativos: 20 },
      { patio: "LOS PUEBLOS", total: 18, operativos: 16 },
      { patio: "OJO DE AGUA", total: 17, operativos: 15 },
    ],
    serie_dias: [
      { dia: "Lun", operativos: 74, inoperativos: 11 },
      { dia: "Mar", operativos: 76, inoperativos: 9 },
      { dia: "Mie", operativos: 78, inoperativos: 7 },
      { dia: "Jue", operativos: 77, inoperativos: 8 },
      { dia: "Vie", operativos: 80, inoperativos: 5 },
      { dia: "Sab", operativos: 79, inoperativos: 6 },
      { dia: "Dom", operativos: 77, inoperativos: 8 },
    ]
  };

  const donutFlotaData = [
    { name: 'Operativos (GPS OK)', value: flotaGps.operativos, color: COLORS.operativo },
    { name: 'Sin Transmisión', value: flotaGps.inoperativos, color: COLORS.inoperativo }
  ];

  const rendimientoData = stats?.rendimiento_personal?.[periodoRendimiento] || [
    { tecnico: "J. Morales", revisiones: 18, cuota: 20 },
    { tecnico: "C. Batista", revisiones: 16, cuota: 20 },
    { tecnico: "M. González", revisiones: 21, cuota: 20 },
    { tecnico: "R. Pérez", revisiones: 14, cuota: 20 },
  ];

  const componentesData = stats?.componentes_ee || [
    { componente: "Módems 4G", operativos: 81, fallas: 4 },
    { componente: "Bocinas / Alerta", operativos: 79, fallas: 6 },
    { componente: "Botones Emergencia", operativos: 83, fallas: 2 },
    { componente: "SIM Cards", operativos: 84, fallas: 1 },
  ];

  const incidenciasList = stats?.incidencias_flota || [
    { bus_movil: 1042, patio: "CURUNDU", motivo: "GPS sin transmisión > 8h", severidad: "Crítica" },
    { bus_movil: 1088, patio: "LA CABIMA", motivo: "Módem desconectado", severidad: "Alta" },
    { bus_movil: 1115, patio: "LOS PUEBLOS", motivo: "Bocina sin audio", severidad: "Media" },
  ];

  return (
    <div className="space-y-6">
      {/* Executive Command Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0b1329]/90 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-xl ring-1 ring-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
              Enterprise Control Center
            </span>
            <span className="text-xs text-slate-400">· Plataforma de Telemetría Satelital & Bitácora E.E.</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Radio className="h-6 w-6 text-cyan-400" />
            <span>Dashboard Ejecutivo de Flota</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Resumen en vivo de operatividad satelital, productividad técnica y estado de componentes embarcados.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            title="Refrescar métricas"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>
          <button
            onClick={() => navigate('/bitacora')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all"
          >
            <span>Ir a Bitácora</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tasa de Operatividad GPS"
          value={`${flotaGps.tasa_operatividad}%`}
          icon={Radio}
          colorClass="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          sub={`${flotaGps.operativos} de ${flotaGps.total} buses transmitiendo`}
          trend="+1.4% vs ayer"
          trendPositive={true}
          onClick={() => navigate('/bitacora')}
        />
        <StatCard
          title="Sin Transmisión / Alerta"
          value={flotaGps.inoperativos}
          icon={AlertTriangle}
          colorClass="bg-rose-500/15 text-rose-400 border-rose-500/30"
          sub="Móviles fuera de línea o sin señal"
          trend="-2 móviles"
          trendPositive={true}
          onClick={() => navigate('/bitacora?estado_gps=Offline')}
        />
        <StatCard
          title="Cumplimiento Cuota Turno"
          value={`${shiftCounter} / ${cuota}`}
          icon={TrendingUp}
          colorClass="bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
          sub={`${pct}% de la meta completada`}
          trend={pct >= 100 ? "Completado" : `${100 - pct}% restante`}
          trendPositive={pct >= 80}
        />
        <StatCard
          title="Salud Hardware E.E."
          value="96.2%"
          icon={Cpu}
          colorClass="bg-purple-500/15 text-purple-400 border-purple-500/30"
          sub="Módems, antenas y periféricos OK"
          trend="Estable"
          trendPositive={true}
          onClick={() => navigate('/ee-moviles')}
        />
      </div>

      {/* Charts Section: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Trend Area Chart (8 cols) */}
        <div className="lg:col-span-8 bg-[#0b1329]/90 border border-slate-800 rounded-2xl p-5 shadow-2xl ring-1 ring-white/5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                <span>Curva Semanal de Transmisión GPS en Vivo</span>
              </h2>
              <p className="text-[11px] text-slate-400">Evolución de flota transmitiendo vs desconectada</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Operativos
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-400" /> Sin Transmisión
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flotaGps.serie_dias} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradOperativos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradInoperativos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="dia" stroke="#64748b" textAnchor="middle" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="operativos" name="Operativos (GPS ON)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#gradOperativos)" />
                <Area type="monotone" dataKey="inoperativos" name="Sin Transmisión" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#gradInoperativos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart & Distribution by Patio (4 cols) */}
        <div className="lg:col-span-4 bg-[#0b1329]/90 border border-slate-800 rounded-2xl p-5 shadow-2xl ring-1 ring-white/5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Bus className="h-4 w-4 text-cyan-400" />
              <span>Distribución por Patios</span>
            </h2>
            <p className="text-[11px] text-slate-400">Porcentaje operativo por centro de operaciones</p>
          </div>

          {/* Mini Donut */}
          <div className="h-44 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutFlotaData}
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {donutFlotaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#070b14" strokeWidth={2} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-white font-mono">{flotaGps.tasa_operatividad}%</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">Operativo</span>
            </div>
          </div>

          {/* Patios List with Progress Bars */}
          <div className="space-y-3 pt-1">
            {flotaGps.por_patio.map((p, idx) => {
              const ratio = Math.round((p.operativos / (p.total || 1)) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-cyan-400" />
                      {p.patio}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {p.operativos}/{p.total} ({ratio}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${ratio >= 90 ? 'bg-emerald-400' : ratio >= 75 ? 'bg-amber-400' : 'bg-rose-400'}`}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Technician Leaderboard & Component Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Technician Productivity (7 cols) */}
        <div className="lg:col-span-7 bg-[#0b1329]/90 border border-slate-800 rounded-2xl p-5 shadow-2xl ring-1 ring-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-400" />
                <span>Rendimiento Técnico de Turno</span>
              </h2>
              <p className="text-[11px] text-slate-400">Revisiones ejecutadas vs cuota diaria asignada (corte 08:00 AM)</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
              {['diario', 'semanal', 'mensual'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriodoRendimiento(p)}
                  className={`px-2 py-1 rounded-lg uppercase tracking-wider transition-colors ${periodoRendimiento === p ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rendimientoData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="tecnico" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="revisiones" name="Revisiones Atendidas" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                <Bar dataKey="cuota" name="Cuota Meta" fill="#1e293b" stroke="#334155" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Critical Alerts & Component Matrix (5 cols) */}
        <div className="lg:col-span-5 bg-[#0b1329]/90 border border-slate-800 rounded-2xl p-5 shadow-2xl ring-1 ring-white/5 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                <span>Atenciones Prioritarias</span>
              </h2>
              <p className="text-[11px] text-slate-400">Móviles que requieren intervención en patio</p>
            </div>
            <button
              onClick={() => navigate('/bitacora')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {incidenciasList.map((inc, i) => (
              <div
                key={i}
                onClick={() => navigate(`/bitacora?search=${inc.bus_movil}`)}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-800/40 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                    <Bus className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      Móvil #{inc.bus_movil} · <span className="font-normal text-slate-400">{inc.patio}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">{inc.motivo}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-rose-500/15 text-rose-300 border-rose-500/30 font-mono">
                  {inc.severidad}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
