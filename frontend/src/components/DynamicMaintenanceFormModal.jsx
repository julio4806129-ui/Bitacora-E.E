import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import {
  X,
  Bus,
  Cpu,
  Radio,
  Check,
  AlertCircle,
  Wrench,
  CheckCircle2,
  Sliders,
  Shield,
  Hash,
  FileText,
  Loader2,
  Sparkles,
  Info
} from 'lucide-react';
import clsx from 'clsx';

export default function DynamicMaintenanceFormModal({ bus, onClose, source = 'reportes' }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [tipoMantenimiento, setTipoMantenimiento] = useState(
    source === 'inventario' ? 'INVENTARIO' : 'REVISION POR BITACORA'
  );
  const [patio, setPatio] = useState(bus?.patio_ubicacion || bus?.patio || 'CURUNDU');
  const [componentValues, setComponentValues] = useState({});
  const [identifiers, setIdentifiers] = useState({
    imei: bus?.imei || '',
    serie_sim: bus?.serie_sim || '',
    serie_ctap: bus?.serie_ctap || ''
  });
  const [respuestaTecnica, setRespuestaTecnica] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Obtener catálogo dinámico desde la API (organizado por categorías)
  const { data: categorias, isLoading: isLoadingCatalog } = useQuery({
    queryKey: ['catalogo-formulario'],
    queryFn: async () => {
      const res = await apiClient.get('/catalogo-componentes/formulario/');
      return res.data || [];
    },
    staleTime: 1000 * 60 * 5 // 5 minutos
  });

  // 2. Obtener activos ya asignados al bus (IMEI y series preexistentes)
  const { data: activosAsignados } = useQuery({
    queryKey: ['activos-bus', bus?.bus || bus?.bus_movil],
    queryFn: async () => {
      const busNum = bus?.bus || bus?.bus_movil;
      if (!busNum) return [];
      const res = await apiClient.get(`/activos-ee/?bus_asignado=${busNum}`);
      return res.data?.results || res.data || [];
    },
    enabled: !!(bus?.bus || bus?.bus_movil)
  });

  // Auto-llenar identificadores conocidos si existen
  useEffect(() => {
    if (activosAsignados && activosAsignados.length > 0) {
      const newIds = { ...identifiers };
      activosAsignados.forEach(act => {
        if (act.imei && !newIds.imei) newIds.imei = act.imei;
        if (act.tipo_nombre?.toLowerCase().includes('sim') && act.serie && !newIds.serie_sim) {
          newIds.serie_sim = act.serie;
        }
        if (act.tipo_nombre?.toLowerCase().includes('ctap') && act.serie && !newIds.serie_ctap) {
          newIds.serie_ctap = act.serie;
        }
      });
      setIdentifiers(newIds);
    }
  }, [activosAsignados]);

  // Inicializar opciones por defecto (ej. primera opción operativa)
  useEffect(() => {
    if (categorias && categorias.length > 0) {
      const defaults = { ...componentValues };
      categorias.forEach(cat => {
        cat.componentes?.forEach(comp => {
          if (!defaults[comp.clave]) {
            // Seleccionar por defecto la primera opción operativa o la primera disponible
            const opcOp = comp.opciones?.find(o => o.tipo_estado === 'OPERATIVO') || comp.opciones?.[0];
            if (opcOp) {
              defaults[comp.clave] = {
                opcion_valor: opcOp.valor,
                serie: '',
                imei: '',
                observaciones: ''
              };
            }
          }
        });
      });
      setComponentValues(defaults);
    }
  }, [categorias]);

  // Manejador de selección de opción para un componente
  const handleSelectOption = (clave, valor) => {
    setComponentValues(prev => ({
      ...prev,
      [clave]: {
        ...(prev[clave] || {}),
        opcion_valor: valor
      }
    }));
  };

  // Mutación para guardar la atención atómicamente
  const saveMut = useMutation({
    mutationFn: async (payload) => {
      return apiClient.post('/registros-bitacora/atender/', payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['bitacora-tabla'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['activos-ee'] });
      queryClient.invalidateQueries({ queryKey: ['reportes-pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['historial-atenciones'] });
      queryClient.invalidateQueries({ queryKey: ['planes-mantenimiento'] });
      onClose();
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Error al registrar la atención técnica.';
      setErrorMsg(msg);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!respuestaTecnica.trim()) {
      setErrorMsg('La Respuesta Técnica / Solución es obligatoria.');
      return;
    }

    const busNumero = bus?.bus || bus?.bus_movil;
    if (!busNumero) {
      setErrorMsg('Número de bus inválido.');
      return;
    }

    // Preparar lista de revisiones de componentes
    const revisionesArray = Object.entries(componentValues).map(([clave, datos]) => ({
      clave,
      opcion_valor: datos.opcion_valor,
      serie: clave === 'sim_card' ? identifiers.serie_sim : clave === 'ctap' ? identifiers.serie_ctap : (datos.serie || ''),
      imei: clave === 'modem' ? identifiers.imei : (datos.imei || ''),
      observaciones: datos.observaciones || ''
    }));

    const payload = {
      bus_movil: busNumero,
      patio: patio,
      tipo_atencion: tipoMantenimiento,
      tipo_mantenimiento: tipoMantenimiento,
      respuesta_tecnica: respuestaTecnica.trim(),
      observaciones: observaciones.trim(),
      source: source,
      reportId: bus?.report_id || bus?.reportId || null,
      imei_busae: identifiers.imei,
      serie_sim: identifiers.serie_sim,
      serie_ctap: identifiers.serie_ctap,
      revisiones_componentes: revisionesArray
    };

    saveMut.mutate(payload);
  };

  const getBadgeColor = (color, isSelected) => {
    if (!isSelected) {
      return 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200';
    }
    switch (color) {
      case 'emerald':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-md shadow-emerald-500/10 font-bold';
      case 'rose':
        return 'bg-rose-500/25 text-rose-300 border-rose-500/60 shadow-md shadow-rose-500/10 font-bold';
      case 'amber':
        return 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-md shadow-amber-500/10 font-bold';
      case 'cyan':
        return 'bg-cyan-500/25 text-cyan-300 border-cyan-500/60 shadow-md shadow-cyan-500/10 font-bold';
      case 'blue':
        return 'bg-blue-500/25 text-blue-300 border-blue-500/60 shadow-md shadow-blue-500/10 font-bold';
      default:
        return 'bg-slate-700 text-white border-slate-600 font-bold';
    }
  };

  const busNumero = bus?.bus || bus?.bus_movil || '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-hidden">
      <div 
        className="relative bg-[#0b1329] rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-700/80 overflow-hidden ring-1 ring-white/10 flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#070b14]/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-white text-base tracking-tight flex items-center gap-2.5">
                <span>Registro de Mantenimiento · Móvil #{busNumero}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-semibold">
                  {bus?.placa || 'Placa Flota'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                <span>Patio: <strong className="text-cyan-300">{patio}</strong></span>
                <span>·</span>
                <span>Técnico: <strong className="text-white">{user?.nombre || user?.username}</strong> ({user?.codigo_empleado || 'N/A'})</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            
            {/* Header Form Controls */}
            <div className="p-4 rounded-xl bg-[#070b14]/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Radio className="h-4 w-4 text-cyan-400" />
                  Cabecera Operativa de Atención
                </h3>
                <span className="text-[10px] text-cyan-400/80 font-mono">Formulario Dinámico Enterprise</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Móvil *</label>
                  <input 
                    type="text" 
                    value={busNumero} 
                    readOnly 
                    className="w-full border border-slate-800 rounded-xl px-3 py-2 text-xs bg-slate-900 text-cyan-300 font-mono font-bold cursor-not-allowed" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Tipo de Mantenimiento *</label>
                  <select 
                    value={tipoMantenimiento} 
                    onChange={e => setTipoMantenimiento(e.target.value)}
                    className="w-full border border-slate-800 rounded-xl px-3 py-2 text-xs bg-slate-900 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="REVISION POR BITACORA">Revisión Por Bitácora</option>
                    <option value="INVENTARIO">Inventario</option>
                    <option value="ACTUALIZACION DE FIRMWARE">Actualización de Firmware</option>
                    <option value="INSTALACION GPS">Instalación Sistema GPS</option>
                    <option value="MANTENIMIENTO PREVENTIVO">Mantenimiento Preventivo E.E.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Patio de Atención *</label>
                  <select 
                    value={patio} 
                    onChange={e => setPatio(e.target.value)}
                    className="w-full border border-slate-800 rounded-xl px-3 py-2 text-xs bg-slate-900 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="CURUNDU">Curundú</option>
                    <option value="LOS PUEBLOS">Los Pueblos</option>
                    <option value="OJO DE AGUA">Ojo de Agua</option>
                    <option value="LA CABIMA">La Cabima</option>
                    <option value="CHORRILLO">Chorrillo</option>
                    <option value="LA DONA">La Doña</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dynamic Categories & Components Checklist */}
            {isLoadingCatalog ? (
              <div className="p-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Cargando catálogo dinámico de componentes...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {categorias?.map((cat) => (
                  <div key={cat.codigo} className="p-4 rounded-xl bg-[#070b14]/60 border border-slate-800/90 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-cyan-400" />
                        {cat.titulo}
                      </h3>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {cat.componentes?.length} componente(s)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cat.componentes?.map((comp) => {
                        const currentVal = componentValues[comp.clave]?.opcion_valor;
                        return (
                          <div 
                            key={comp.id} 
                            className="p-3.5 rounded-xl bg-[#0b1329] border border-slate-800/90 space-y-2.5 hover:border-slate-700 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                <span>{comp.nombre}</span>
                                {comp.requiere_imei && (
                                  <span className="text-[9px] font-mono px-1 py-0.2 bg-cyan-500/10 text-cyan-400 rounded">
                                    IMEI
                                  </span>
                                )}
                                {comp.requiere_serie && (
                                  <span className="text-[9px] font-mono px-1 py-0.2 bg-indigo-500/10 text-indigo-400 rounded">
                                    Serie
                                  </span>
                                )}
                              </label>
                              <span className="text-[10px] font-mono text-slate-400 font-semibold">
                                {currentVal || 'Sin seleccionar'}
                              </span>
                            </div>

                            {/* Option Chips / Radio Pills */}
                            <div className="flex flex-wrap gap-1.5">
                              {comp.opciones?.map((opc) => {
                                const isSelected = currentVal === opc.valor;
                                return (
                                  <button
                                    key={opc.id}
                                    type="button"
                                    onClick={() => handleSelectOption(comp.clave, opc.valor)}
                                    className={clsx(
                                      'px-2.5 py-1 rounded-lg text-[10px] tracking-wide border transition-all flex items-center gap-1 cursor-pointer',
                                      getBadgeColor(opc.color, isSelected)
                                    )}
                                  >
                                    {isSelected && <Check className="w-3 h-3 shrink-0" />}
                                    <span>{opc.etiqueta}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Hardware Identifiers & Serial Numbers Section */}
            <div className="p-4 rounded-xl bg-[#070b14]/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                  <Hash className="h-4 w-4 text-indigo-400" />
                  Identificadores de Hardware (Inventario E.E.)
                </h3>
                <span className="text-[10px] text-slate-400">Asociación automática al activo físico</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">IMEI Módem BUSAE</label>
                  <input 
                    type="text" 
                    maxLength={18}
                    value={identifiers.imei} 
                    onChange={e => setIdentifiers(prev => ({ ...prev, imei: e.target.value.trim() }))}
                    placeholder="Ej. 86420904001050" 
                    className="w-full border border-slate-800 rounded-xl px-3 py-2 text-xs bg-slate-900 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Serie SIM Card</label>
                  <input 
                    type="text" 
                    value={identifiers.serie_sim} 
                    onChange={e => setIdentifiers(prev => ({ ...prev, serie_sim: e.target.value.trim() }))}
                    placeholder="Ej. 89507120001050" 
                    className="w-full border border-slate-800 rounded-xl px-3 py-2 text-xs bg-slate-900 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Serie Consola CTAP</label>
                  <input 
                    type="text" 
                    value={identifiers.serie_ctap} 
                    onChange={e => setIdentifiers(prev => ({ ...prev, serie_ctap: e.target.value.trim() }))}
                    placeholder="Ej. CTAP-2024-1050" 
                    className="w-full border border-slate-800 rounded-xl px-3 py-2 text-xs bg-slate-900 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Closing Technical Notes */}
            <div className="p-4 rounded-xl bg-[#070b14]/80 border border-slate-800 space-y-4 border-l-4 border-emerald-500">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Cierre de Atención Técnica & Solución
              </h3>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                  Respuesta Técnica / Solución Aplicada *
                </label>
                <textarea 
                  rows={3}
                  value={respuestaTecnica}
                  onChange={e => setRespuestaTecnica(e.target.value)}
                  placeholder="Describa el trabajo realizado: reconexión de arnés, reemplazo de SIM Card, ajuste de antena de techo, reinicio de módem..."
                  className="w-full border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs bg-[#0b1329] text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500 resize-none font-sans"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                  Observaciones / Recomendaciones
                </label>
                <textarea 
                  rows={2}
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  placeholder="Detalles para próximo turno, cableado desgastado, seguimiento preventivo..."
                  className="w-full border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs bg-[#0b1329] text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500 resize-none font-sans"
                />
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-[#070b14]/90 shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={saveMut.isPending || !respuestaTecnica.trim()} 
              className="flex items-center gap-2 px-6 py-2 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-all cursor-pointer"
            >
              {saveMut.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando Atención...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Cerrar & Guardar Atención</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
