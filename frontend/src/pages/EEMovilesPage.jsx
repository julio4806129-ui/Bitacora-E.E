import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Plus, 
  Edit2, 
  X, 
  Cpu, 
  Bus, 
  Wrench, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Radio,
  Sliders,
  Sparkles,
  MapPin,
  Save,
  Loader2,
  Check,
  Columns,
  Eye,
  X as XIcon
} from 'lucide-react';
import apiClient from '../api/client';
import DynamicFormRenderer from '../components/DynamicFormRenderer';

const PATIOS = ["TODOS", "CURUNDU", "LA CABIMA", "LOS PUEBLOS", "OJO DE AGUA", "LA DONA", "CHORRILLO"];

const DEFAULT_COLUMNS_EE_MOVILES = [
  { key: 'bus_movil', label: 'Bus Móvil', visible: true, width: 'w-20', align: 'left', source: 'ee_moviles' },
  { key: 'patio', label: 'Patio', visible: true, width: 'w-32', align: 'left', source: 'ee_moviles' },
  { key: 'fase_instalacion', label: 'Fase Instalación', visible: true, width: 'w-32', align: 'left', source: 'ee_moviles' },
  { key: 'estado_modem', label: 'Estado Módem', visible: true, width: 'w-28', align: 'left', source: 'ee_moviles' },
  { key: 'estado_bocina', label: 'Estado Bocina', visible: true, width: 'w-28', align: 'left', source: 'ee_moviles' },
  { key: 'version_firmware', label: 'Versión Firmware', visible: true, width: 'w-28', align: 'left', source: 'ee_moviles' },
  { key: 'ultima_atencion', label: 'Última Atención', visible: true, width: 'w-36', align: 'left', source: 'ee_moviles' },
];

async function fetchTableConfig(module) {
  try {
    const res = await apiClient.get(`/configuracion/distribucion-tabla/${module}/`);
    return res?.columnas || DEFAULT_COLUMNS_EE_MOVILES;
  } catch {
    return DEFAULT_COLUMNS_EE_MOVILES;
  }
}

export default function EEMovilesPage() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [patioFilter, setPatioFilter] = useState('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEE, setSelectedEE] = useState(null);
  const [dynamicValues, setDynamicValues] = useState({});
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [tableColumns, setTableColumns] = useState(null);
  const [columnsLoading, setColumnsLoading] = useState(true);

  const [baseForm, setBaseForm] = useState({
    bus_movil: '',
    fase_instalacion: 'Fase 1',
    fase_bocina: 'Fase 1',
    version_firmware: 'v2.4.1',
    estado_fw: 'ACTUALIZADO',
    estado_modem: 'FUNCIONA',
    estado_bocina: 'FUNCIONA',
    patio: 'CURUNDU'
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null && q !== searchTerm) {
      setSearchTerm(q);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchTableConfig('ee_moviles').then(cols => {
      setTableColumns(cols);
      setColumnsLoading(false);
    });
  }, []);

  const { data: eemoviles, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['ee-moviles'],
    queryFn: async () => {
      const res = await apiClient.get('/ee-moviles/');
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    }
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      if (selectedEE) {
        return apiClient.put(`/ee-moviles/${selectedEE.id}/`, data);
      }
      return apiClient.post('/ee-moviles/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ee-moviles']);
      queryClient.invalidateQueries(['dashboard-stats']);
      setIsModalOpen(false);
      setSelectedEE(null);
    },
    onError: (error) => {
      const errMsg = error.response?.data ? JSON.stringify(error.response.data) : 'Error al guardar el registro';
      alert(`Error al guardar: ${errMsg}`);
    }
  });

  const visibleColumns = useMemo(() => {
    if (!tableColumns || columnsLoading) return DEFAULT_COLUMNS_EE_MOVILES;
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
          <td key={col.key} className={`py-3.5 px-4 font-mono font-bold text-white flex items-center gap-2 ${alignClass} ${col.width}`}>
            <Bus className="h-4 w-4 text-cyan-400" />
            <span>Bus #{row.bus_movil}</span>
          </td>
        );
      case 'patio':
        return (
          <td key={col.key} className={`py-3.5 px-4 text-slate-300 ${alignClass} ${col.width}`}>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-slate-500" />
              <span>{row.patio || '—'}</span>
            </span>
          </td>
        );
      case 'fase_instalacion':
        return <td key={col.key} className={`py-3.5 px-4 text-slate-400 font-medium ${alignClass} ${col.width}`}>{row.fase_instalacion || 'Operativo'}</td>;
      case 'estado_modem':
        return (
          <td key={col.key} className={`py-3.5 px-4 ${alignClass} ${col.width}`}>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${
              row.estado_modem === 'FUNCIONA' 
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            }`}>
              {row.estado_modem || 'FUNCIONA'}
            </span>
          </td>
        );
      case 'estado_bocina':
        return (
          <td key={col.key} className={`py-3.5 px-4 ${alignClass} ${col.width}`}>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${
              row.estado_bocina === 'FUNCIONA' 
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}>
              {row.estado_bocina || 'FUNCIONA'}
            </span>
          </td>
        );
      case 'version_firmware':
        return <td key={col.key} className={`py-3.5 px-4 font-mono text-cyan-300 font-bold ${alignClass} ${col.width}`}>{row.version_firmware || 'v2.4.1'}</td>;
      case 'ultima_atencion':
        return <td key={col.key} className={`py-3.5 px-4 font-mono text-slate-400 text-[11px] ${alignClass} ${col.width}`}>{row.ultima_atencion ? new Date(row.ultima_atencion).toLocaleDateString('es-PA') : '—'}</td>;
      default:
        return null;
    }
};
  
  const handleOpenModal = (ee = null) => {
    setSelectedEE(ee);
    if (ee) {
      setBaseForm({
        bus_movil: ee.bus_movil || '',
        fase_instalacion: ee.fase_instalacion || 'Fase 1',
        fase_bocina: ee.fase_bocina || 'Fase 1',
        version_firmware: ee.version_firmware || 'v2.4.1',
        estado_fw: ee.estado_fw || 'ACTUALIZADO',
        estado_modem: ee.estado_modem || 'FUNCIONA',
        estado_bocina: ee.estado_bocina || 'FUNCIONA',
        patio: ee.patio || 'CURUNDU'
      });
      setDynamicValues(ee.datos_dinamicos || {});
    } else {
      setBaseForm({
        bus_movil: '',
        fase_instalacion: 'Fase 1',
        fase_bocina: 'Fase 1',
        version_firmware: 'v2.4.1',
        estado_fw: 'ACTUALIZADO',
        estado_modem: 'FUNCIONA',
        estado_bocina: 'FUNCIONA',
        patio: 'CURUNDU'
      });
      setDynamicValues({});
    }
    setIsModalOpen(true);
  };

  const handleSaveAll = () => {
    if (!baseForm.bus_movil) {
      alert('Por favor ingrese el número de bus móvil.');
      return;
    }

    const payload = {
      bus_movil: parseInt(baseForm.bus_movil, 10),
      fase_instalacion: baseForm.fase_instalacion,
      fase_bocina: baseForm.fase_bocina,
      version_firmware: baseForm.version_firmware,
      estado_fw: baseForm.estado_fw,
      estado_modem: baseForm.estado_modem,
      estado_bocina: baseForm.estado_bocina,
      patio: baseForm.patio,
      datos_dinamicos: dynamicValues || {}
    };
    mutation.mutate(payload);
  };

  const eeList = Array.isArray(eemoviles) ? eemoviles : [];

  // Metrics
  const totalBuses = eeList.length;
  const modemsOk = eeList.filter(e => e.estado_modem === 'FUNCIONA').length;
  const bocinasOk = eeList.filter(e => e.estado_bocina === 'FUNCIONA').length;
  const fwOk = eeList.filter(e => e.estado_fw === 'ACTUALIZADO').length;

  const pctModems = totalBuses > 0 ? Math.round((modemsOk / totalBuses) * 100) : 100;
  const pctBocinas = totalBuses > 0 ? Math.round((bocinasOk / totalBuses) * 100) : 100;
  const pctFw = totalBuses > 0 ? Math.round((fwOk / totalBuses) * 100) : 100;

  const filtered = eeList.filter(item => {
    const matchesSearch = 
      String(item.bus_movil || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.fase_instalacion || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.patio || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.estado_fw || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPatio = patioFilter === 'TODOS' || (item.patio || '').toUpperCase() === patioFilter;
    return matchesSearch && matchesPatio;
  });

  return (
    <div className="space-y-6">
      {showColumnConfig && tableColumns && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" onClick={() => setShowColumnConfig(false)}>
          <div className="bg-[#0b1329] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto border-slate-700/80 ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Columns className="h-5 w-5 text-cyan-400" /> Diseñador de Columnas · E.E. Móviles</h3>
              <button onClick={() => setShowColumnConfig(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"><XIcon className="h-5 w-5" /></button>
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
                <button onClick={() => apiClient.post('/configuracion/distribucion-tabla/ee_moviles/', {columnas: tableColumns}).then(() => setShowColumnConfig(false))} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0b1329]/90 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-xl ring-1 ring-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
              Hardware Matrix
            </span>
            <span className="text-xs text-slate-400">· Control de Equipamiento Embarcado & Firmware</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Cpu className="h-6 w-6 text-cyan-400" />
            <span>Equipamiento Embarcado (E.E. Móviles)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Matriz técnica de periféricos: módems 4G, bocinas de alerta, reguladores, cableado y estado de firmware.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Refrescar datos"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button onClick={() => setShowColumnConfig(true)} disabled={columnsLoading} className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-900/80 hover:bg-slate-800 rounded-xl transition-all shadow-sm">
            <Columns className="w-4 h-4 text-cyan-400" /> Columnas
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Registro E.E.</span>
          </button>
        </div>
      </div>

      {/* Hardware Health KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0b1329]/90 border border-slate-800 rounded-2xl p-4 shadow-lg ring-1 ring-white/5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Equipos Monitoreados</p>
          <p className="text-2xl font-black text-white font-mono mt-1">{totalBuses}</p>
          <span className="text-[10px] text-cyan-400 font-mono">100% de la flota censada</span>
        </div>
        <div className="bg-[#0b1329]/90 border border-slate-800 rounded-2xl p-4 shadow-lg ring-1 ring-white/5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Módems 4G Operativos</p>
          <p className="text-2xl font-black text-emerald-400 font-mono mt-1">{pctModems}%</p>
          <span className="text-[10px] text-slate-400">{modemsOk} de {totalBuses} funcionando</span>
        </div>
        <div className="bg-[#0b1329]/90 border border-slate-800 rounded-2xl p-4 shadow-lg ring-1 ring-white/5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bocinas / Alerta</p>
          <p className="text-2xl font-black text-cyan-400 font-mono mt-1">{pctBocinas}%</p>
          <span className="text-[10px] text-slate-400">{bocinasOk} operativas</span>
        </div>
        <div className="bg-[#0b1329]/90 border border-slate-800 rounded-2xl p-4 shadow-lg ring-1 ring-white/5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Firmware v2.4+</p>
          <p className="text-2xl font-black text-purple-400 font-mono mt-1">{pctFw}%</p>
          <span className="text-[10px] text-slate-400">{fwOk} actualizados</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0b1329]/90 p-4 rounded-2xl border border-slate-800 shadow-xl ring-1 ring-white/5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            className="w-full pl-10 pr-3.5 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            placeholder="Buscar móvil, fase, patio o firmware..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Patio:</span>
          <select
            value={patioFilter}
            onChange={(e) => setPatioFilter(e.target.value)}
            className="bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            {PATIOS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {(searchTerm || patioFilter !== 'TODOS') && (
          <button
            onClick={() => { setSearchTerm(''); setPatioFilter('TODOS'); }}
            className="text-xs text-slate-400 hover:text-white px-2 py-1"
          >
            Limpiar filtros
          </button>
        )}

        <span className="ml-auto text-xs font-mono text-slate-400">
          Mostrando <span className="font-bold text-cyan-400">{filtered.length}</span> móviles
        </span>
      </div>

      {/* Main Table */}
      <div className="bg-[#0b1329]/90 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden ring-1 ring-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#070b14] border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {visibleColumns.map(col => (
                  <th key={col.key} className={`py-3.5 px-4 ${getAlignClass(col.align)} ${col.width}`}>{col.label}</th>
                ))}
                <th className="py-3.5 px-4 text-right w-16">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="py-12 text-center text-slate-500 font-mono">
                    <div className="h-5 w-5 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto mb-2" />
                    Cargando equipamiento embarcado...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="py-12 text-center text-slate-500 text-xs">
                    <Cpu className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    No se encontraron registros de hardware con los filtros especificados.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors group">
                    {visibleColumns.map(col => renderCell(row, col))}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenModal(row)}
                        className="p-1.5 bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 rounded-lg transition-colors border border-slate-700/60"
                        title="Modificar equipamiento técnico"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Editar / Crear Hardware E.E. */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-[#0b1329] border border-slate-700/80 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 ring-1 ring-white/10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {selectedEE ? `Ficha Técnica E.E. · Bus #${selectedEE.bus_movil}` : 'Nuevo Registro de Hardware E.E.'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Configuración de componentes y firmware embarcado</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">Bus Móvil *</label>
                  <input
                    type="number"
                    value={baseForm.bus_movil}
                    onChange={(e) => setBaseForm(prev => ({ ...prev, bus_movil: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    placeholder="ej. 1042"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">Patio Asignado</label>
                  <select
                    value={baseForm.patio}
                    onChange={(e) => setBaseForm(prev => ({ ...prev, patio: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {PATIOS.filter(p => p !== 'TODOS').map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">Estado Módem 4G</label>
                  <select
                    value={baseForm.estado_modem}
                    onChange={(e) => setBaseForm(prev => ({ ...prev, estado_modem: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="FUNCIONA">FUNCIONA</option>
                    <option value="DAÑADO">DAÑADO</option>
                    <option value="DESCONECTADO">DESCONECTADO</option>
                    <option value="SUSTRAIDO">SUSTRAIDO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">Estado Bocina Alerta</label>
                  <select
                    value={baseForm.estado_bocina}
                    onChange={(e) => setBaseForm(prev => ({ ...prev, estado_bocina: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="FUNCIONA">FUNCIONA</option>
                    <option value="DAÑADA">DAÑADA</option>
                    <option value="VANDALISMO ROBADA">VANDALISMO ROBADA</option>
                    <option value="PENDIENTE">PENDIENTE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">Versión Firmware</label>
                  <input
                    type="text"
                    value={baseForm.version_firmware}
                    onChange={(e) => setBaseForm(prev => ({ ...prev, version_firmware: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                    placeholder="v2.4.1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">Estado Firmware</label>
                  <select
                    value={baseForm.estado_fw}
                    onChange={(e) => setBaseForm(prev => ({ ...prev, estado_fw: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ACTUALIZADO">ACTUALIZADO</option>
                    <option value="DESACTUALIZADO">DESACTUALIZADO</option>
                    <option value="ERROR ACTUALIZACION">ERROR ACTUALIZACIÓN</option>
                  </select>
                </div>
              </div>

              {/* Dynamic form fields for ee_moviles */}
              <div className="p-4 rounded-xl bg-[#070b14]/70 border border-slate-800/90 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Campos Dinámicos de Hardware
                  </h4>
                </div>
                <DynamicFormRenderer
                  moduleName="ee_moviles"
                  initialData={dynamicValues}
                  onSubmit={(vals) => setDynamicValues(vals)}
                  isReadOnly={false}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={mutation.isPending || !baseForm.bus_movil}
                className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Guardar Ficha Hardware</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
