import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Layers, 
  X, 
  Settings2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  Sparkles, 
  Check, 
  Sliders, 
  Radio as RadioIcon, 
  Cpu, 
  ClipboardList, 
  Package,
  FileCode2,
  RefreshCw,
  Columns,
  Table,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Minus,
  Maximize2,
  Minimize2,
  Database,
  Loader2
} from 'lucide-react';
import apiClient from '../api/client';
import DynamicFormRenderer from '../components/DynamicFormRenderer';

const MODULE_PRESETS = [
  { id: 'bitacora', name: 'bitacora', label: 'Bitácora Técnica', icon: RadioIcon, desc: 'Atenciones y revisiones en patio' },
  { id: 'ee_moviles', name: 'ee_moviles', label: 'E.E. Móviles', icon: Cpu, desc: 'Equipamiento embarcado y hardware' },
  { id: 'incidencias', name: 'incidencias', label: 'Incidencias & Fallas', icon: AlertCircle, desc: 'Reportes de anomalías de flota' },
  { id: 'inventario', name: 'inventario', label: 'Inventario E.E.', icon: Package, desc: 'Repuestos, módems y periféricos' },
];

const TABLE_MODULES = [
  { id: 'bitacora', name: 'bitacora', label: 'Bitácora Técnica', icon: Table, desc: 'Cruce Génesis + BUSAE + Historial' },
  { id: 'genesis', name: 'genesis', label: 'Datos Génesis', icon: Database, desc: 'Turnos, horas entrada/salida, estado operativo' },
  { id: 'busae', name: 'busae', label: 'Datos BUSAE', icon: RadioIcon, desc: 'Telemetría GPS, velocidad, odómetro, coordenadas' },
  { id: 'historial', name: 'historial', label: 'Historial Revisiones', icon: ClipboardList, desc: 'Fecha atención, técnico, diagnóstico, respuesta' },
  { id: 'ee_moviles', name: 'ee_moviles', label: 'E.E. Móviles', icon: Cpu, desc: 'Hardware, firmware, estado componentes' },
];

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Texto Corto', badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  { value: 'TEXTAREA', label: 'Texto Largo', badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  { value: 'NUMBER', label: 'Numérico', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { value: 'SELECT', label: 'Selección Única (Dropdown)', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  { value: 'MULTISELECT', label: 'Multi-Selección', badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  { value: 'RADIO', label: 'Grupo Radio', badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  { value: 'BOOLEAN', label: 'Booleano (Sí/No)', badge: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
  { value: 'DATE', label: 'Fecha', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { value: 'FILE', label: 'Adjunto / Fotografía', badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
];

export default function SchemaEditorPage() {
  const [activeTab, setActiveTab] = useState('forms'); // 'forms' | 'tables'
  const [selectedModulo, setSelectedModulo] = useState('bitacora');
  const [selectedTableModule, setSelectedTableModule] = useState('bitacora');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampo, setEditingCampo] = useState(null);
  const [previewSubmission, setPreviewSubmission] = useState(null);
  const [tableColumns, setTableColumns] = useState(null);
  const [tableColumnsLoading, setTableColumnsLoading] = useState(true);
  const queryClient = useQueryClient();

  const { data: rawModulos } = useQuery({
    queryKey: ['modulos-dinamicos'],
    queryFn: async () => {
      const res = await apiClient.get('/modulos-dinamicos/');
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    }
  });
  const modulos = Array.isArray(rawModulos) ? rawModulos : [];

  const { data: rawCampos, isLoading: isLoadingCampos, refetch: refetchCampos } = useQuery({
    queryKey: ['campos-configuracion-admin', selectedModulo],
    queryFn: async () => {
      const res = await apiClient.get(`/campos-configuracion/?modulo__nombre=${selectedModulo}`);
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    },
    enabled: !!selectedModulo
  });
  const campos = Array.isArray(rawCampos) ? rawCampos : [];
  const sortedCampos = [...campos].sort((a, b) => (a.orden || 0) - (b.orden || 0));

  // Save / Update mutation
  const mutation = useMutation({
    mutationFn: (data) => {
      if (data.id) {
        return apiClient.put(`/campos-configuracion/${data.id}/`, data);
      }
      return apiClient.post('/campos-configuracion/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['campos-configuracion-admin', selectedModulo]);
      queryClient.invalidateQueries(['campos-configuracion', selectedModulo]);
      setIsModalOpen(false);
      setEditingCampo(null);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.del(`/campos-configuracion/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries(['campos-configuracion-admin', selectedModulo]);
      queryClient.invalidateQueries(['campos-configuracion', selectedModulo]);
    }
  });

  // Quick order adjustment
  const handleMoveOrder = async (campo, direction) => {
    const currentIndex = sortedCampos.findIndex(c => c.id === campo.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedCampos.length) return;

    const targetCampo = sortedCampos[targetIndex];
    const currentOrder = campo.orden || 0;
    const targetOrder = targetCampo.orden || 0;

    const newCurrentOrder = targetOrder;
    const newTargetOrder = currentOrder === targetOrder 
      ? (direction === 'up' ? targetOrder + 1 : targetOrder - 1)
      : currentOrder;

    try {
      await apiClient.patch(`/campos-configuracion/${campo.id}/`, { orden: newCurrentOrder });
      await apiClient.patch(`/campos-configuracion/${targetCampo.id}/`, { orden: newTargetOrder });
      refetchCampos();
      queryClient.invalidateQueries(['campos-configuracion', selectedModulo]);
    } catch (err) {
      console.error('Error reordering campos:', err);
    }
  };

  // Quick toggle active
  const handleToggleActive = async (campo) => {
    try {
      await apiClient.patch(`/campos-configuracion/${campo.id}/`, { activo: !campo.activo });
      refetchCampos();
      queryClient.invalidateQueries(['campos-configuracion', selectedModulo]);
    } catch (err) {
      console.error('Error toggling active:', err);
    }
  };

  // Fetch table columns configuration
  const fetchTableColumns = async () => {
    setTableColumnsLoading(true);
    try {
      const res = await apiClient.get(`/configuracion/distribucion-tabla/${selectedTableModule}/`);
      if (res && res.columnas) {
        setTableColumns(res.columnas);
      } else if (Array.isArray(res)) {
        setTableColumns(res);
      }
    } catch (e) {
      console.error('Error fetching table columns:', e);
    } finally {
      setTableColumnsLoading(false);
    }
  };

  // Fetch columns when table module changes
  useEffect(() => {
    fetchTableColumns();
  }, [selectedTableModule]);

  // Save table columns
  const saveTableColumns = async () => {
    if (!tableColumns) return;
    try {
      await apiClient.post(`/configuracion/distribucion-tabla/${selectedTableModule}/`, { 
        columnas: tableColumns 
      });
      queryClient.invalidateQueries(['configuracion-tabla', selectedTableModule]);
    } catch (e) {
      console.error('Error saving table columns:', e);
    }
  };

  // Toggle column visibility
  const toggleColumnVisibility = (key, visible) => {
    setTableColumns(prev => prev?.map(c => 
      c.key === key ? { ...c, visible } : c
    ));
  };

  // Update column label
  const updateColumnLabel = (key, label) => {
    setTableColumns(prev => prev?.map(c => 
      c.key === key ? { ...c, label } : c
    ));
  };

  // Update column width
  const updateColumnWidth = (key, width) => {
    setTableColumns(prev => prev?.map(c => 
      c.key === key ? { ...c, width } : c
    ));
  };

  // Update column align
  const updateColumnAlign = (key, align) => {
    setTableColumns(prev => prev?.map(c => 
      c.key === key ? { ...c, align } : c
    ));
  };

  // Move column up/down
  const moveColumn = (index, direction) => {
    setTableColumns(prev => {
      if (!prev) return prev;
      const newCols = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newCols.length) return prev;
      [newCols[index], newCols[targetIndex]] = [newCols[targetIndex], newCols[index]];
      return newCols;
    });
  };

  // Get sample data for preview
  const getSampleData = (key, rowIdx) => {
    const samples = {
      'bus': ['1042', '1087', '1123'],
      'bus_movil': ['1042', '1087', '1123'],
      'placa': ['MB1042', 'MB1087', 'MB1123'],
      'patio_ubicacion': ['Patio Curundu', 'Patio Los Pueblos', 'Patio La Cabima'],
      'patio': ['CURUNDU', 'LOS PUEBLOS', 'LA CABIMA'],
      'tecnico': ['Juan Pérez (TEC-001)', 'María González (TEC-045)', 'Carlos Ruiz (TEC-078)'],
      'tecnico_nombre': ['Juan Pérez', 'María González', 'Carlos Ruiz'],
      'hora_entrada': ['06:45:00', '07:12:00', '06:58:00'],
      'hora_salida': ['18:30:00', '19:15:00', '18:45:00'],
      'estado_genesis': ['Operativo', 'Operativo', 'Inoperativo'],
      'estado': ['Active', 'Stopped', 'Offline'],
      'estado_gps': ['Active', 'Stopped', 'No records'],
      'manos_libres': ['Sí', 'No', 'Sí'],
      'velocidad': ['45 km/h', '0 km/h', '—'],
      'odometro': ['234,567', '189,234', '—'],
      'latitud': ['8.9824', '9.1234', '—'],
      'longitud': ['-79.5199', '-79.6543', '—'],
      'modelo': ['Torino', 'Grand Viale', 'County'],
      'chasis': ['9BW...234', '8GT...567', '—'],
      'motivo_reporte': ['Sin transmisión GPS', 'Módem desconectado', 'Señal intermitente'],
      'origen': ['Albrook', 'Terminal 2000', 'Patio Los Pueblos'],
      'destino': ['Patio Curundu', 'Patio La Cabima', 'Terminal 2000'],
      'operador': ['J. Santos', 'M. Herrera', 'R. Vega'],
      'timestamp_atencion': ['18/09/2026 08:15', '18/09/2026 09:30', '17/09/2026 14:22'],
      'tipo_atencion': ['Revisión por Bitácora', 'Correctiva', 'Instalación GPS'],
      'diagnostico': ['Modem GPS reiniciado', 'Cableado antena reparado', 'SIM Card reemplazada'],
      'respuesta_tecnica': ['Reinicio completo, sincronización OK', 'Cable coaxial sustituido, prueba OK', 'SIM activada, validación exitosa'],
      'version_firmware': ['v2.4.1', 'v2.4.1', 'v2.3.9'],
      'estado_modem': ['FUNCIONA', 'FUNCIONA', 'DAÑADO'],
      'estado_bocina': ['FUNCIONA', 'DAÑADA', 'FUNCIONA'],
      'ultima_atencion': ['18/09/2026', '15/09/2026', '10/09/2026'],
      'ultima_revision': ['18/09/2026 08:15', '15/09/2026 10:30', '10/09/2026 14:22'],
    };
    const arr = samples[key] || ['—', '—', '—'];
    return arr[rowIdx - 1] || arr[0];
  };

  const handleEdit = (campo) => {
    setEditingCampo(campo);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Confirma que desea eliminar este campo dinámico? Los datos almacenados previamente en JSONB se conservarán como histórico.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    let modObj = modulos.find(m => m.nombre === selectedModulo);
    
    const rawOpciones = formData.get('opciones') || '';
    const opciones = rawOpciones
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const data = {
      modulo_id: modObj?.id,
      modulo_nombre: selectedModulo,
      clave: formData.get('clave').trim().toLowerCase().replace(/\s+/g, '_'),
      etiqueta: formData.get('etiqueta').trim(),
      tipo: formData.get('tipo'),
      requerido: formData.get('requerido') === 'on',
      orden: parseInt(formData.get('orden') || '0', 10),
      activo: formData.get('activo') === 'on',
      opciones: opciones,
      validaciones: {}
    };

    if (modObj) {
      data.modulo = modObj.id;
    }

    if (editingCampo) {
      data.id = editingCampo.id;
    }
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Enterprise Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0b1329]/90 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-xl ring-1 ring-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
              No-Code Engine
            </span>
            <span className="text-xs text-slate-400">· Motor de Esquema Dinámico PostgreSQL JSONB</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            {activeTab === 'forms' ? (
              <>
                <Sliders className="h-6 w-6 text-cyan-400" />
                <span>Studio de Esquemas y Atributos Dinámicos</span>
              </>
            ) : (
              <>
                <Columns className="h-6 w-6 text-cyan-400" />
                <span>Diseñador de Distribución de Tablas & Vistas</span>
              </>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {activeTab === 'forms' 
              ? 'Crea, reordena y valida campos en tiempo real sin ejecutar migraciones ni reiniciar los servidores.'
              : 'Configura qué columnas se ven, sus títulos, orden y ancho en las tablas del sistema (Bitácora, Génesis, BUSAE, Historial, E.E. Móviles).'}
          </p>
        </div>

        {activeTab === 'forms' && (
          <button
            onClick={() => { setEditingCampo(null); setIsModalOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Crear Nuevo Campo</span>
          </button>
        )}
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-2 bg-[#0b1329]/80 border border-slate-800 rounded-2xl p-1">
        <button
          onClick={() => setActiveTab('forms')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'forms'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Editor de Formularios Dinámicos</span>
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'tables'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Columns className="h-4 w-4" />
          <span>Distribución de Tablas & Vistas</span>
        </button>
      </div>

      {activeTab === 'forms' && (
        <>
          {/* Module Selector Tabs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {MODULE_PRESETS.map((mod) => {
              const Icon = mod.icon;
              const isSelected = selectedModulo === mod.name;
              return (
                <button
                  key={mod.id}
                  onClick={() => setSelectedModulo(mod.name)}
                  className={`flex flex-col text-left p-4 rounded-2xl border transition-all duration-200 ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#0e1e38] to-[#0a1526] border-cyan-500/50 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                      : 'bg-[#0b1329]/80 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className={`p-2 rounded-xl border ${isSelected ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    )}
                  </div>
                  <p className={`text-xs font-bold tracking-tight ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {mod.label}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                    {mod.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'tables' && (
        <>
          {/* Table Module Selector Tabs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {TABLE_MODULES.map((mod) => {
              const Icon = mod.icon;
              const isSelected = selectedTableModule === mod.name;
              return (
                <button
                  key={mod.id}
                  onClick={() => setSelectedTableModule(mod.name)}
                  className={`flex flex-col text-left p-4 rounded-2xl border transition-all duration-200 ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#0e1e38] to-[#0a1526] border-cyan-500/50 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                      : 'bg-[#0b1329]/80 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className={`p-2 rounded-xl border ${isSelected ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    )}
                  </div>
                  <p className={`text-xs font-bold tracking-tight ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {mod.label}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                    {mod.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Main Dual Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Field Registry Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between bg-[#0b1329]/90 px-4 py-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Campos Configurados en <span className="text-cyan-400 font-mono">"{selectedModulo}"</span>
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-800 text-slate-300 rounded-full border border-slate-700">
                {sortedCampos.length}
              </span>
            </div>
            <button
              onClick={() => refetchCampos()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Refrescar campos"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="bg-[#0b1329]/90 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#070b14] border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3 w-16 text-center">Orden</th>
                    <th className="py-3 px-4">Campo & Etiqueta</th>
                    <th className="py-3 px-3">Tipo</th>
                    <th className="py-3 px-3 text-center">Requerido</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {isLoadingCampos ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-500">
                        <div className="h-5 w-5 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto mb-2" />
                        <span>Cargando esquema dinámico...</span>
                      </td>
                    </tr>
                  ) : sortedCampos.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-500">
                        <Sparkles className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-300">No hay campos dinámicos en este módulo</p>
                        <p className="text-[11px] text-slate-500 mt-1">Haz clic en "Crear Nuevo Campo" para agregar atributos personalizados.</p>
                      </td>
                    </tr>
                  ) : (
                    sortedCampos.map((c, idx) => {
                      const typeConfig = FIELD_TYPES.find(t => t.value === c.tipo) || { label: c.tipo, badge: 'bg-slate-800 text-slate-300 border-slate-700' };
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition-colors group">
                          {/* Reorder Buttons */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="font-mono text-[11px] font-bold text-slate-400 w-4">{c.orden}</span>
                              <div className="flex flex-col gap-0.5">
                                <button
                                  disabled={idx === 0}
                                  onClick={() => handleMoveOrder(c, 'up')}
                                  className="text-slate-500 hover:text-cyan-300 disabled:opacity-20 p-0.5"
                                  title="Subir posición"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                  disabled={idx === sortedCampos.length - 1}
                                  onClick={() => handleMoveOrder(c, 'down')}
                                  className="text-slate-500 hover:text-cyan-300 disabled:opacity-20 p-0.5"
                                  title="Bajar posición"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Campo & Clave */}
                          <td className="py-3 px-4">
                            <p className="font-bold text-white text-xs">{c.etiqueta}</p>
                            <p className="text-[10px] font-mono text-cyan-400/80">{c.clave}</p>
                          </td>

                          {/* Tipo */}
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${typeConfig.badge}`}>
                              {typeConfig.label}
                            </span>
                          </td>

                          {/* Requerido */}
                          <td className="py-3 px-3 text-center">
                            {c.requerido ? (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                Requerido
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-mono">Opcional</span>
                            )}
                          </td>

                          {/* Activo toggle */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleToggleActive(c)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border ${
                                c.activo
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                                  : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'
                              }`}
                            >
                              {c.activo ? 'Activo' : 'Inactivo'}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleEdit(c)}
                                className="p-1.5 bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 rounded-lg transition-colors border border-slate-700/60"
                                title="Editar configuración"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(c.id)}
                                className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors border border-slate-700/60"
                                title="Eliminar campo"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Preview Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between bg-[#0b1329]/90 px-4 py-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-cyan-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Simulador en Tiempo Real
              </h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
              Vista de Campo Técnico
            </span>
          </div>

          {/* Interactive Preview Container */}
          <div className="bg-[#0b1329]/95 rounded-2xl border border-slate-800/90 p-5 shadow-2xl space-y-4 ring-1 ring-white/5">
            <div className="border-b border-slate-800 pb-3">
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <span>Formulario Técnico:</span>
                <span className="font-mono text-cyan-400 font-bold uppercase">{selectedModulo}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Así se comporta el formulario en vivo en la aplicación con validación de tipos y campos requeridos.
              </p>
            </div>

            <DynamicFormRenderer
              moduleName={selectedModulo}
              customCampos={sortedCampos.filter(c => c.activo)}
              onSubmit={(vals) => {
                setPreviewSubmission(vals);
              }}
            />

            {previewSubmission && (
              <div className="p-3.5 rounded-xl bg-[#070b14] border border-cyan-500/30 space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" />
                    Validación Exitosa (JSON Payload)
                  </span>
                  <button 
                    onClick={() => setPreviewSubmission(null)}
                    className="text-[10px] text-slate-500 hover:text-white"
                  >
                    Cerrar
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-cyan-300 bg-slate-900/80 p-2.5 rounded-lg overflow-x-auto max-h-36">
                  {JSON.stringify(previewSubmission, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'tables' && (
        <div className="space-y-6">
          {/* Table Distribution Designer */}
          <div className="bg-[#0b1329]/90 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Columns className="h-4 w-4 text-cyan-400" />
                    Catálogo de Columnas Disponibles para <span className="font-mono text-cyan-400">"{selectedTableModule}"</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Configura visibilidad, título personalizado, orden, ancho y alineación. Los cambios se aplican en tiempo real a la tabla correspondiente.
                  </p>
                </div>
                <button
                  onClick={saveTableColumns}
                  disabled={tableColumnsLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all shrink-0"
                >
                  {tableColumnsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Guardar Distribución</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
              {tableColumnsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  <span className="ml-3 text-slate-400">Cargando configuración de columnas...</span>
                </div>
              ) : (
                tableColumns.map((col, idx) => (
                  <div 
                    key={col.key} 
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      col.visible 
                        ? 'bg-[#070b14]/70 border-slate-800' 
                        : 'bg-slate-900/50 border-slate-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col gap-1 w-8 text-center">
                      <button 
                        onClick={() => moveColumn(idx, 'up')} 
                        disabled={idx === 0}
                        className="p-0.5 text-slate-500 hover:text-cyan-300 disabled:opacity-20" 
                        title="Subir"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-[10px] font-mono text-slate-400">{idx + 1}</span>
                      <button 
                        onClick={() => moveColumn(idx, 'down')} 
                        disabled={idx === tableColumns.length - 1}
                        className="p-0.5 text-slate-500 hover:text-cyan-300 disabled:opacity-20" 
                        title="Bajar"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <label className="flex items-center gap-2 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={col.visible}
                          onChange={(e) => toggleColumnVisibility(col.key, e.target.checked)}
                          className="h-4 w-4 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                        />
                        <Eye className="h-3.5 w-3.5 text-slate-400" />
                      </label>
                      
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => updateColumnLabel(col.key, e.target.value)}
                        className="text-xs bg-[#070b14] border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-cyan-500 min-w-[120px] max-w-[180px]"
                        disabled={!col.visible}
                      />
                      
                      <span className="text-[10px] font-mono text-slate-500 px-2 py-1 bg-slate-900 rounded border border-slate-800 shrink-0">
                        {col.source}
                      </span>
                    </div>

                    <select
                      value={col.width}
                      onChange={(e) => updateColumnWidth(col.key, e.target.value)}
                      disabled={!col.visible}
                      className="text-[10px] bg-[#070b14] border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-cyan-500 shrink-0"
                    >
                      <option value="w-16">Muy compacto</option>
                      <option value="w-20">Compacto</option>
                      <option value="w-24">Normal</option>
                      <option value="w-32">Ancho</option>
                      <option value="w-40">Muy ancho</option>
                      <option value="w-48">Extra ancho</option>
                    </select>

                    <select
                      value={col.align}
                      onChange={(e) => updateColumnAlign(col.key, e.target.value)}
                      disabled={!col.visible}
                      className="text-[10px] bg-[#070b14] border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-cyan-500 shrink-0"
                    >
                      <option value="left">Izquierda</option>
                      <option value="center">Centro</option>
                      <option value="right">Derecha</option>
                    </select>
                  </div>
                ))
              )}

              {(!tableColumns || tableColumns.length === 0) && !tableColumnsLoading && (
                <div className="text-center py-12 text-slate-500">
                  <Table className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-xs font-semibold text-slate-300">No hay columnas configuradas para este módulo</p>
                </div>
              )}
            </div>
          </div>

          {/* Live Table Preview */}
          <div className="bg-[#0b1329]/90 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Maximize2 className="h-4 w-4 text-cyan-400" />
                Simulador de Tabla en Vivo
              </h2>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                Vista previa con datos de muestra
              </span>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-max">
                <thead className="bg-[#070b14] border-b border-slate-800">
                  <tr>
                    {tableColumns && tableColumns
                      .filter(c => c.visible)
                      .sort((a, b) => tableColumns.indexOf(a) - tableColumns.indexOf(b))
                      .map((col, idx) => (
                        <th 
                          key={col.key}
                          className={`px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap ${col.align} ${col.width}`}
                        >
                          {col.label}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {[1, 2, 3].map((rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-800/40">
                      {tableColumns && tableColumns
                        .filter(c => c.visible)
                        .sort((a, b) => tableColumns.indexOf(a) - tableColumns.indexOf(b))
                        .map((col, colIdx) => (
                          <td key={col.key} className={`px-3 py-2 ${col.align} ${col.width} text-slate-300`}>
                            {getSampleData(col.key, rowIdx)}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar / Editar Campo */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-[#0b1329] border border-slate-700/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {editingCampo ? 'Modificar Campo Dinámico' : 'Configurar Nuevo Campo'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Módulo destino: <span className="font-mono text-cyan-400 font-bold">{selectedModulo}</span></p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Etiqueta Visible UI *
                  </label>
                  <input
                    type="text"
                    name="etiqueta"
                    required
                    defaultValue={editingCampo?.etiqueta || ''}
                    placeholder="ej. Voltaje de Batería"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070b14] border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Clave Interna (slug) *
                  </label>
                  <input
                    type="text"
                    name="clave"
                    required
                    defaultValue={editingCampo?.clave || ''}
                    placeholder="ej. voltaje_bateria"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070b14] border border-slate-800 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Tipo de Dato *
                  </label>
                  <select
                    name="tipo"
                    defaultValue={editingCampo?.tipo || 'TEXT'}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070b14] border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {FIELD_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Orden Numérico
                  </label>
                  <input
                    type="number"
                    name="orden"
                    defaultValue={editingCampo?.orden ?? sortedCampos.length + 1}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#070b14] border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Opciones (para SELECT / MULTISELECT / RADIO)
                </label>
                <input
                  type="text"
                  name="opciones"
                  defaultValue={editingCampo?.opciones ? editingCampo.opciones.join(', ') : ''}
                  placeholder="Separadas por comas ej: Operativo, Dañado, En Calibración"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#070b14] border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-6 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    name="requerido"
                    defaultChecked={editingCampo?.requerido}
                    className="h-4 w-4 rounded bg-[#070b14] border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>Campo Obligatorio</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    name="activo"
                    defaultChecked={editingCampo ? editingCampo.activo : true}
                    className="h-4 w-4 rounded bg-[#070b14] border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>Activo en Formulario</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {mutation.isPending ? 'Guardando...' : 'Guardar Campo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
