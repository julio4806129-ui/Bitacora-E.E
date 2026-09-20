import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import {
  HardDrive,
  Plus,
  Search,
  Bus,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Clock,
  History,
  X,
  ArrowRightLeft,
  ChevronRight,
  Shield,
  Loader2,
  Check,
  Wifi,
  Smartphone,
  Radio,
  Package,
  Download,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import clsx from 'clsx';
import PageHeader from '../components/PageHeader';
import KpiCard from '../components/KpiCard';
import { getStatusBadge } from '../utils/tableUtils';

/* ─── Constantes ───────────────────────────────────────────────── */
const TIPOS_EQUIPO = [
  { value: '',        label: 'Todos los Tipos'           },
  { value: 'modem',   label: 'Módems 4G'                 },
  { value: 'ctap',    label: 'Consolas CTAP'             },
  { value: 'sim',     label: 'SIM Cards GPRS'            },
  { value: 'bocina',  label: 'Bocinas'                   },
  { value: 'boton',   label: 'Botones de Pánico'         },
  { value: 'otro',    label: 'Otros Componentes'         },
];

const ESTADOS_EQUIPO = [
  { value: '',           label: 'Todos los Estados'       },
  { value: 'INSTALADO',  label: 'Instalado en Móvil'      },
  { value: 'EN_STOCK',   label: 'En Stock / Almacén'      },
  { value: 'EN_TALLER',  label: 'En Taller / Reparación'  },
  { value: 'DE_BAJA',    label: 'Dado de Baja'            },
];

const PATIOS = [
  '', 'Curundú', 'Ojo de Agua', 'Los Pueblos', 'La Cabima', 'Chorrillo', 'La Doña', 'Relevo CA', 'Chorrillo'
];

const TIPO_ICONS = {
  'Módem 4G':       Wifi,
  'Consola CTAP':   Cpu,
  'SIM Card GPRS':  Smartphone,
  'Bocina Alerta':  Radio,
  'Botón de Pánico':Shield,
};

function getEquipoIcon(tipo) {
  const Icon = TIPO_ICONS[tipo] || HardDrive;
  return Icon;
}

/* ─── Componente principal ─────────────────────────────────────── */
export default function InventarioEquiposPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterPatio, setFilterPatio] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEquipoForMove, setSelectedEquipoForMove] = useState(null);
  const [selectedEquipoHistory, setSelectedEquipoHistory] = useState(null);

  /* Consulta de Activos */
  const { data: activos, isLoading, refetch } = useQuery({
    queryKey: ['activos-ee', search, filterTipo, filterEstado, filterPatio],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search)      params.append('q', search);
      if (filterTipo)  params.append('tipo', filterTipo);
      if (filterEstado)params.append('estado', filterEstado);
      if (filterPatio) params.append('patio', filterPatio);
      const res = await apiClient.get(`/activos-ee/?${params.toString()}`);
      return res.data?.results || res.data || [];
    }
  });

  /* KPIs calculados */
  const kpis = useMemo(() => {
    const total     = activos?.length || 0;
    const instalado = activos?.filter(a => a.estado === 'INSTALADO').length  || 0;
    const stock     = activos?.filter(a => a.estado === 'EN_STOCK').length   || 0;
    const taller    = activos?.filter(a => a.estado === 'EN_TALLER').length  || 0;
    const baja      = activos?.filter(a => a.estado === 'DE_BAJA').length    || 0;
    return { total, instalado, stock, taller, baja };
  }, [activos]);

  const filtered = useMemo(() => activos || [], [activos]);

  const handleExport = () => {
    const rows = [
      ['Tipo', 'IMEI', 'Serie', 'Marca/Modelo', 'Bus Asignado', 'Estado', 'Patio', 'Observaciones'],
      ...(activos || []).map(eq => [
        eq.tipo_nombre || '',
        eq.imei || '',
        eq.serie || '',
        eq.marca_modelo || '',
        eq.bus_asignado ? `Bus #${eq.bus_asignado}` : 'Sin asignar',
        eq.estado_display || eq.estado || '',
        eq.patio_ubicacion || '',
        eq.observaciones || '',
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario-equipos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto space-y-6 animate-fadeIn">

      {/* Cabecera */}
      <PageHeader
        breadcrumb="GESTIÓN DE HARDWARE & ACTIVOS FÍSICOS"
        icon={Cpu}
        title="Inventario de Equipos E.E."
        badge="IMEI & Series"
        description="Trazabilidad completa de módems 4G, consolas CTAP, tarjetas SIM y componentes asignados a la flota (+1,600 buses MiBus Panamá)."
      >
        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all"
          title="Actualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exportar CSV</span>
        </button>
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Registrar Equipo
          </button>
        )}
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <KpiCard label="Total Equipos" value={kpis.total} sub="En sistema" icon={HardDrive} color="cyan" loading={isLoading} accent />
        <KpiCard label="Instalados" value={kpis.instalado} sub="En buses activos" icon={CheckCircle2} color="emerald" loading={isLoading} accent />
        <KpiCard label="En Stock" value={kpis.stock} sub="Disponibles" icon={Package} color="blue" loading={isLoading} accent />
        <KpiCard label="En Taller" value={kpis.taller} sub="En reparación" icon={Wrench} color="amber" loading={isLoading} accent />
        <KpiCard label="De Baja" value={kpis.baja} sub="Descartados" icon={AlertTriangle} color="rose" loading={isLoading} accent />
      </div>

      {/* Filtros */}
      <div className="bg-[#0b1329]/90 border border-slate-800/70 rounded-2xl p-4 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Búsqueda */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="IMEI, Serie, Bus, Marca..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
            />
          </div>

          <select
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
          >
            {TIPOS_EQUIPO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <select
            value={filterEstado}
            onChange={e => setFilterEstado(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
          >
            {ESTADOS_EQUIPO.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>

          <select
            value={filterPatio}
            onChange={e => setFilterPatio(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
          >
            <option value="">Todos los Patios</option>
            {PATIOS.filter(Boolean).map(p => <option key={p} value={p}>Patio {p}</option>)}
          </select>
        </div>

        {/* Resultados count */}
        {!isLoading && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/60 text-[11px] text-slate-500">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>
              <strong className="text-slate-300">{filtered.length}</strong> equipos encontrados
              {(search || filterTipo || filterEstado || filterPatio) && (
                <button
                  onClick={() => { setSearch(''); setFilterTipo(''); setFilterEstado(''); setFilterPatio(''); }}
                  className="ml-3 text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-0.5 inline-flex"
                >
                  <X className="w-3 h-3" /> Limpiar filtros
                </button>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Tabla de Equipos */}
      <div className="rounded-2xl bg-[#0b1329]/90 border border-slate-800/70 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#070b14] border-b border-slate-800">
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono whitespace-nowrap">
                  Tipo de Equipo
                </th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono whitespace-nowrap">
                  Identificadores (IMEI / Serie)
                </th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono whitespace-nowrap">
                  Bus Asignado
                </th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono whitespace-nowrap text-center">
                  Estado
                </th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono whitespace-nowrap">
                  Patio / Ubicación
                </th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono whitespace-nowrap">
                  Marca / Modelo
                </th>
                {isAdmin && (
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono whitespace-nowrap text-right">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-16 text-center">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-cyan-400 mb-2" />
                    <p className="text-slate-400 text-xs">Cargando inventario de equipos...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-16 text-center">
                    <HardDrive className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="text-slate-400 text-sm font-medium">No se encontraron equipos</p>
                    <p className="text-slate-600 text-xs mt-1">Prueba con otros filtros o registra un nuevo equipo.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((eq) => {
                  const EqIcon = getEquipoIcon(eq.tipo_nombre);
                  const status = getStatusBadge(eq.estado);
                  return (
                    <tr key={eq.id} className="hover:bg-slate-800/25 transition-colors group">
                      {/* Tipo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                            <EqIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-semibold text-white text-xs whitespace-nowrap">
                            {eq.tipo_nombre || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Identificadores */}
                      <td className="py-3.5 px-4 font-mono">
                        {eq.imei ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 font-sans">IMEI</span>
                            <span className="text-cyan-300 font-bold text-xs tracking-wider">{eq.imei}</span>
                          </div>
                        ) : null}
                        {eq.serie ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-500 font-sans">SN</span>
                            <span className="text-slate-200 font-semibold text-xs">{eq.serie}</span>
                          </div>
                        ) : null}
                        {!eq.imei && !eq.serie && (
                          <span className="text-slate-600 italic text-[11px]">Sin ID registrado</span>
                        )}
                      </td>

                      {/* Bus Asignado */}
                      <td className="py-3.5 px-4">
                        {eq.bus_asignado ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-xs">
                            <Bus className="w-3.5 h-3.5 shrink-0" />
                            Bus #{eq.bus_asignado}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Sin asignar</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={clsx(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider border',
                          status.cls
                        )}>
                          {status.text}
                        </span>
                      </td>

                      {/* Patio */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-300 text-xs">
                          {eq.patio_ubicacion || <span className="text-slate-600 italic">Sin patio</span>}
                        </span>
                      </td>

                      {/* Marca/Modelo */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-400 font-mono text-[11px]">
                          {eq.marca_modelo || <span className="text-slate-600 italic">Genérico</span>}
                        </span>
                      </td>

                      {/* Acciones */}
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setSelectedEquipoForMove(eq)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/40 text-slate-300 hover:text-white text-[11px] font-semibold transition-all"
                              title="Asignar o mover de móvil"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              Mover
                            </button>
                            <button
                              onClick={() => setSelectedEquipoHistory(eq)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-cyan-300 transition-all"
                              title="Ver historial de movimientos"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer de tabla */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-800/60 bg-[#070b14]/50 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-mono">
              {filtered.length} registros · Actualizado: {new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={handleExport}
              className="text-cyan-500 hover:text-cyan-300 font-semibold transition-colors flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Exportar CSV
            </button>
          </div>
        )}
      </div>

      {/* Modales */}
      {showCreateModal && (
        <CreateEquipoModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['activos-ee'] });
            setShowCreateModal(false);
          }}
        />
      )}
      {selectedEquipoForMove && (
        <MoveEquipoModal
          equipo={selectedEquipoForMove}
          onClose={() => setSelectedEquipoForMove(null)}
          onMoved={() => {
            queryClient.invalidateQueries({ queryKey: ['activos-ee'] });
            setSelectedEquipoForMove(null);
          }}
        />
      )}
      {selectedEquipoHistory && (
        <EquipoHistoryModal
          equipo={selectedEquipoHistory}
          onClose={() => setSelectedEquipoHistory(null)}
        />
      )}
    </div>
  );
}

/* ─── Modal: Registrar Equipo ──────────────────────────────────── */
function CreateEquipoModal({ onClose, onCreated }) {
  const [tipoNombre,    setTipoNombre]    = useState('Módem 4G');
  const [marcaModelo,   setMarcaModelo]   = useState('');
  const [serie,         setSerie]         = useState('');
  const [imei,          setImei]          = useState('');
  const [busAsignado,   setBusAsignado]   = useState('');
  const [patio,         setPatio]         = useState('Curundú');
  const [estado,        setEstado]        = useState('EN_STOCK');
  const [observaciones, setObservaciones] = useState('');
  const [error,         setError]         = useState('');

  const mut = useMutation({
    mutationFn: async (payload) => apiClient.post('/activos-ee/', payload),
    onSuccess: () => onCreated(),
    onError: (err) => setError(err?.response?.data?.message || err?.response?.data?.detail || 'Error al guardar equipo.')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!serie.trim() && !imei.trim()) {
      setError('Debe ingresar al menos un número de serie o IMEI.');
      return;
    }
    setError('');
    mut.mutate({
      tipo_nombre:    tipoNombre,
      marca_modelo:   marcaModelo.trim(),
      serie:          serie.trim(),
      imei:           imei.trim(),
      bus_asignado:   busAsignado ? parseInt(busAsignado) : null,
      patio_ubicacion: patio,
      estado:         busAsignado ? 'INSTALADO' : estado,
      observaciones:  observaciones.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b1329] rounded-2xl border border-slate-700 w-full max-w-lg overflow-hidden shadow-2xl ring-1 ring-white/5">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-[#070b14] to-[#0d1526]">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <HardDrive className="w-4 h-4" />
            </div>
            Registrar Nuevo Equipo E.E.
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Tipo */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
              Tipo de Componente *
            </label>
            <select
              value={tipoNombre}
              onChange={e => setTipoNombre(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
            >
              <option value="Módem 4G">Módem 4G / Telemetría</option>
              <option value="Consola CTAP">Consola CTAP</option>
              <option value="SIM Card GPRS">SIM Card GPRS</option>
              <option value="Bocina Alerta">Bocina Alerta</option>
              <option value="Botón de Pánico">Botón de Pánico</option>
              <option value="Radio Base">Radio Base</option>
              <option value="Otro Componente">Otro Componente</option>
            </select>
          </div>

          {/* IMEI + Serie */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
                Número de Serie
              </label>
              <input
                type="text"
                value={serie}
                onChange={e => setSerie(e.target.value)}
                placeholder="Ej. SN-MDM-994"
                className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all placeholder-slate-600"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
                IMEI (Módem/Celular)
              </label>
              <input
                type="text"
                value={imei}
                onChange={e => setImei(e.target.value)}
                placeholder="Ej. 864209040010503"
                className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all placeholder-slate-600"
              />
            </div>
          </div>

          {/* Bus + Patio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
                Móvil Asignado <span className="text-slate-600 normal-case">(opcional)</span>
              </label>
              <input
                type="number"
                value={busAsignado}
                onChange={e => setBusAsignado(e.target.value)}
                placeholder="Ej. 1050"
                className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all placeholder-slate-600"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
                Patio / Ubicación
              </label>
              <select
                value={patio}
                onChange={e => setPatio(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
              >
                <option value="Curundú">Patio Curundú</option>
                <option value="Ojo de Agua">Patio Ojo de Agua</option>
                <option value="Los Pueblos">Patio Los Pueblos</option>
                <option value="La Cabima">Patio La Cabima</option>
                <option value="Chorrillo">Patio Chorrillo</option>
                <option value="La Doña">Patio La Doña</option>
                <option value="Relevo CA">Patio Relevo CA</option>
              </select>
            </div>
          </div>

          {/* Estado (solo si no tiene bus) */}
          {!busAsignado && (
            <div>
              <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
                Estado Inicial
              </label>
              <select
                value={estado}
                onChange={e => setEstado(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
              >
                <option value="EN_STOCK">En Stock / Almacén</option>
                <option value="EN_TALLER">En Taller / Reparación</option>
                <option value="DE_BAJA">Dado de Baja</option>
              </select>
            </div>
          )}

          {/* Marca/Modelo */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
              Marca / Modelo
            </label>
            <input
              type="text"
              value={marcaModelo}
              onChange={e => setMarcaModelo(e.target.value)}
              placeholder="Ej. Teltonika FMB640, BUSAE CTAP v3"
              className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all placeholder-slate-600"
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
              Observaciones
            </label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Procedencia, lote, condición física, garantía..."
              className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all resize-none placeholder-slate-600"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-rose-300 font-medium">{error}</p>
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mut.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 text-xs"
            >
              {mut.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...</>
              ) : (
                <><Check className="w-3.5 h-3.5" /> Guardar Equipo</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal: Mover / Asignar Equipo ───────────────────────────── */
function MoveEquipoModal({ equipo, onClose, onMoved }) {
  const [nuevoBus,    setNuevoBus]    = useState(equipo.bus_asignado || '');
  const [nuevoEstado, setNuevoEstado] = useState(equipo.estado || 'INSTALADO');
  const [motivo,      setMotivo]      = useState('Reasignación técnica');
  const [notas,       setNotas]       = useState('');

  const mutAsignar = useMutation({
    mutationFn: async (payload) => apiClient.post(`/activos-ee/${equipo.id}/asignar_movil/`, payload),
    onSuccess: () => onMoved()
  });
  const mutDesasignar = useMutation({
    mutationFn: async (payload) => apiClient.post(`/activos-ee/${equipo.id}/desasignar/`, payload),
    onSuccess: () => onMoved()
  });

  const isPending = mutAsignar.isPending || mutDesasignar.isPending;

  const handleAction = (e) => {
    e.preventDefault();
    if (nuevoEstado === 'INSTALADO') {
      if (!nuevoBus) return;
      mutAsignar.mutate({ bus_movil: parseInt(nuevoBus), motivo, notas });
    } else {
      mutDesasignar.mutate({ estado: nuevoEstado, motivo, notas });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b1329] rounded-2xl border border-slate-700 w-full max-w-md overflow-hidden shadow-2xl ring-1 ring-white/5">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-[#070b14] to-[#0d1526]">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            Mover / Reasignar Equipo
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleAction} className="p-6 space-y-4 text-xs">
          {/* Info del equipo */}
          <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1.5">
            <p className="text-slate-400">
              Tipo: <strong className="text-white">{equipo.tipo_nombre}</strong>
            </p>
            {equipo.imei && (
              <p className="text-slate-400 font-mono">
                IMEI: <strong className="text-cyan-300">{equipo.imei}</strong>
              </p>
            )}
            {equipo.serie && (
              <p className="text-slate-400 font-mono">
                Serie: <strong className="text-slate-200">{equipo.serie}</strong>
              </p>
            )}
            <p className="text-slate-400">
              Ubicación actual:{' '}
              <strong className="text-white">
                {equipo.bus_asignado ? `Bus #${equipo.bus_asignado}` : 'En almacén / Sin asignar'}
              </strong>
            </p>
          </div>

          {/* Destino */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
              Destino del Equipo *
            </label>
            <select
              value={nuevoEstado}
              onChange={e => setNuevoEstado(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
            >
              <option value="INSTALADO">Instalar en Móvil</option>
              <option value="EN_STOCK">Enviar a Stock / Almacén</option>
              <option value="EN_TALLER">Enviar a Taller / Reparación</option>
              <option value="DE_BAJA">Dar de Baja / Descartar</option>
            </select>
          </div>

          {nuevoEstado === 'INSTALADO' && (
            <div>
              <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
                Número de Móvil Destino *
              </label>
              <input
                type="number"
                value={nuevoBus}
                onChange={e => setNuevoBus(e.target.value)}
                placeholder="Ej. 1080"
                className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-cyan-500 transition-all placeholder-slate-600"
                required
              />
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
              Motivo del Movimiento *
            </label>
            <input
              type="text"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej. Reemplazo de módem dañado en Bus #1050"
              className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition-all placeholder-slate-600"
              required
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
              Notas Adicionales
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Condición física, técnico responsable, fecha estimada..."
              className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition-all resize-none placeholder-slate-600"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 text-xs"
            >
              {isPending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Procesando...</>
              ) : (
                <><Check className="w-3.5 h-3.5" /> Confirmar Movimiento</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal: Historial de Movimientos ──────────────────────────── */
function EquipoHistoryModal({ equipo, onClose }) {
  const movimientos = equipo.movimientos || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b1329] rounded-2xl border border-slate-700 w-full max-w-lg overflow-hidden shadow-2xl ring-1 ring-white/5 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-[#070b14] to-[#0d1526] shrink-0">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <History className="w-4 h-4" />
            </div>
            <span>Historial: <span className="text-cyan-300">{equipo.tipo_nombre}</span></span>
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Identificadores del equipo */}
        <div className="px-6 py-3 border-b border-slate-800/60 bg-slate-900/30 shrink-0">
          <div className="flex flex-wrap gap-3 text-[11px] font-mono">
            {equipo.imei && (
              <span className="text-slate-400">IMEI: <span className="text-cyan-300 font-bold">{equipo.imei}</span></span>
            )}
            {equipo.serie && (
              <span className="text-slate-400">SN: <span className="text-slate-200 font-semibold">{equipo.serie}</span></span>
            )}
            {equipo.marca_modelo && (
              <span className="text-slate-400">Modelo: <span className="text-slate-300">{equipo.marca_modelo}</span></span>
            )}
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {movimientos.length === 0 ? (
            <div className="text-center py-10">
              <Clock className="w-8 h-8 mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm font-medium">Sin historial de movimientos</p>
              <p className="text-slate-600 text-xs mt-1">Los movimientos registrados aparecerán aquí.</p>
            </div>
          ) : (
            movimientos.map((m, idx) => (
              <div
                key={m.id || idx}
                className="relative pl-5 pb-3"
              >
                {/* Timeline line */}
                {idx < movimientos.length - 1 && (
                  <div className="absolute left-1.5 top-3 bottom-0 w-px bg-slate-800" />
                )}
                {/* Timeline dot */}
                <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-cyan-500/30 border border-cyan-500/50 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                </div>

                <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-mono">{new Date(m.timestamp).toLocaleString('es-PA')}</span>
                    <span className="font-semibold text-slate-300">{m.tecnico_nombre || 'Sistema'}</span>
                  </div>
                  <p className="font-bold text-cyan-300">{m.motivo}</p>
                  <p className="text-slate-400 text-[11px]">
                    <span className="text-slate-500">{m.bus_anterior ? `Bus #${m.bus_anterior}` : 'Almacén'}</span>
                    {' → '}
                    <strong className="text-emerald-400">
                      {m.bus_nuevo ? `Bus #${m.bus_nuevo}` : m.estado_nuevo || 'Almacén'}
                    </strong>
                  </p>
                  {m.notas && (
                    <p className="text-slate-500 italic text-[11px] border-t border-slate-800 pt-1 mt-1">
                      {m.notas}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
