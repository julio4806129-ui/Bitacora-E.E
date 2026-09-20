import React, { useState, useMemo } from 'react';
import { normalizeList } from '../utils/apiNormalize';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import {
  Wrench,
  Plus,
  Search,
  Bus,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  X,
  History,
  Shield,
  Loader2,
  Check,
  RotateCcw,
  Building2,
  RefreshCw,
  Activity
} from 'lucide-react';
import clsx from 'clsx';
import PageHeader from '../components/PageHeader';
import KpiCard from '../components/KpiCard';

export default function UnidadesFueraServicioPage() {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('activas'); // 'activas' | 'historial'
  const [search, setSearch] = useState('');
  const [motivoFilter, setMotivoFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reactivarModal, setReactivarModal] = useState(null);

  // Consulta de unidades fuera de servicio
  const { data: unidades, isLoading } = useQuery({
    queryKey: ['unidades-fuera-servicio', tab, search, motivoFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tab === 'activas') params.append('estado', 'ACTIVO');
      else if (tab === 'historial') params.append('estado', 'CERRADO');
      if (search) params.append('bus_movil', search);
      if (motivoFilter) params.append('motivo', motivoFilter);

      const res = await apiClient.get(`/unidades-fuera-servicio/?${params.toString()}`);
      return normalizeList(res);
    }
  });

  // Mutación para reactivar a servicio
  const reactivarMut = useMutation({
    mutationFn: async (id) => apiClient.post(`/unidades-fuera-servicio/${id}/reactivar/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades-fuera-servicio'] });
      queryClient.invalidateQueries({ queryKey: ['bitacora-tabla'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setReactivarModal(null);
    }
  });

  const kpis = useMemo(() => ({
    activas:    unidades?.filter(u => u.estado === 'ACTIVO').length   || 0,
    cerradas:   unidades?.filter(u => u.estado === 'CERRADO').length  || 0,
    taller:     unidades?.filter(u => u.motivo === 'TALLER_MANTENIMIENTO').length || 0,
    accidente:  unidades?.filter(u => u.motivo === 'ACCIDENTE_SINIESTRO').length || 0,
  }), [unidades]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">

      {/* Page Header */}
      <PageHeader
        breadcrumb="EXCLUSIÓN DE MONITOREO & CICLO DE TALLER"
        icon={Wrench}
        title="Unidades Fuera de Servicio"
        badge="Taller & Siniestros"
        description="Buses excluidos de la generación automática de incidencias GPS y bitácora diaria mientras se encuentran en mantenimiento mecánico o reparación."
      >
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Marcar Fuera de Servicio</span>
        </button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label="Actualmente Fuera" value={kpis.activas}   sub="En exclusión activa"  icon={AlertTriangle} color="amber" loading={isLoading} accent />
        <KpiCard label="En Taller"         value={kpis.taller}   sub="Mantenimiento mec."   icon={Wrench}        color="rose"  loading={isLoading} accent />
        <KpiCard label="Accidentes"        value={kpis.accidente}sub="Siniestros activos"    icon={Shield}        color="violet"loading={isLoading} accent />
        <KpiCard label="Reactivadas"       value={kpis.cerradas} sub="Ciclo cerrado"         icon={CheckCircle2}  color="emerald"loading={isLoading} accent />
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex rounded-xl bg-[#0b1329]/90 p-1 border border-slate-800 self-start">
          <button
            onClick={() => setTab('activas')}
            className={clsx(
              'px-4 py-2 text-xs font-bold rounded-lg transition-all',
              tab === 'activas'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Fuera de Servicio ({kpis.activas})
          </button>
          <button
            onClick={() => setTab('historial')}
            className={clsx(
              'px-4 py-2 text-xs font-bold rounded-lg transition-all',
              tab === 'historial'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Historial de Reactivaciones
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por Bus #..."
              className="pl-9 pr-3 py-2 text-xs bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all w-44"
            />
          </div>

          <select
            value={motivoFilter}
            onChange={e => setMotivoFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-all cursor-pointer"
          >
            <option value="">Todos los Motivos</option>
            <option value="TALLER_MANTENIMIENTO">Taller de Mantenimiento</option>
            <option value="ACCIDENTE_SINIESTRO">Accidente / Siniestro</option>
            <option value="BAJA_TEMPORAL">Baja Temporal</option>
            <option value="PROCESO_LEGAL">Proceso Legal</option>
            <option value="OTRO">Otro Motivo</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl bg-[#0b1329]/90 border border-slate-800/70 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#070b14] border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                <th className="py-3 px-4 font-bold">Móvil</th>
                <th className="py-3 px-4 font-bold">Motivo de Exclusión</th>
                <th className="py-3 px-4 font-bold">Departamento Responsable</th>
                <th className="py-3 px-4 font-bold">Fecha Inicio</th>
                <th className="py-3 px-4 font-bold">Retorno Estimado</th>
                <th className="py-3 px-4 font-bold">Registrado Por</th>
                <th className="py-3 px-4 font-bold">Notas / Detalle</th>
                <th className="py-3 px-4 font-bold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
                    Cargando unidades fuera de servicio...
                  </td>
                </tr>
              ) : unidades?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    {tab === 'activas' 
                      ? 'No hay unidades marcadas fuera de servicio actualmente. Toda la flota está en ciclo activo.'
                      : 'No hay registros históricos de unidades reactivadas.'}
                  </td>
                </tr>
              ) : (
                unidades?.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Bus className="w-4 h-4" />
                      </div>
                      <span className="text-sm">Bus #{u.bus_movil}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full font-bold text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {u.motivo_display || u.motivo}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-medium flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{u.departamento_responsable || 'Taller Mecánico'}</span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      {new Date(u.fecha_inicio).toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      {u.fecha_fin_estimada ? (
                        <span className="text-cyan-300 font-semibold">{u.fecha_fin_estimada}</span>
                      ) : (
                        <span className="text-slate-500 italic">Por determinar</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {u.usuario_registro_nombre || 'Administrador'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate" title={u.notas}>
                      {u.notas || 'Sin notas registradas'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {u.estado === 'ACTIVO' ? (
                        <button
                          onClick={() => setReactivarModal(u)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reactivar a Servicio</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500">
                          Reactivado el {new Date(u.fecha_fin_real).toLocaleDateString('es-PA')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Marcar Unidad Fuera de Servicio */}
      {showCreateModal && (
        <CreateFueraServicioModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['unidades-fuera-servicio'] });
            queryClient.invalidateQueries({ queryKey: ['bitacora-tabla'] });
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Modal: Confirmación de Reactivación */}
      {reactivarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0b1329] rounded-2xl border border-slate-700 w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Reactivar Bus #{reactivarModal.bus_movil}</h3>
                <p className="text-xs text-slate-400">Reincorporación a monitoreo regular de telemetría</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              ¿Confirmas que el <strong>Bus #{reactivarModal.bus_movil}</strong> ha concluido sus trabajos en taller y está listo para volver al ciclo de monitoreo GPS y revisiones diarias?
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReactivarModal(null)}
                className="px-4 py-2 border border-slate-800 rounded-xl text-slate-400 hover:text-white text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={reactivarMut.isPending}
                onClick={() => reactivarMut.mutate(reactivarModal.id)}
                className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20"
              >
                {reactivarMut.isPending ? 'Reactivando...' : 'Sí, Reactivar a Servicio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponente: Modal para Marcar Fuera de Servicio
function CreateFueraServicioModal({ onClose, onCreated }) {
  const [busMovil, setBusMovil] = useState('');
  const [motivo, setMotivo] = useState('TALLER_MANTENIMIENTO');
  const [departamento, setDepartamento] = useState('Taller de Mantenimiento Mecánico');
  const [fechaEstimada, setFechaEstimada] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: async (payload) => apiClient.post('/unidades-fuera-servicio/', payload),
    onSuccess: () => onCreated(),
    onError: (err) => setError(err?.response?.data?.message || 'Error al registrar unidad fuera de servicio.')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!busMovil) {
      setError('Ingrese el número de bus.');
      return;
    }

    mut.mutate({
      bus_movil: parseInt(busMovil),
      motivo,
      departamento_responsable: departamento,
      fecha_fin_estimada: fechaEstimada || null,
      notas: notas.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b1329] rounded-2xl border border-slate-700 w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#070b14]">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>Marcar Unidad Fuera de Servicio</span>
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
            Esta unidad <strong>dejará de generar alarmas de No GPS</strong> y no aparecerá en la bandeja diaria de atención técnica mientras permanezca en taller.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Número de Móvil *</label>
              <input
                type="number"
                value={busMovil}
                onChange={e => setBusMovil(e.target.value)}
                placeholder="Ej. 1050"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Motivo de Exclusión *</label>
              <select
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
              >
                <option value="TALLER_MANTENIMIENTO">Taller Mecánico</option>
                <option value="ACCIDENTE_SINIESTRO">Accidente / Siniestro</option>
                <option value="BAJA_TEMPORAL">Baja Temporal / Repuestos</option>
                <option value="PROCESO_LEGAL">Proceso Legal / Retenido</option>
                <option value="OTRO">Otro Motivo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Departamento Responsable</label>
              <input
                type="text"
                value={departamento}
                onChange={e => setDepartamento(e.target.value)}
                placeholder="Ej. Taller Mecánico, Carrocería..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Fecha Estimada Regreso</label>
              <input
                type="date"
                value={fechaEstimada}
                onChange={e => setFechaEstimada(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Notas / Justificación</label>
            <textarea
              rows={3}
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Descripción de la avería mecánica, orden de trabajo, piezas en espera..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-rose-300 font-medium text-xs">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-800 rounded-xl text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mut.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 text-xs"
            >
              {mut.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...</>
              ) : (
                <><Check className="w-3.5 h-3.5" /> Marcar Fuera de Servicio</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
