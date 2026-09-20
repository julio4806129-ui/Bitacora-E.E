import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import { 
  Radio, 
  Phone, 
  PhoneOff, 
  Search, 
  RefreshCw, 
  MapPin, 
  Bus, 
  Navigation, 
  Activity,
  Gauge,
  ChevronLeft,
  ChevronRight,
  Columns,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { formatBusNumber, nextSort } from '../utils/busNumber';
import SortableTh from '../components/SortableTh';

const DEFAULT_COLUMNS_BUSAE = [
  { key: 'bus_movil', label: 'Móvil', visible: true, width: 'w-20', align: 'left', source: 'busae' },
  { key: 'estado', label: 'Estado Transmisión', visible: true, width: 'w-36', align: 'left', source: 'busae' },
  { key: 'fecha_hora_gps', label: 'Último Reporte Satelital', visible: true, width: 'w-40', align: 'left', source: 'busae' },
  { key: 'velocidad', label: 'Velocidad (km/h)', visible: true, width: 'w-28', align: 'right', source: 'busae' },
  { key: 'odometro', label: 'Odómetro', visible: true, width: 'w-28', align: 'right', source: 'busae' },
  { key: 'latitud', label: 'Latitud', visible: true, width: 'w-28', align: 'left', source: 'busae' },
  { key: 'longitud', label: 'Longitud', visible: true, width: 'w-28', align: 'left', source: 'busae' },
  { key: 'manos_libres', label: 'Manos Libres', visible: true, width: 'w-28', align: 'center', source: 'busae' },
];

async function fetchTableConfig(module) {
  try {
    const res = await apiClient.get(`/configuracion/distribucion-tabla/${module}/`);
    return res?.columnas || DEFAULT_COLUMNS_BUSAE;
  } catch {
    return DEFAULT_COLUMNS_BUSAE;
  }
}

export default function BusaePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [tableColumns, setTableColumns] = useState(null);
  const [columnsLoading, setColumnsLoading] = useState(true);
  const [sortKey, setSortKey] = useState('bus_movil');
  const [sortDir, setSortDir] = useState('asc');

  const queryParams = {
    page,
    page_size: pageSize === 'all' ? 2000 : pageSize,
    search: searchTerm,
    estado: estadoFilter,
    ordering: sortDir === 'desc' ? `-${sortKey}` : sortKey,
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['datos-busae', queryParams],
    queryFn: async () => {
      const res = await apiClient.get('/datos-busae/', { params: queryParams });
      return res;
    },
    refetchInterval: 30000,
  });

  const busaeList = data?.results || (Array.isArray(data) ? data : []);
  const totalCount = data?.count || busaeList.length;
  const totalPages = data?.total_pages || Math.max(1, Math.ceil(totalCount / (pageSize === 'all' ? 2000 : pageSize)));

  useEffect(() => {
    fetchTableConfig('busae').then(cols => {
      setTableColumns(cols);
      setColumnsLoading(false);
    });
  }, []);

  const visibleColumns = useMemo(() => {
    if (!tableColumns || columnsLoading) return DEFAULT_COLUMNS_BUSAE;
    return tableColumns.filter(c => c.visible);
  }, [tableColumns, columnsLoading]);

  const getAlignClass = (align) => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return '';
    }
  };

  const renderCell = (row, col) => {
    const alignClass = getAlignClass(col.align);
    const est = (row.estado || '').toLowerCase();
    const isOnline = est === 'active' || est === 'on' || est === 'online';
    const isStopped = est === 'stopped';

    switch (col.key) {
      case 'bus_movil':
        return (
          <td key={col.key} className={`py-3.5 px-4 font-sans font-bold text-white flex items-center gap-2 ${alignClass} ${col.width}`}>
            <Bus className="h-4 w-4 text-blue-400" />
            <span className="font-mono tabular-nums">{formatBusNumber(row.bus_movil)}</span>
          </td>
        );
      case 'estado':
        return (
          <td key={col.key} className={`py-3.5 px-4 font-sans ${alignClass} ${col.width}`}>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : isStopped
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                isOnline ? 'bg-emerald-400 animate-pulse' : isStopped ? 'bg-amber-400' : 'bg-rose-400'
              }`} />
              {row.estado || 'No records'}
            </span>
          </td>
        );
      case 'fecha_hora_gps':
        return <td key={col.key} className={`py-3.5 px-4 text-slate-400 ${alignClass} ${col.width}`}>{row.ultima_transmision ? new Date(row.ultima_transmision).toLocaleTimeString('es-PA') : '—'}</td>;
      case 'velocidad':
        return (
          <td key={col.key} className={`py-3.5 px-4 text-cyan-400 font-bold ${alignClass} ${col.width}`}>
            <div className="flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5 text-slate-500" />
              <span>{row.velocidad ?? 0} km/h</span>
            </div>
          </td>
        );
      case 'odometro':
        return <td key={col.key} className={`py-3.5 px-4 font-mono text-slate-300 ${alignClass} ${col.width}`}>{row.odometro ?? '—'}</td>;
      case 'latitud':
        return <td key={col.key} className={`py-3.5 px-4 text-slate-300 ${alignClass} ${col.width}`}>{row.latitud ? Number(row.latitud).toFixed(5) : '—'}</td>;
      case 'longitud':
        return <td key={col.key} className={`py-3.5 px-4 text-slate-300 ${alignClass} ${col.width}`}>{row.longitud ? Number(row.longitud).toFixed(5) : '—'}</td>;
      case 'manos_libres':
        return (
          <td key={col.key} className={`py-3.5 px-4 font-sans ${alignClass} ${col.width}`}>
            {row.manos_libres ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[10px]">
                <Phone className="h-3 w-3" /> Conectado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-500 text-[10px]">
                <PhoneOff className="h-3 w-3" /> Desconectado
              </span>
            )}
          </td>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {showColumnConfig && tableColumns && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" onClick={() => setShowColumnConfig(false)}>
          <div className="bg-[#0b1329] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto border-slate-700/80 ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Columns className="h-5 w-5 text-cyan-400" /> Diseñador de Columnas · BUSAE</h3>
              <button onClick={() => setShowColumnConfig(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              {tableColumns.map((col, idx) => (
                <div key={col.key} className={`p-3 rounded-xl border ${!col.visible ? 'opacity-50 bg-slate-900/50' : 'bg-[#070b14]/70'} border-slate-800`}>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer shrink-0">
                      <input type="checkbox" checked={col.visible} onChange={e => setTableColumns(prev => prev.map(c => c.key === col.key ? {...c, visible: e.target.checked} : c))} className="h-4 w-4 rounded bg-slate-800 border-slate-700 text-cyan-500" />
                      <Eye className="h-3.5 w-3.5 text-slate-400" />
                    </label>
                    <input type="text" value={col.label} onChange={e => setTableColumns(prev => prev.map(c => c.key === col.key ? {...c, label: e.target.value} : c))} className="text-xs bg-[#070b14] border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-cyan-500 min-w-[120px]" />
                    <span className="text-[10px] font-mono text-slate-500 px-2 py-1 bg-slate-900 rounded border border-slate-800">{col.source}</span>
                    <select value={col.width} onChange={e => setTableColumns(prev => prev.map(c => c.key === col.key ? {...c, width: e.target.value} : c))} className="text-[10px] bg-[#070b14] border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-cyan-500">
                      <option value="w-16">Muy compacto</option>
                      <option value="w-20">Compacto</option>
                      <option value="w-24">Normal</option>
                      <option value="w-32">Ancho</option>
                      <option value="w-40">Muy ancho</option>
                    </select>
                    <select value={col.align} onChange={e => setTableColumns(prev => prev.map(c => c.key === col.key ? {...c, align: e.target.value} : c))} className="text-[10px] bg-[#070b14] border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-cyan-500">
                      <option value="left">Izquierda</option>
                      <option value="center">Centro</option>
                      <option value="right">Derecha</option>
                    </select>
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button onClick={() => apiClient.post('/configuracion/distribucion-tabla/busae/', {columnas: tableColumns}).then(() => setShowColumnConfig(false))} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0f172a]/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
            <Radio className="h-5 w-5 text-slate-400" />
            Transmisión GPS en vivo
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {totalCount.toLocaleString()} unidades · BUSAE
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button onClick={() => refetch()} disabled={isFetching} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors" title="Refrescar datos">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-rose-400' : ''}`} />
          </button>
          <button onClick={() => setShowColumnConfig(true)} disabled={columnsLoading} className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-900/80 hover:bg-slate-800 rounded-xl transition-all shadow-sm">
            <Columns className="w-4 h-4 text-cyan-400" /> Columnas
          </button>
        </div>
      </div>

      {/* ── FILTROS Y SELECTOR DE CANTIDAD ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#0f172a]/90 p-4 rounded-2xl border border-slate-800">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar móvil (806, 0806), estado o teléfono..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-3 py-2 bg-[#0b1329] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div>
          <select
            value={estadoFilter}
            onChange={(e) => { setEstadoFilter(e.target.value); setPage(1); }}
            className="w-full py-2 px-3 bg-[#0b1329] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
          >
            <option value="">Todos los Estados GPS</option>
            <option value="ON">ON / Transmitiendo</option>
            <option value="OFF">OFF / Sin transmisión</option>
            <option value="Active">Active / En Movimiento</option>
            <option value="Stopped">Stopped / Detenido</option>
            <option value="No records">No records / Sin Señal</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 whitespace-nowrap">Ver por pág:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
              setPageSize(val);
              setPage(1);
            }}
            className="w-full py-2 px-2 bg-[#0b1329] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
          >
            <option value={25}>25 buses</option>
            <option value={50}>50 buses</option>
            <option value={100}>100 buses</option>
            <option value={250}>250 buses</option>
            <option value="all">Todos ({totalCount})</option>
          </select>
        </div>
      </div>

      {/* ── TABLA TELEMETRÍA BUSAE ── */}
      <div className="bg-[#0f172a]/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#070b14] border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {visibleColumns.map(col => (
                  <SortableTh
                    key={col.key}
                    label={col.label}
                    column={col.key === 'fecha_hora_gps' ? 'ultima_transmision' : col.key}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={(column) => {
                      const next = nextSort(sortKey, sortDir, column);
                      setSortKey(next.key);
                      setSortDir(next.dir);
                      setPage(1);
                    }}
                    className={`py-3.5 px-4 ${getAlignClass(col.align)} ${col.width}`}
                  />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="py-12 text-center text-slate-500">
                    Cargando telemetría de buses BUSAE...
                  </td>
                </tr>
              ) : busaeList.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="py-12 text-center text-slate-500">
                    No se encontraron registros de telemetría BUSAE.
                  </td>
                </tr>
              ) : (
                busaeList.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    {visibleColumns.map(col => renderCell(row, col))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINACIÓN ── */}
        {!isLoading && totalPages > 1 && (
          <div className="bg-[#070b14] border-t border-slate-800 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <p className="text-slate-400">
              Mostrando <span className="font-semibold text-white">{((page - 1) * (pageSize === 'all' ? totalCount : pageSize)) + 1} - {Math.min(page * (pageSize === 'all' ? totalCount : pageSize), totalCount)}</span> de <span className="font-semibold text-rose-400">{totalCount.toLocaleString()}</span> buses
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none"
              >
                Primero
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1 font-mono text-rose-400 font-bold bg-slate-900 border border-slate-800 rounded-lg">
                Pág {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none"
              >
                Último
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
