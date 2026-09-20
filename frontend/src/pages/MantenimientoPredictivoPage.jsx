import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import {
  Activity,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Bus,
  Cpu,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Loader2,
  Check
} from 'lucide-react';
import clsx from 'clsx';
import DynamicMaintenanceFormModal from '../components/DynamicMaintenanceFormModal';

export default function MantenimientoPredictivoPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [selectedBusForMaintenance, setSelectedBusForMaintenance] = useState(null);

  // Consulta de KPIs predictivos
  const { data: kpis } = useQuery({
    queryKey: ['predictivo-kpis'],
    queryFn: async () => {
      const res = await apiClient.get('/planes-mantenimiento/kpis/');
      return res.data || { total_planes: 0, al_dia: 0, proximos_15_dias: 0, vencidos: 0, salud_flota_pct: 100 };
    }
  });

  // Consulta de planes preventivos
  const { data: planes, isLoading } = useQuery({
    queryKey: ['planes-mantenimiento', search, filterEstado],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('bus_movil', search);
      if (filterEstado) params.append('estado', filterEstado);

      const res = await apiClient.get(`/planes-mantenimiento/?${params.toString()}`);
      return res.data?.results || res.data || [];
    }
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs mb-1">
            <Activity className="w-4 h-4" />
            <span>MANTENIMIENTO PREDICTIVO & PREVENTIVO E.E.</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Ciclos de Vida & Alertas Preventivas</span>
            <span className="text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
              Geotab/AttriX Style
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitoreo preventivo por componente embarcado (Módems, CTAP, Bocinas, Cableado) con alertas antes de falla en vía.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0b1329] border border-slate-800 shadow-lg">
          <p className="text-xs text-slate-400 font-semibold">Salud Predictiva Flota</p>
          <p className="text-2xl font-black text-white mt-1">{kpis?.salud_flota_pct ?? 100}%</p>
          <span className="text-[10px] text-cyan-400 font-mono">Componentes al día</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1329] border border-emerald-500/30 shadow-lg">
          <p className="text-xs text-emerald-400 font-semibold">Ciclos al Día</p>
          <p className="text-2xl font-black text-white mt-1">{kpis?.al_dia ?? 0}</p>
          <span className="text-[10px] text-emerald-400 font-mono">Sin acción inmediata</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1329] border border-amber-500/30 shadow-lg">
          <p className="text-xs text-amber-400 font-semibold">Próximos a Vencer (&lt;15 días)</p>
          <p className="text-2xl font-black text-white mt-1">{kpis?.proximos_15_dias ?? 0}</p>
          <span className="text-[10px] text-amber-400 font-mono">Ventana de servicio preventivo</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1329] border border-rose-500/30 shadow-lg">
          <p className="text-xs text-rose-400 font-semibold">Mantenimientos Vencidos</p>
          <p className="text-2xl font-black text-white mt-1">{kpis?.vencidos ?? 0}</p>
          <span className="text-[10px] text-rose-400 font-mono">Prioridad técnica de turno</span>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="p-4 rounded-2xl bg-[#0b1329] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por Bus #..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={filterEstado}
            onChange={e => setFilterEstado(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="">Todos los Estados</option>
            <option value="AL_DIA">Al Día</option>
            <option value="PROXIMO">Próximos a Vencer</option>
            <option value="VENCIDO">Vencidos</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Corte operativo: Turnos diarios 08:00 AM
        </span>
      </div>

      {/* Plans Table */}
      <div className="rounded-2xl bg-[#0b1329] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#070b14] border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                <th className="py-3 px-4 font-bold">Móvil</th>
                <th className="py-3 px-4 font-bold">Componente E.E.</th>
                <th className="py-3 px-4 font-bold">Ciclo Preventivo</th>
                <th className="py-3 px-4 font-bold">Último Mantenimiento</th>
                <th className="py-3 px-4 font-bold">Próximo Vencimiento</th>
                <th className="py-3 px-4 font-bold">Estado Semáforo</th>
                <th className="py-3 px-4 font-bold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
                    Cargando planes preventivos...
                  </td>
                </tr>
              ) : planes?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No se registran planes preventivos pendientes con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                planes?.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                        <Bus className="w-4 h-4" />
                      </div>
                      <span>Bus #{p.bus_movil}</span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-white">
                      {p.componente_nombre}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      Cada {p.ciclo_dias} días
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {p.fecha_ultimo_mantenimiento || 'Inicial'}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className={clsx(
                        p.estado === 'VENCIDO' ? 'text-rose-400' : p.estado === 'PROXIMO' ? 'text-amber-400' : 'text-slate-300'
                      )}>
                        {p.fecha_proximo_vencimiento}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={clsx(
                        'px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1 border',
                        p.estado === 'AL_DIA' && 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                        p.estado === 'PROXIMO' && 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                        p.estado === 'VENCIDO' && 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      )}>
                        {p.estado_display || p.estado}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedBusForMaintenance({ bus: p.bus_movil, patio_ubicacion: 'CURUNDU' })}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        Atender Preventivo
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Attention Modal */}
      {selectedBusForMaintenance && (
        <DynamicMaintenanceFormModal
          bus={selectedBusForMaintenance}
          source="mantenimiento"
          onClose={() => {
            queryClient.invalidateQueries({ queryKey: ['planes-mantenimiento'] });
            queryClient.invalidateQueries({ queryKey: ['predictivo-kpis'] });
            setSelectedBusForMaintenance(null);
          }}
        />
      )}
    </div>
  );
}
