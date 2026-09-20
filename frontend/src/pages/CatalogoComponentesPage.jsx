import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import {
  Sliders,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Cpu,
  Layers,
  AlertCircle,
  Tag,
  Hash,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Loader2
} from 'lucide-react';
import clsx from 'clsx';

export default function CatalogoComponentesPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCompForOptions, setSelectedCompForOptions] = useState(null);

  // Consulta de componentes
  const { data: componentes, isLoading } = useQuery({
    queryKey: ['catalogo-componentes'],
    queryFn: async () => {
      const res = await apiClient.get('/catalogo-componentes/');
      return res.data?.results || res.data || [];
    }
  });

  // Mutación para toggle activo
  const toggleMut = useMutation({
    mutationFn: async ({ id, activo }) => apiClient.patch(`/catalogo-componentes/${id}/`, { activo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo-componentes'] });
      queryClient.invalidateQueries({ queryKey: ['catalogo-formulario'] });
    }
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs mb-1">
            <Sliders className="w-4 h-4" />
            <span>CATÁLOGO DINÁMICO EN BASE DE DATOS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Catálogo de Componentes E.E.</span>
            <span className="text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
              100% Configurable
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Agrega o renombra componentes a revisar y define sus opciones de estado sin tocar código ni reiniciar la plataforma.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Componente</span>
        </button>
      </div>

      {/* Grid of Components */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400 mb-2" />
          Cargando catálogo...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {componentes?.map((comp) => (
            <div
              key={comp.id}
              className={clsx(
                'p-5 rounded-2xl bg-[#0b1329] border transition-all space-y-3.5 flex flex-col justify-between shadow-xl',
                comp.activo ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/40 opacity-60'
              )}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                      {comp.categoria_display || comp.categoria}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1.5 flex items-center gap-2">
                      <span>{comp.nombre}</span>
                      <span className="text-[10px] font-mono text-slate-500">({comp.clave})</span>
                    </h3>
                  </div>

                  <button
                    onClick={() => toggleMut.mutate({ id: comp.id, activo: !comp.activo })}
                    className="text-slate-400 hover:text-white p-1"
                    title={comp.activo ? 'Desactivar componente' : 'Activar componente'}
                  >
                    {comp.activo ? (
                      <ToggleRight className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-600" />
                    )}
                  </button>
                </div>

                {comp.descripcion && (
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                    {comp.descripcion}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-400 font-mono">
                  {comp.requiere_imei && (
                    <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-300">
                      Pide IMEI
                    </span>
                  )}
                  {comp.requiere_serie && (
                    <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-indigo-300">
                      Pide Serie
                    </span>
                  )}
                  <span className="text-slate-500">Orden: #{comp.orden}</span>
                </div>
              </div>

              {/* Status Options Preview */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-semibold">Opciones de Estado ({comp.opciones?.length || 0}):</span>
                  <button
                    onClick={() => setSelectedCompForOptions(comp)}
                    className="text-cyan-400 hover:text-cyan-300 text-[11px] font-bold"
                  >
                    Gestionar Opciones →
                  </button>
                </div>

                <div className="flex flex-wrap gap-1">
                  {comp.opciones?.map((opc) => (
                    <span
                      key={opc.id}
                      className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-mono border',
                        opc.tipo_estado === 'OPERATIVO' && 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
                        opc.tipo_estado === 'FALLA_CRITICA' && 'bg-rose-500/10 text-rose-300 border-rose-500/30',
                        opc.tipo_estado === 'ADECUACION_PENDIENTE' && 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                        opc.tipo_estado === 'NO_APLICA' && 'bg-slate-800 text-slate-400 border-slate-700'
                      )}
                    >
                      {opc.etiqueta}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Crear Componente */}
      {showCreateModal && (
        <CreateComponenteModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['catalogo-componentes'] });
            queryClient.invalidateQueries({ queryKey: ['catalogo-formulario'] });
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Modal: Gestionar Opciones */}
      {selectedCompForOptions && (
        <ManageOptionsModal
          componente={selectedCompForOptions}
          onClose={() => setSelectedCompForOptions(null)}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['catalogo-componentes'] });
            queryClient.invalidateQueries({ queryKey: ['catalogo-formulario'] });
          }}
        />
      )}
    </div>
  );
}

// Subcomponente: Modal Crear Componente
function CreateComponenteModal({ onClose, onCreated }) {
  const [nombre, setNombre] = useState('');
  const [clave, setClave] = useState('');
  const [categoria, setCategoria] = useState('TELEMETRIA_GPS');
  const [orden, setOrden] = useState(10);
  const [requiereSerie, setRequiereSerie] = useState(false);
  const [requiereImei, setRequiereImei] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: async (payload) => apiClient.post('/catalogo-componentes/', payload),
    onSuccess: () => onCreated(),
    onError: (err) => setError(err?.response?.data?.message || err?.response?.data?.clave?.[0] || 'Error al crear componente.')
  });

  const handleNombreChange = (val) => {
    setNombre(val);
    // Generar clave slug automática
    setClave(val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "_").replace(/^_+|_+$/g, ""));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim() || !clave.trim()) {
      setError('El nombre y la clave son obligatorios.');
      return;
    }

    mut.mutate({
      nombre: nombre.trim(),
      clave: clave.trim(),
      categoria,
      orden: parseInt(orden) || 1,
      requiere_serie: requiereSerie,
      requiere_imei: requiereImei,
      descripcion: descripcion.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b1329] rounded-2xl border border-slate-700 w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#070b14]">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>Nuevo Componente de Catálogo</span>
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Nombre del Componente *</label>
            <input
              type="text"
              value={nombre}
              onChange={e => handleNombreChange(e.target.value)}
              placeholder="Ej. Sensor de Pasajeros APC"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Clave Slug *</label>
              <input
                type="text"
                value={clave}
                onChange={e => setClave(e.target.value.toLowerCase())}
                placeholder="sensor_apc"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Categoría</label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="TELEMETRIA_GPS">Telemetría & GPS</option>
                <option value="AUDIO_ALERTAS">Audio & Alertas</option>
                <option value="COMUNICACIONES_CTAP">Comunicaciones & CTAP</option>
                <option value="SENSORES_BOTONES">Sensores & Botones</option>
                <option value="ENERGIA_CABLEADO">Energía & Cableado</option>
                <option value="OTROS">Otros</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 py-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={requiereImei}
                onChange={e => setRequiereImei(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
              />
              <span>Solicitar IMEI</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={requiereSerie}
                onChange={e => setRequiereSerie(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0"
              />
              <span>Solicitar Serie</span>
            </label>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Descripción</label>
            <textarea
              rows={2}
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Función del componente en la flota..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {error && <p className="text-rose-400 font-semibold">{error}</p>}

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
              className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20"
            >
              {mut.isPending ? 'Guardando...' : 'Crear Componente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Subcomponente: Modal Gestionar Opciones de Estado
function ManageOptionsModal({ componente, onClose, onUpdated }) {
  const [etiqueta, setEtiqueta] = useState('');
  const [valor, setValor] = useState('');
  const [tipoEstado, setTipoEstado] = useState('OPERATIVO');
  const [color, setColor] = useState('emerald');
  const [esFalla, setEsFalla] = useState(false);

  const mutAdd = useMutation({
    mutationFn: async (payload) => apiClient.post('/opciones-componentes/', payload),
    onSuccess: () => {
      setEtiqueta('');
      setValor('');
      onUpdated();
    }
  });

  const mutDel = useMutation({
    mutationFn: async (id) => apiClient.delete(`/opciones-componentes/${id}/`),
    onSuccess: () => onUpdated()
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!etiqueta.trim()) return;
    const finalVal = valor.trim() || etiqueta.trim().toUpperCase();

    mutAdd.mutate({
      componente: componente.id,
      etiqueta: etiqueta.trim().toUpperCase(),
      valor: finalVal,
      tipo_estado: tipoEstado,
      color,
      es_falla: esFalla,
      orden: (componente.opciones?.length || 0) + 1
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b1329] rounded-2xl border border-slate-700 w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#070b14]">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Opciones de Estado: {componente.nombre}</span>
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Current Options List */}
          <div className="space-y-2">
            <h4 className="text-slate-400 font-semibold uppercase text-[10px]">Opciones Actuales</h4>
            <div className="space-y-1.5">
              {componente.opciones?.map((opc) => (
                <div key={opc.id} className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-[10px] font-mono border font-bold',
                      opc.tipo_estado === 'OPERATIVO' && 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
                      opc.tipo_estado === 'FALLA_CRITICA' && 'bg-rose-500/10 text-rose-300 border-rose-500/30',
                      opc.tipo_estado === 'ADECUACION_PENDIENTE' && 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                      opc.tipo_estado === 'NO_APLICA' && 'bg-slate-800 text-slate-400 border-slate-700'
                    )}>
                      {opc.etiqueta}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">[{opc.tipo_estado}]</span>
                  </div>

                  <button
                    onClick={() => mutDel.mutate(opc.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                    title="Eliminar opción"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Option Form */}
          <form onSubmit={handleAdd} className="pt-4 border-t border-slate-800 space-y-3">
            <h4 className="text-cyan-400 font-bold uppercase text-[10px]">Agregar Nueva Opción</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Etiqueta Visual *</label>
                <input
                  type="text"
                  value={etiqueta}
                  onChange={e => setEtiqueta(e.target.value)}
                  placeholder="Ej. DESCALIBRADO"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white uppercase focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tipo de Estado</label>
                <select
                  value={tipoEstado}
                  onChange={e => {
                    setTipoEstado(e.target.value);
                    if (e.target.value === 'OPERATIVO') setColor('emerald');
                    else if (e.target.value === 'FALLA_CRITICA') { setColor('rose'); setEsFalla(true); }
                    else if (e.target.value === 'ADECUACION_PENDIENTE') setColor('amber');
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="OPERATIVO">Operativo / Normal</option>
                  <option value="FALLA_CRITICA">Falla Crítica</option>
                  <option value="ADECUACION_PENDIENTE">Por Adecuar / Instalar</option>
                  <option value="NO_APLICA">No Aplica / No Tiene</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={mutAdd.isPending}
              className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Opción</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
