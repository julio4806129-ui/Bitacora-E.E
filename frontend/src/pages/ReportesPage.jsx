import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Calendar, 
  Download, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Cpu, 
  Bus, 
  Radio, 
  ShieldAlert, 
  RefreshCw, 
  Filter, 
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import apiClient from '../api/client';
import ExportButton from '../components/ExportButton';

const COLORS = ['#10b981', '#f43f5e', '#06b6d4', '#3b82f6', '#f59e0b', '#8b5cf6'];

const REPORT_TABS = [
  { id: 'flota_gps', name: 'Estado Flota GPS', icon: Radio, desc: 'Operatividad e Inoperatividad GPS' },
  { id: 'rendimiento', name: 'Rendimiento Personal', icon: Users, desc: 'Revisiones Diarias, Semanal y Mensual' },
  { id: 'componentes', name: 'Componentes E.E.', icon: Cpu, desc: 'Salud y Diagnóstico de Hardware' },
  { id: 'incidencias', name: 'Incidencias Flota', icon: ShieldAlert, desc: 'Móviles con Fallas Recurrentes' },
];

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState('flota_gps');
  const [periodoRendimiento, setPeriodoRendimiento] = useState('diario');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Query general de estadísticas y reportes
  const { data: stats, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-stats-reportes'],
    queryFn: async () => {
      const res = await apiClient.get('/reportes/dashboard-stats/');
      return res?.data || res;
    }
  });

  const flotaGps = stats?.flota_gps || {
    operativos: 77,
    inoperativos: 8,
    total: 85,
    tasa_operatividad: 90.6,
    por_patio: [],
    serie_dias: []
  };

  const rendimientoPersonal = stats?.rendimiento_personal || {
    diario: [],
    semanal: [],
    mensual: []
  };

  const componentesEE = stats?.componentes_ee || [];
  const incidenciasFlota = stats?.incidencias_flota || [];

  // Exportar datos a CSV localmente
  const handleExportCSV = (filename, dataRows, headers) => {
    let csvContent = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n';
    dataRows.forEach(row => {
      csvContent += row.map(val => `"${val}"`).join(',') + '\n';
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* ── HEADER DEL MÓDULO DE REPORTES ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0f172a]/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-cyan-400" />
            Centro de Reportes & Business Intelligence E.E.
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Análisis consolidado de operatividad satelital, productividad laboral y confiabilidad de componentes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-cyan-400' : ''}`} />
            Actualizar Datos
          </button>
        </div>
      </div>

      {/* ── SUB-TABS SELECTOR ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                isActive
                  ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                  : 'bg-[#0f172a]/60 border-slate-800 hover:border-slate-700 hover:bg-[#0f172a]'
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 ${
                isActive ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold tracking-wide ${isActive ? 'text-white' : 'text-slate-300'}`}>
                  {tab.name}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{tab.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SUB-REPORTE 1: ESTADO DE FLOTA GPS (OPERATIVIDAD E INOPERATIVIDAD)
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'flota_gps' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0f172a]/90 p-4 rounded-2xl border border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-400" />
                Reporte de Operatividad e Inoperatividad GPS
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluación del parque vehicular según telemetría activa en tiempo real
              </p>
            </div>
            <button
              onClick={() => {
                const headers = ['Patio', 'Operativos (GPS ON)', 'Inoperativos (GPS OFF)', 'Total Flota', 'Tasa Operatividad %'];
                const rows = flotaGps.por_patio.map(p => [
                  p.patio,
                  p.operativos,
                  p.inoperativos,
                  p.total,
                  `${p.total > 0 ? Math.round((p.operativos / p.total) * 100) : 0}%`
                ]);
                handleExportCSV('reporte_operatividad_gps_mibus', rows, headers);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV Flota GPS
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Donut Operatividad */}
            <div className="bg-[#0f172a]/90 rounded-2xl border border-slate-800 p-5 flex flex-col items-center justify-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Conectividad Global</p>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Operativos', value: flotaGps.operativos, color: '#10b981' },
                        { name: 'Inoperativos', value: flotaGps.inoperativos, color: '#f43f5e' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f43f5e" />
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0b1329', borderColor: '#334155', borderRadius: 12, fontSize: 12, color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-2xl font-black text-white font-mono mt-1">{flotaGps.tasa_operatividad}%</p>
              <p className="text-xs text-emerald-400 font-semibold">Tasa de Conectividad Total</p>
            </div>

            {/* Evolución temporal últimos 7 días */}
            <div className="lg:col-span-2 bg-[#0f172a]/90 rounded-2xl border border-slate-800 p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Tendencia de Atenciones / Restablecimientos (Últimos 7 días)
              </p>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={flotaGps.serie_dias}>
                    <defs>
                      <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0b1329', borderColor: '#334155', borderRadius: 12, fontSize: 12, color: '#fff' }} />
                    <Area type="monotone" dataKey="atenciones" name="Buses Restablecidos" stroke="#06b6d4" strokeWidth={2.5} fill="url(#cyanGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tabla Desglosada por Patio */}
          <div className="bg-[#0f172a]/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-[#070b14]">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Desglose Operativo por Patio Oficial (Genesis)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="py-3 px-4">Patio</th>
                    <th className="py-3 px-4">Buses Operativos (ON)</th>
                    <th className="py-3 px-4">Buses Inoperativos (OFF)</th>
                    <th className="py-3 px-4">Total Flota en Patio</th>
                    <th className="py-3 px-4">Cumplimiento %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                  {flotaGps.por_patio.map((p, i) => {
                    const ratio = p.total > 0 ? Math.round((p.operativos / p.total) * 100) : 0;
                    return (
                      <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-sans font-bold text-white">{p.patio}</td>
                        <td className="py-3 px-4 text-emerald-400 font-bold">{p.operativos}</td>
                        <td className="py-3 px-4 text-rose-400 font-bold">{p.inoperativos}</td>
                        <td className="py-3 px-4 text-slate-300">{p.total}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            ratio >= 90 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {ratio}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SUB-REPORTE 2: RENDIMIENTO DE PERSONAL (DIARIO, SEMANAL, MENSUAL)
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'rendimiento' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0f172a]/90 p-4 rounded-2xl border border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-400" />
                Rendimiento y Productividad del Personal Técnico
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparativo de revisiones técnicas realizadas vs cuota establecida
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Selector de Período */}
              <div className="inline-flex p-1 bg-[#070b14] border border-slate-800 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setPeriodoRendimiento('diario')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    periodoRendimiento === 'diario' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Diario (Turno)
                </button>
                <button
                  onClick={() => setPeriodoRendimiento('semanal')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    periodoRendimiento === 'semanal' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semanal
                </button>
                <button
                  onClick={() => setPeriodoRendimiento('mensual')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    periodoRendimiento === 'mensual' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Mensual
                </button>
              </div>

              <button
                onClick={() => {
                  const dataList = rendimientoPersonal[periodoRendimiento] || [];
                  const headers = ['Técnico', 'Atenciones Realizadas', 'Cuota Establecida', 'Cumplimiento %'];
                  const rows = dataList.map(t => [t.tecnico, t.atenciones, t.cuota, `${t.cumplimiento}%`]);
                  handleExportCSV(`rendimiento_tecnicos_${periodoRendimiento}`, rows, headers);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar
              </button>
            </div>
          </div>

          {/* Gráfica de Rendimiento */}
          <div className="bg-[#0f172a]/90 rounded-2xl border border-slate-800 p-5 shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Comparativa Visual · Período {periodoRendimiento.toUpperCase()}
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rendimientoPersonal[periodoRendimiento] || []} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="tecnico" tick={{ fontSize: 11, fill: '#94a3b8' }} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0b1329', borderColor: '#334155', borderRadius: 12, fontSize: 12, color: '#fff' }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="atenciones" name="Atenciones Ejecutadas" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="cuota" name="Cuota Objetivo" fill="#334155" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla de Rendimiento */}
          <div className="bg-[#0f172a]/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-[#070b14]">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Detalle Individual de Técnicos
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase font-sans">
                    <th className="py-3 px-4">Técnico</th>
                    <th className="py-3 px-4">Revisiones Realizadas</th>
                    <th className="py-3 px-4">Cuota Período</th>
                    <th className="py-3 px-4">Cumplimiento</th>
                    <th className="py-3 px-4">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {(rendimientoPersonal[periodoRendimiento] || []).map((t, idx) => {
                    const ok = t.cumplimiento >= 100;
                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-sans font-bold text-white">{t.tecnico}</td>
                        <td className="py-3 px-4 text-cyan-400 font-bold">{t.atenciones} buses</td>
                        <td className="py-3 px-4 text-slate-400">{t.cuota} buses</td>
                        <td className="py-3 px-4 font-bold">{t.cumplimiento}%</td>
                        <td className="py-3 px-4 font-sans">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            ok ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {ok ? 'Superada / Completa' : 'En Progreso'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SUB-REPORTE 3: ESTADO DE COMPONENTES E.E.
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'componentes' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0f172a]/90 p-4 rounded-2xl border border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Cpu className="h-4 w-4 text-indigo-400" />
                Reporte de Estado de Componentes Embarcados E.E.
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Salud de hardware: Módems, Bocinas, Firmware, Botones de Pánico y Tarjetas SIM
              </p>
            </div>
            <button
              onClick={() => {
                const headers = ['Componente', 'Unidades Operativas', 'Unidades con Falla', 'Total Inspeccionado', 'Tasa Salud %'];
                const rows = componentesEE.map(c => {
                  const total = c.operativos + c.fallas;
                  const ratio = total > 0 ? Math.round((c.operativos / total) * 100) : 100;
                  return [c.componente, c.operativos, c.fallas, total, `${ratio}%`];
                });
                handleExportCSV('reporte_componentes_ee_mibus', rows, headers);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV Componentes
            </button>
          </div>

          {/* Tarjetas de Salud de Componentes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {componentesEE.map((comp, idx) => {
              const total = comp.operativos + comp.fallas;
              const ratio = total > 0 ? Math.round((comp.operativos / total) * 100) : 100;
              return (
                <div key={idx} className="bg-[#0f172a]/90 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-white">{comp.componente}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{total} unidades en inventario</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      ratio >= 90 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {ratio}% OK
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${ratio}%` }} />
                    <div className="bg-rose-500 h-full" style={{ width: `${100 - ratio}%` }} />
                  </div>

                  <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                    <span className="text-emerald-400">Funciona: {comp.operativos}</span>
                    <span className="text-rose-400">Dañado/Falla: {comp.fallas}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SUB-REPORTE 4: INCIDENCIAS DE FLOTA (FALLAS RECURRENTES)
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'incidencias' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0f172a]/90 p-4 rounded-2xl border border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                Reporte de Incidencias Recurrentes de la Flota
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Identificación de buses que presentan fallas repetidas de transmisión GPS para intervención profunda
              </p>
            </div>
            <button
              onClick={() => {
                const headers = ['Bus Móvil', 'Total Fallas Recurrentes', 'Patio Asignado', 'Último Diagnóstico', 'Severidad'];
                const rows = incidenciasFlota.map(inc => [
                  inc.bus_movil,
                  inc.total_fallas,
                  inc.patio,
                  inc.ultimo_diagnostico,
                  inc.severidad
                ]);
                handleExportCSV('reporte_incidencias_recurrentes_flota', rows, headers);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV Incidencias
            </button>
          </div>

          <div className="bg-[#0f172a]/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-[#070b14]">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Ranking de Móviles con Mayor Frecuencia de Falla GPS
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="py-3 px-4">Móvil / Bus</th>
                    <th className="py-3 px-4">Frecuencia de Fallas</th>
                    <th className="py-3 px-4">Patio Principal</th>
                    <th className="py-3 px-4">Último Diagnóstico Registrado</th>
                    <th className="py-3 px-4">Nivel de Criticidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {incidenciasFlota.map((inc, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <Bus className="h-4 w-4 text-blue-400" />
                        <span>Bus #{inc.bus_movil}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-rose-400">
                        {inc.total_fallas} veces reportado
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{inc.patio}</td>
                      <td className="py-3.5 px-4 text-slate-400 max-w-[280px] truncate" title={inc.ultimo_diagnostico}>
                        {inc.ultimo_diagnostico}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          inc.severidad === 'Alta'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${inc.severidad === 'Alta' ? 'bg-rose-400' : 'bg-amber-400'}`} />
                          Prioridad {inc.severidad}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
