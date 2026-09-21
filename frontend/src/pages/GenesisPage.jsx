import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import { 
  Database, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Bus, 
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Columns,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { formatBusNumber, nextSort } from '../utils/busNumber';
import SortableTh from '../components/SortableTh';

const DEFAULT_COLUMNS_GENESIS = [
  { key: 'bus_movil', label: 'Móvil', visible: true, width: 'w-20', align: 'left', source: 'genesis' },
  { key: 'origen', label: 'Ruta / Origen', visible: true, width: 'w-36', align: 'left', source: 'genesis' },
  { key: 'destino', label: 'Destino', visible: true, width: 'w-36', align: 'left', source: 'genesis' },
  { key: 'hora_entrada', label: 'Hora Entrada', visible: true, width: 'w-32', align: 'left', source: 'genesis' },
  { key: 'hora_salida', label: 'Hora Salida', visible: true, width: 'w-32', align: 'left', source: 'genesis' },
  { key: 'patio_ubicacion', label: 'Patio Asignado', visible: true, width: 'w-36', align: 'left', source: 'genesis' },
  { key: 'operador', label: 'Conductor / Operador', visible: true, width: 'w-40', align: 'left', source: 'genesis' },
  { key: 'estado', label: 'Estado Bus', visible: true, width: 'w-32', align: 'center', source: 'genesis' },
];

async function fetchTableConfig(module) {
  try {
    const res = await apiClient.get(`/configuracion/distribucion-tabla/${module}/`);
    return res?.columnas || DEFAULT_COLUMNS_GENESIS;
  } catch {
    return DEFAULT_COLUMNS_GENESIS;
  }
}

export default function GenesisPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatio, setSelectedPatio] = useState('');
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
    patio_ubicacion: selectedPatio,
    ordering: sortDir === 'desc' ? `-${sortKey}` : sortKey,
  };

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
  queryKey: ['datos-genesis', queryParams],
  queryFn: async () => {
    const res = await apiClient.get('/datos-genesis/', { params: queryParams });
    return res;
  },
  staleTime: 20_000,
  refetchInterval: 30_000,  // cada 30 s
  refetchIntervalInBackground: false,
});

  const genesisList = data?.results || (Array.isArray(data) ? data : []);
  const totalCount = data?.count || genesisList.length;
  const totalPages = data?.total_pages || Math.max(1, Math.ceil(totalCount / (pageSize === 'all' ? 2000 : pageSize)));

  useEffect(() => {
    fetchTableConfig('genesis').then(cols => {
      setTableColumns(cols);
      setColumnsLoading(false);
    });
  }, []);

  const visibleColumns = useMemo(() => {
    if (!tableColumns || columnsLoading) return DEFAULT_COLUMNS_GENESIS;
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
    switch (col.key) {
      case 'bus_movil':
        return (
          <td key={col.key} className={`py-3.5 px-4 font-bold text-white flex items-center gap-2 ${alignClass} ${col.width}`}>
            <Bus className="h-4 w-4 text-blue-400" />
            <span className="font-mono tabular-nums">{formatBusNumber(row.bus_movil)}</span>
          </td>
        );
      case 'origen':
        return <td key={col.key} className={`py-3.5 px-4 ${alignClass} ${col.width}`}><span className="font-semibold text-white">{row.origen || 'Ruta'}</span></td>;
      case 'destino':
        return <td key={col.key} className={`py-3.5 px-4 ${alignClass} ${col.width}`}><span className="text-slate-400">{row.destino || 'Patio'}</span></td>;
      case 'hora_entrada':
        return (
          <td key={col.key} className={`py-3.5 px-4 font-mono text-slate-400 ${alignClass} ${col.width}`}>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>{row.hora_entrada ? new Date(row.hora_entrada).toLocaleTimeString('es-PA') : '—'}</span>
            </div>
          </td>
        );
      case 'hora_salida':
        return (
          <td key={col.key} className={`py-3.5 px-4 font-mono text-slate-400 ${alignClass} ${col.width}`}>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>{row.hora_salida ? new Date(row.hora_salida).toLocaleTimeString('es-PA') : '—'}</span>
            </div>
          </td>
        );
      case 'patio_ubicacion':
        return (
          <td key={col.key} className={`py-3.5 px-4 ${alignClass} ${col.width}`}>
            <div className="flex items-center gap-1.5 text-slate-300">
              <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>{row.patio_ubicacion || 'En Patio'}</span>
            </div>
          </td>
        );
      case 'operador':
        return <td key={col.key} className={`py-3.5 px-4 ${alignClass} ${col.width}`}>{row.operador || row.datos_extra?.operador || row.datos_extra?.conductor || '—'}</td>;
      case 'estado':
        const est = (row.datos_extra?.estado_bus || row.datos_extra?.estado || 'OPERATIVO').toLowerCase();
        return (
          <td key={col.key} className={`py-3.5 px-4 ${alignClass} ${col.width}`}>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              est === 'inoperativo'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              {row.datos_extra?.estado_bus || row.datos_extra?.estado || 'OPERATIVO'}
            </span>
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
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Columns className="h-5 w-5 text-cyan-400" /> Diseñador de Columnas · Genesis</h3>
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
                <button onClick={() => apiClient.post('/configuracion/distribucion-tabla/genesis/', {columnas: tableColumns}).then(() => setShowColumnConfig(false))} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0f172a]/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
            <Database className="h-5 w-5 text-slate-400" />
            Genesis · turnos y patios
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {totalCount.toLocaleString()} unidades sincronizadas
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button onClick={() => refetch()} disabled={isFetching} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors" title="Refrescar datos">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-cyan-400' : ''}`} />
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
            placeholder="Buscar móvil (806, 0806), origen, destino o patio..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-3 py-2 bg-[#0b1329] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <select
            value={selectedPatio}
            onChange={(e) => { setSelectedPatio(e.target.value); setPage(1); }}
            className="w-full py-2 px-3 bg-[#0b1329] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="">Todos los Patios</option>
            <option value="Curundu">Patio Curundu</option>
            <option value="Cabima">Patio La Cabima</option>
            <option value="Chorrillo">Patio Chorrillo</option>
            <option value="La Dona">Patio La Dona</option>
            <option value="Los Pueblos">Patio Los Pueblos</option>
            <option value="Ojo de Agua">Patio Ojo de Agua</option>
            <option value="Relevo Ca">Patio Relevo CA</option>
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
            className="w-full py-2 px-2 bg-[#0b1329] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value={25}>25 buses</option>
            <option value={50}>50 buses</option>
            <option value={100}>100 buses</option>
            <option value={250}>250 buses</option>
            <option value="all">Todos ({totalCount})</option>
          </select>
        </div>
      </div>

      {/* ── TABLA DE DATOS GENESIS ── */}
      <div className="bg-[#0f172a]/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#070b14] border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {visibleColumns.map(col => (
                  <SortableTh
                    key={col.key}
                    label={col.label}
                    column={col.key}
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
                    Cargando datos del sistema Genesis...
                  </td>
                </tr>
              ) : genesisList.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="py-12 text-center text-slate-500">
                    No se encontraron registros en Genesis.
                  </td>
                </tr>
              ) : (
                genesisList.map((row) => (
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
              Mostrando <span className="font-semibold text-white">{((page - 1) * (pageSize === 'all' ? totalCount : pageSize)) + 1} - {Math.min(page * (pageSize === 'all' ? totalCount : pageSize), totalCount)}</span> de <span className="font-semibold text-cyan-400">{totalCount.toLocaleString()}</span> buses
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
              <span className="px-3 py-1 font-mono text-cyan-400 font-bold bg-slate-900 border border-slate-800 rounded-lg">
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
