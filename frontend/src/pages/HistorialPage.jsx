import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Clock, 
  Bus, 
  MapPin, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Download, 
  X, 
  Eye, 
  Cpu, 
  Calendar,
  Layers,
  Wrench,
  Columns
} from 'lucide-react';
import apiClient from '../api/client';

const PATIOS_FILTER = ['', 'Patio La Cabima', 'Patio Chorrillo', 'Patio Curundu', 'Patio La Dona', 'Patio Los Pueblos', 'Patio Ojo de Agua'];
const TIPOS_MANTENIMIENTO = ['', 'Correctiva', 'Preventiva', 'Instalación GPS', 'Actualización Firmware', 'Revisión por Bitácora'];

const DEFAULT_COLUMNS_HISTORIAL = [
  { key: 'bus_movil', label: 'Bus', visible: true, width: 'w-20', align: 'left', source: 'historial' },
  { key: 'timestamp_atencion', label: 'Fecha y Hora', visible: true, width: 'w-36', align: 'left', source: 'historial' },
  { key: 'tecnico_nombre', label: 'Técnico', visible: true, width: 'w-40', align: 'left', source: 'historial' },
  { key: 'patio', label: 'Patio', visible: true, width: 'w-32', align: 'left', source: 'historial' },
  { key: 'tipo_mantenimiento', label: 'Tipo Atención', visible: true, width: 'w-36', align: 'left', source: 'historial' },
  { key: 'modem', label: 'Módem', visible: true, width: 'w-24', align: 'center', source: 'historial' },
  { key: 'bocina', label: 'Bocina', visible: true, width: 'w-24', align: 'center', source: 'historial' },
  { key: 'respuesta_tecnica', label: 'Acción Realizada', visible: true, width: 'w-48', align: 'left', source: 'historial' },
];

async function fetchTableConfig(module) {
  try {
    const res = await apiClient.get(`/configuracion/distribucion-tabla/${module}/`);
    return res?.columnas || DEFAULT_COLUMNS_HISTORIAL;
  } catch {
    return DEFAULT_COLUMNS_HISTORIAL;
  }
}

function StatusBadge({ label }) {
  if (!label) return null;
  const isOk = ['FUNCIONA', 'ACTIVA', 'ACTUALIZADO', 'ADECUADA', 'OPERATIVO'].includes(label.toUpperCase());
  const isDmg = ['DAÑADO', 'DAÑADA', 'DESCONECTADO', 'MOJADO', 'INOPERATIVO', 'VANDALISMO ROBADA'].includes(label.toUpperCase());

  return (
    <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase border ${
      isOk ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
      isDmg ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' :
      'bg-amber-500/10 text-amber-300 border-amber-500/30'
    }`}>
      {label}
    </span>
  );
}

export default function HistorialPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [patioFilter, setPatioFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [fechaFilter, setFechaFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [tableColumns, setTableColumns] = useState(null);
  const [columnsLoading, setColumnsLoading] = useState(true);

  const { data: historial = [], isLoading, refetch } = useQuery({
    queryKey: ['historial-bitacora', patioFilter, tipoFilter],
    queryFn: async () => {
      const res = await apiClient.get('/registros-bitacora/', {
        params: {
          patio__icontains: patioFilter ? patioFilter.replace('Patio ', '') : undefined,
          tipo_mantenimiento__icontains: tipoFilter || undefined,
          ordering: '-timestamp',
          page_size: 150,
        }
      });
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    },
  });

  useEffect(() => {
    fetchTableConfig('historial').then(cols => {
      setTableColumns(cols);
      setColumnsLoading(false);
    });
  }, []);

  const visibleColumns = useMemo(() => {
    if (!tableColumns || columnsLoading) return DEFAULT_COLUMNS_HISTORIAL;
    return tableColumns.filter(c => c.visible);
  }, [tableColumns, columnsLoading]);

  const filtered = useMemo(() => {
    return historial.filter(r => {
      const s = searchTerm.toLowerCase();
      const matchSearch = String(r.bus_movil || '').includes(s) ||
        String(r.tecnico_nombre || r.tecnico || '').toLowerCase().includes(s) ||
        String(r.patio || '').toLowerCase().includes(s) ||
        String(r.tipo_mantenimiento || '').toLowerCase().includes(s) ||
        String(r.respuesta_tecnica || '').toLowerCase().includes(s);

      const matchPatio = !patioFilter || (r.patio || '').toLowerCase().includes(patioFilter.replace('Patio ', '').toLowerCase());
      const matchTipo = !tipoFilter || (r.tipo_mantenimiento || '').toLowerCase().includes(tipoFilter.toLowerCase());
      const matchFecha = !fechaFilter || (r.timestamp || '').startsWith(fechaFilter);

      return matchSearch && matchPatio && matchTipo && matchFecha;
    });
  }, [historial, searchTerm, patioFilter, tipoFilter, fechaFilter]);

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
            <span>Bus #{row.bus_movil}</span>
          </td>
        );
      case 'timestamp_atencion':
        return (
          <td key={col.key} className={`py-3.5 px-4 font-mono text-slate-400 ${alignClass} ${col.width}`}>
            {row.timestamp ? new Date(row.timestamp).toLocaleString('es-PA', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
          </td>
        );
      case 'tecnico_nombre':
        return (
          <td key={col.key} className={`py-3.5 px-4 ${alignClass} ${col.width}`}>
            <p className="font-semibold text-white">{row.tecnico_nombre || row.tecnico || 'Técnico'}</p>
            {row.tecnico_codigo && (
              <p className="text-[10px] text-cyan-400 font-mono">Cód. {row.tecnico_codigo}</p>
            )}
          </td>
        );
      case 'patio':
        return <td key={col.key} className={`py-3.5 px-4 text-slate-300 ${alignClass} ${col.width}`}>{row.patio}</td>;
      case 'tipo_mantenimiento':
        return <td key={col.key} className={`py-3.5 px-4 font-semibold text-cyan-300 ${alignClass} ${col.width}`}>{row.tipo_mantenimiento}</td>;
      case 'modem':
        return <td key={col.key} className={`py-3.5 px-4 ${alignClass} ${col.width}`}><StatusBadge label={row.modem} /></td>;
      case 'bocina':
        return <td key={col.key} className={`py-3.5 px-4 ${alignClass} ${col.width}`}><StatusBadge label={row.bocina} /></td>;
      case 'respuesta_tecnica':
        return <td key={col.key} className={`py-3.5 px-4 text-slate-400 max-w-[220px] truncate ${alignClass} ${col.width}`} title={row.respuesta_tecnica}>{row.respuesta_tecnica || row.observaciones || 'Revisión técnica'}</td>;
      default:
        return null;
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Bus Móvil', 'Fecha y Hora', 'Técnico', 'Patio', 'Tipo Mantenimiento', 'Módem', 'Bocina', 'Acción Realizada', 'Observaciones'];
    const rows = filtered.map(r => [
      r.id,
      r.bus_movil,
      r.timestamp ? new Date(r.timestamp).toLocaleString('es-PA') : '',
      r.tecnico_nombre || r.tecnico_codigo || 'Técnico',
      r.patio,
      r.tipo_mantenimiento,
      r.modem,
      r.bocina,
      r.respuesta_tecnica || '',
      r.observaciones || ''
    ]);

    let csvContent = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(val => `"${val}"`).join(',') + '\n';
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historial_atenciones_bitacora_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {showColumnConfig && tableColumns && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" onClick={() => setShowColumnConfig(false)}>
          <div className="bg-[#0b1329] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto border-slate-700/80 ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Columns className="h-5 w-5 text-cyan-400" /> Diseñador de Columnas · Historial</h3>
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
                <button onClick={() => apiClient.post('/configuracion/distribucion-tabla/historial/', {columnas: tableColumns}).then(() => setShowColumnConfig(false))} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0f172a]/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Clock className="h-6 w-6 text-cyan-400" />
            Historial de Atenciones & Revisiones Técnicas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registro cronológico inmutable de intervenciones realizadas en buses de la flota
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all">
            <Download className="h-3.5 w-3.5" />
            Exportar Historial (CSV)
          </button>
          <button onClick={() => setShowColumnConfig(true)} disabled={columnsLoading} className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-900/80 hover:bg-slate-800 rounded-xl transition-all shadow-sm">
            <Columns className="w-4 h-4 text-cyan-400" /> Columnas
          </button>
        </div>
      </div>

      {/* ── BARRA MULTICRITERIO DE FILTROS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#0f172a]/90 p-4 rounded-2xl border border-slate-800">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar bus, técnico, acción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-[#0b1329] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <select
            value={patioFilter}
            onChange={(e) => setPatioFilter(e.target.value)}
            className="w-full py-2 px-3 bg-[#0b1329] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="">Todos los Patios</option>
            {PATIOS_FILTER.filter(Boolean).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="w-full py-2 px-3 bg-[#0b1329] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="">Todos los Tipos de Atención</option>
            {TIPOS_MANTENIMIENTO.filter(Boolean).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <input
            type="date"
            value={fechaFilter}
            onChange={(e) => setFechaFilter(e.target.value)}
            className="w-full py-2 px-3 bg-[#0b1329] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* ── TABLA DE HISTORIAL ── */}
      <div className="bg-[#0f172a]/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#070b14] border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {visibleColumns.map(col => (
                  <th key={col.key} className={`py-3.5 px-4 ${getAlignClass(col.align)} ${col.width}`}>{col.label}</th>
                ))}
                <th className="py-3.5 px-4 text-center w-16">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="py-12 text-center text-slate-500">
                    Cargando registros de historial...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="py-12 text-center text-slate-500">
                    No se encontraron registros de atenciones con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    {visibleColumns.map(col => renderCell(r, col))}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedRecord(r)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 rounded-lg transition-colors"
                        title="Ver detalle de atención"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL DE DETALLE DE ATENCIÓN ── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Expediente Técnico · Bus #{selectedRecord.bus_movil}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Registro ID #{selectedRecord.id} · {selectedRecord.timestamp ? new Date(selectedRecord.timestamp).toLocaleString('es-PA') : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              {/* Datos de Intervención */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#070b14] p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Técnico Responsable</span>
                  <span className="font-bold text-white">{selectedRecord.tecnico_nombre || selectedRecord.tecnico}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Patio</span>
                  <span className="text-white">{selectedRecord.patio}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Tipo Atención</span>
                  <span className="text-cyan-300 font-bold">{selectedRecord.tipo_mantenimiento}</span>
                </div>
              </div>

              {/* Equipamiento Embarcado Detalle */}
              {selectedRecord.datos_dinamicos?.equipos_ee && Array.isArray(selectedRecord.datos_dinamicos.equipos_ee) && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Equipos E.E. Intervenidos:</p>
                  <div className="space-y-1.5">
                    {selectedRecord.datos_dinamicos.equipos_ee.map((eq, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-[#070b14] p-2 rounded-lg border border-slate-800">
                        <span className="font-semibold text-white">{eq.tipo_equipo}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[11px]">{eq.detalle_estado}</span>
                          <StatusBadge label={eq.estado_equipo} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acción Realizada & Diagnóstico */}
              <div className="bg-[#070b14] p-3 rounded-xl border border-slate-800 space-y-2">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Acción Realizada</span>
                  <p className="text-slate-200 mt-0.5 leading-relaxed">{selectedRecord.respuesta_tecnica || 'Ninguna descrita.'}</p>
                </div>
                {selectedRecord.observaciones && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Observaciones</span>
                    <p className="text-slate-400 mt-0.5 leading-relaxed">{selectedRecord.observaciones}</p>
                  </div>
                )}
                {selectedRecord.datos_dinamicos?.firma_tecnico && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Firma Técnico / Conformidad</span>
                    <p className="text-cyan-300 font-mono mt-0.5">{selectedRecord.datos_dinamicos.firma_tecnico}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
