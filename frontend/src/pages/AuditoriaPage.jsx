import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  Calendar, 
  User, 
  FileText, 
  Database, 
  Eye, 
  X, 
  Activity, 
  ArrowRight,
  Globe,
  Tag,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import apiClient from '../api/client';

const ACCIONES_CONFIG = {
  CREATE: { label: 'Creación', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  UPDATE: { label: 'Actualización', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
  DELETE: { label: 'Eliminación', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  ATENDER: { label: 'Atención Falla', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  LOGIN: { label: 'Inicio Sesión', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  CONFIG: { label: 'Configuración', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
};

const MODELOS_OPCIONES = [
  { value: '', label: 'Todos los modelos' },
  { value: 'RegistroBitacora', label: 'Registro de Bitácora' },
  { value: 'EEMovil', label: 'E.E. Móvil' },
  { value: 'InventarioEE', label: 'Inventario Componentes' },
  { value: 'InventarioFlota', label: 'Inventario Flota' },
  { value: 'ConfiguracionSistema', label: 'Configuración de Sistema' },
  { value: 'Usuario', label: 'Usuarios y Permisos' },
  { value: 'ReportePendiente', label: 'Reportes Pendientes' },
];

export default function AuditoriaPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroModelo, setFiltroModelo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);

  // Fetch de logs con React Query
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['audit-logs', page, pageSize, filtroAccion, filtroModelo, busqueda],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('page_size', pageSize);
      if (filtroAccion) params.append('accion', filtroAccion);
      if (filtroModelo) params.append('modelo', filtroModelo);
      if (busqueda) params.append('search', busqueda);

      const res = await apiClient.get(`/audit-logs/?${params.toString()}`);
      return res.data;
    },
    keepPreviousData: true,
  });

  const logs = data?.results || (Array.isArray(data) ? data : []);
  const totalCount = data?.count || logs.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Exportar a CSV en cliente
  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = ['ID', 'Fecha/Hora', 'Usuario Código', 'Usuario Nombre', 'Acción', 'Modelo', 'Registro ID', 'Campo', 'Valor Anterior', 'Valor Nuevo', 'IP Origen'];
    const rows = logs.map(l => [
      l.id,
      new Date(l.timestamp).toLocaleString(),
      `"${l.usuario_codigo || ''}"`,
      `"${l.usuario_nombre || ''}"`,
      `"${l.accion || ''}"`,
      `"${l.modelo || ''}"`,
      `"${l.registro_id || ''}"`,
      `"${l.campo || ''}"`,
      `"${(l.valor_anterior || '').replace(/"/g, '""')}"`,
      `"${(l.valor_nuevo || '').replace(/"/g, '""')}"`,
      `"${l.ip_origen || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_sistema_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f172a]/70 backdrop-blur-md p-6 rounded-2xl border border-slate-800/80 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 rounded-xl text-cyan-400 shadow-lg shadow-cyan-500/10">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white tracking-wide">Pista de Auditoría & Trazabilidad</h1>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-full">
                ADMIN ONLY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Registro inmutable de acciones, mutaciones de datos, atenciones operativas y accesos al sistema.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 rounded-xl transition-all disabled:opacity-50"
            title="Refrescar datos"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refrescar</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!logs.length}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl transition-all shadow-lg shadow-cyan-500/5 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#0f172a]/60 backdrop-blur-md p-4 rounded-xl border border-slate-800/70">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por usuario, ID o detalle..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* Action Filter */}
        <div>
          <select
            value={filtroAccion}
            onChange={(e) => {
              setFiltroAccion(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="">Todas las acciones</option>
            {Object.entries(ACCIONES_CONFIG).map(([key, item]) => (
              <option key={key} value={key}>{item.label} ({key})</option>
            ))}
          </select>
        </div>

        {/* Model Filter */}
        <div>
          <select
            value={filtroModelo}
            onChange={(e) => {
              setFiltroModelo(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
          >
            {MODELOS_OPCIONES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Quick Reset */}
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-xs text-slate-400 font-mono">
            {totalCount} registro(s)
          </span>
          {(filtroAccion || filtroModelo || busqueda) && (
            <button
              onClick={() => {
                setFiltroAccion('');
                setFiltroModelo('');
                setBusqueda('');
                setPage(1);
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors underline decoration-cyan-500/40"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#0f172a]/70 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3.5">Fecha & Hora</th>
                <th className="px-4 py-3.5">Usuario</th>
                <th className="px-4 py-3.5">Acción</th>
                <th className="px-4 py-3.5">Modelo / Entidad</th>
                <th className="px-4 py-3.5">Registro ID</th>
                <th className="px-4 py-3.5">IP Origen</th>
                <th className="px-4 py-3.5">Detalles</th>
                <th className="px-4 py-3.5 text-center">Inspeccionar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                      <span>Cargando eventos de auditoría...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    <p className="text-sm font-medium text-slate-400">No se encontraron eventos de auditoría</p>
                    <p className="text-xs text-slate-600 mt-1">Prueba ajustando los filtros de búsqueda</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const accionConf = ACCIONES_CONFIG[log.accion] || { label: log.accion, color: 'bg-slate-800 text-slate-300 border-slate-700' };
                  const dateFormatted = new Date(log.timestamp).toLocaleString('es-PA', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => setRegistroSeleccionado(log)}
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {dateFormatted}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-200">{log.usuario_nombre}</span>
                          <span className="font-mono text-[10px] text-cyan-400">{log.usuario_codigo || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md border ${accionConf.color}`}>
                          {accionConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300 whitespace-nowrap">
                        <span className="text-cyan-300 font-semibold">{log.modelo}</span>
                        {log.campo && <span className="text-slate-500 ml-1">({log.campo})</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                        #{log.registro_id || '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {log.ip_origen || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                        {log.valor_nuevo || (log.detalles ? JSON.stringify(log.detalles) : '-')}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRegistroSeleccionado(log);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                          title="Ver detalle del cambio"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/80 bg-slate-900/40 text-xs">
            <span className="text-slate-400">
              Página <span className="font-bold text-slate-200">{page}</span> de <span className="font-bold text-slate-200">{totalPages}</span> ({totalCount} registros)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Inspector de Cambios */}
      {registroSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Detalle de Evento #{registroSeleccionado.id}</h3>
                  <p className="text-xs text-slate-400">
                    {new Date(registroSeleccionado.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRegistroSeleccionado(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              {/* Metadatos principales */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Usuario</span>
                  <p className="text-slate-200 font-medium mt-0.5">{registroSeleccionado.usuario_nombre}</p>
                  <p className="text-[10px] text-cyan-400 font-mono">{registroSeleccionado.usuario_codigo || 'Sistema'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Acción</span>
                  <p className="mt-0.5">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded border bg-slate-800 text-cyan-300 border-cyan-500/30">
                      {registroSeleccionado.accion}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Modelo & ID</span>
                  <p className="text-slate-200 font-mono mt-0.5">{registroSeleccionado.modelo} #{registroSeleccionado.registro_id}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">IP Origen</span>
                  <p className="text-slate-300 font-mono mt-0.5">{registroSeleccionado.ip_origen || 'No capturada'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Campo Afectado</span>
                  <p className="text-slate-300 font-mono mt-0.5">{registroSeleccionado.campo || 'Registro Completo'}</p>
                </div>
              </div>

              {/* Diff de Valores */}
              {(registroSeleccionado.valor_anterior || registroSeleccionado.valor_nuevo) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Comparación de Valores</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Valor Anterior</span>
                      <pre className="mt-1 p-2 bg-slate-950/80 rounded font-mono text-[11px] text-rose-300 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                        {registroSeleccionado.valor_anterior || '(Vacío)'}
                      </pre>
                    </div>
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Valor Nuevo</span>
                      <pre className="mt-1 p-2 bg-slate-950/80 rounded font-mono text-[11px] text-emerald-300 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                        {registroSeleccionado.valor_nuevo || '(Vacío)'}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Metadatos y JSON */}
              {registroSeleccionado.detalles && Object.keys(registroSeleccionado.detalles).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Metadatos Extendidos (JSON)</h4>
                  <pre className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl font-mono text-[11px] text-cyan-300 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                    {JSON.stringify(registroSeleccionado.detalles, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setRegistroSeleccionado(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-xs transition-colors"
              >
                Cerrar Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
