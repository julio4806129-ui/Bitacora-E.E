import React, { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Bus, 
  Search, 
  Plus, 
  Upload, 
  RefreshCw, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp,
  ChevronDown, 
  Pencil, 
  AlertCircle, 
  CheckCircle2, 
  Radio, 
  MapPin, 
  Clock, 
  User, 
  FileSpreadsheet, 
  Save, 
  Loader2, 
  Activity,
  Sliders,
  Sparkles,
  ShieldCheck,
  Check,
  Columns,
  Eye,
  EyeOff
} from "lucide-react";
import apiClient from "../api/client";
import { useAuth } from "../hooks/useAuth";
import DynamicFormRenderer from "../components/DynamicFormRenderer";
import { formatBusNumber, nextSort } from "../utils/busNumber";
import SortableTh from "../components/SortableTh";

const PATIOS = ["LOS PUEBLOS", "RELEVO CA", "CURUNDU", "OJO DE AGUA", "LA DONA", "CHORRILLO", "LA CABIMA"];
const PAGE_SIZES = [20, 50, 100];

const GPS_CFG = {
  "Active":     { label: "Activo (GPS OK)",     cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400 animate-pulse" },
  "Stopped":    { label: "Detenido",            cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",       dot: "bg-amber-400" },
  "Offline":    { label: "Sin Transmisión",     cls: "bg-orange-500/15 text-orange-300 border-orange-500/30",    dot: "bg-orange-500 animate-ping" },
  "No records": { label: "Sin Señal / Crítico", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30",          dot: "bg-rose-500" },
  "Sin datos":  { label: "Sin Datos",           cls: "bg-slate-800 text-slate-400 border-slate-700",             dot: "bg-slate-500" },
};

const GEN_CFG = {
  "Operativo":   { label: "Operativo",   cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  "Inoperativo": { label: "Inoperativo", cls: "bg-slate-800 text-slate-400 border-slate-700" },
};

const ML_CFG = {
  "Si": { label: "Manos Libres OK", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  "No": { label: "Sin M.L.",        cls: "bg-slate-800 text-slate-400 border-slate-700" },
};

function Pill({ config, value }) {
  const c = config[value] || { label: value, cls: "bg-slate-800 text-slate-400 border-slate-700" };
  return (
    <span className={`inline-flex items-center gap-1.5 border text-[10px] font-mono font-bold px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${c.cls}`}>
      {c.dot && <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />}
      {c.label}
    </span>
  );
}

const DEFAULT_COLUMNS_BITACORA = [
  { key: "bus", label: "MÓVIL", visible: true, width: "compact", align: "left" },
  { key: "placa", label: "PLACA", visible: true, width: "compact", align: "left" },
  { key: "estado_gps", label: "ESTADO GPS", visible: true, width: "normal", align: "center" },
  { key: "manos_libres", label: "MANOS LIBRES", visible: true, width: "normal", align: "center" },
  { key: "estado_genesis", label: "ESTADO GENESIS", visible: true, width: "normal", align: "center" },
  { key: "patio_ubicacion", label: "PATIO", visible: true, width: "normal", align: "left" },
  { key: "hora_entrada", label: "HORA ENTRADA", visible: true, width: "compact", align: "center" },
  { key: "ultima_revision", label: "ÚLTIMA REVISIÓN", visible: true, width: "normal", align: "center" },
  { key: "tecnico", label: "TÉCNICO", visible: true, width: "normal", align: "left" },
];

async function fetchTableConfig(module) {
  try {
    const res = await apiClient.get(`/configuracion/distribucion-tabla/${module}/`);
    return res?.columnas || DEFAULT_COLUMNS_BITACORA;
  } catch {
    return DEFAULT_COLUMNS_BITACORA;
  }
}

async function saveTableConfig(module, columnas) {
  try {
    await apiClient.post(`/configuracion/distribucion-tabla/${module}/`, { columnas });
    return true;
  } catch (e) {
    console.error('Error saving table config:', e);
    return false;
  }
}

function AtencionModal({ bus, onClose }) {
  const { user, setShiftCounter, refreshCounter } = useAuth();
  const queryClient = useQueryClient();
  const [dynamicValues, setDynamicValues] = useState({});
  const [respuestaTecnica, setRespuestaTecnica] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [tipoMant, setTipoMant] = useState("Revision por Bitacora");

  const saveMut = useMutation({
    mutationFn: (payload) => apiClient.post("/registros-bitacora/atender/", payload),
    onSuccess: (data) => {
      if (data?.nuevo_contador != null && setShiftCounter) {
        setShiftCounter(data.nuevo_contador);
      } else if (refreshCounter) {
        refreshCounter();
      }
      queryClient.invalidateQueries({ queryKey: ["bitacora-tabla"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onClose();
    },
  });

  const handleSave = () => {
    if (!respuestaTecnica.trim()) return;
    saveMut.mutate({
      bus_movil: bus.bus,
      patio: bus.patio_ubicacion || "CURUNDU",
      tipo_mantenimiento: tipoMant,
      respuesta_tecnica: respuestaTecnica.trim(),
      observaciones: observaciones.trim(),
      datos_dinamicos: dynamicValues,
      source: "bitacora",
      estado_gps: bus.estado_gps || "",
      placa: bus.placa || "",
    });
  };

  const gpsLabel = (bus.estado_gps || "").toString();
  const gpsTone =
    /active|ok|on/i.test(gpsLabel) ? "emerald" :
    /stop|deten/i.test(gpsLabel) ? "amber" :
    /off|sin|no record/i.test(gpsLabel) ? "rose" : "slate";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full sm:max-w-xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-[#0b1329] border border-slate-700/70 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header compacto */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-[#070b14] to-[#0b1329]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Bus className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-black text-white tracking-tight">
                    Móvil {formatBusNumber(bus.bus)}
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700 text-slate-300">
                    {bus.placa || "Sin placa"}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border bg-${gpsTone}-500/15 border-${gpsTone}-500/30 text-${gpsTone}-300`}>
                    {gpsLabel || "GPS N/A"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  <span className="text-cyan-300/90 font-medium">{bus.patio_ubicacion || "—"}</span>
                  <span className="mx-1.5 text-slate-600">·</span>
                  {user?.nombre || user?.username || "Técnico"}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Tipo de atención */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Tipo de atención</label>
            <div className="flex flex-wrap gap-2">
              {["Revision por Bitacora", "Correctivo", "Preventivo", "Diagnostico"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipoMant(t)}
                  className={clsx(
                    "px-3 py-1.5 rounded-full text-[11px] font-semibold border transition",
                    tipoMant === t
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200"
                      : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600"
                  )}
                >
                  {t.replace("Revision por Bitacora", "Revisión")}
                </button>
              ))}
            </div>
          </div>

          {/* Inspección dinámica */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Checklist de inspección
              </h3>
              <span className="text-[9px] font-mono text-slate-600">Schema · bitacora</span>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-[#070b14]/50 p-3.5">
              <DynamicFormRenderer
                moduleName="bitacora"
                initialData={dynamicValues}
                onChange={setDynamicValues}
                hideSubmit
                isReadOnly={false}
              />
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5">
              Los campos se configuran en Schema Editor (tipos, obligatorios, opciones).
            </p>
          </div>

          {/* Cierre */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-3">
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-200">
                Respuesta técnica <span className="text-rose-400">*</span>
              </span>
              <textarea
                rows={3}
                value={respuestaTecnica}
                onChange={(e) => setRespuestaTecnica(e.target.value)}
                placeholder="Qué se revisó, qué se corrigió, resultado..."
                className="mt-1.5 w-full rounded-lg bg-[#0a1020] border border-slate-700/80 px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-emerald-500/50 resize-none"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-400">Observaciones</span>
              <textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Opcional: recomendaciones, repuestos..."
                className="mt-1.5 w-full rounded-lg bg-[#0a1020] border border-slate-700/80 px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-cyan-500/40 resize-none"
              />
            </label>
            {saveMut.isError && (
              <div className="flex items-center gap-2 text-xs text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                {saveMut.error?.userMessage || saveMut.error?.response?.data?.message || "Error al registrar"}
              </div>
            )}
          </div>
        </div>

        {/* Footer único CTA */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-t border-slate-800 bg-[#070b14]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white rounded-xl border border-slate-800 hover:bg-slate-800/80 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMut.isPending || !respuestaTecnica.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition"
          >
            {saveMut.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Registrar atención</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function CargaMasivaModal({ onClose }) {
  const queryClient = useQueryClient();
  const fileRef = useRef();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const mut = useMutation({
    mutationFn: async f => { 
      const fd = new FormData(); 
      fd.append("archivo", f); 
      return apiClient.post("/bitacora/carga-masiva/", fd, { headers: { "Content-Type": "multipart/form-data" } }); 
    },
    onSuccess: d => { 
      setResult(d); 
      queryClient.invalidateQueries({ queryKey: ["bitacora-tabla"] }); 
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-[#0b1329] rounded-2xl shadow-2xl w-full max-w-md border border-slate-700/80 overflow-hidden ring-1 ring-white/10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#070b14]/80">
          <h2 className="font-bold text-white text-sm flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Carga Masiva de Flota
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-3.5">
            <p className="text-xs font-bold text-cyan-300 mb-1.5">Cabeceras esperadas (CSV / XLSX):</p>
            <code className="block text-[10px] text-cyan-400 bg-black/50 rounded-lg p-2 font-mono">
              bus,placa,patio,estado_gps,estado_genesis,hora_entrada
            </code>
          </div>

          {!result ? (
            <>
              <div 
                onClick={() => fileRef.current?.click()} 
                className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-950/10 transition-all"
              >
                <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-white">{file ? file.name : "Selecciona o arrastra tu archivo"}</p>
                <p className="text-[10px] text-slate-500 mt-1">Formato CSV, XLS o XLSX hasta 15MB</p>
                <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={e=>setFile(e.target.files[0])} />
              </div>
              {mut.isError && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
                  <AlertCircle className="w-4 h-4" /> Error al procesar el archivo.
                </div>
              )}
            </>
          ) : (
            <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-4 text-center">
              <Check className="h-6 w-6 text-emerald-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-emerald-300">Carga Procesada con Éxito</p>
              <p className="text-[11px] text-emerald-400/90 mt-1">
                Buses creados: {result.creados} · Actualizados: {result.actualizados}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-800 bg-[#070b14]/80">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">
            {result ? "Cerrar" : "Cancelar"}
          </button>
          {!result && (
            <button 
              onClick={() => file && mut.mutate(file)} 
              disabled={!file || mut.isPending}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-md shadow-cyan-600/25 disabled:opacity-50"
            >
              {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>} 
              Procesar Archivo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AgregarBusModal({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    bus_movil: "", 
    placa: "", 
    patio_ubicacion: "CURUNDU", 
    estado_genesis: "Operativo", 
    hora_entrada: "", 
    estado_gps: "Active"
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: d => apiClient.post("/bitacora/tabla/", d),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["bitacora-tabla"] }); 
      onClose(); 
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-[#0b1329] rounded-2xl shadow-2xl w-full max-w-md border border-slate-700/80 overflow-hidden ring-1 ring-white/10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#070b14]/80">
          <h2 className="font-bold text-white text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-cyan-400" /> Alta Manual de Móvil
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">N° Bus *</label>
              <input 
                type="number" 
                value={form.bus_movil} 
                onChange={e=>set("bus_movil",e.target.value)} 
                className="w-full border border-slate-800 rounded-xl px-3 py-2 text-xs bg-[#070b14] text-white font-mono focus:outline-none focus:border-cyan-500" 
                placeholder="ej. 1042"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Placa</label>
              <input 
                type="text" 
                value={form.placa} 
                onChange={e=>set("placa",e.target.value)} 
                className="w-full border border-slate-800 rounded-xl px-3 py-2 text-xs bg-[#070b14] text-white focus:outline-none focus:border-cyan-500" 
                placeholder="ej. MB1042"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Patio Ubicación</label>
              <select 
                value={form.patio_ubicacion} 
                onChange={e=>set("patio_ubicacion",e.target.value)}
                className="w-full border border-slate-800 rounded-xl px-3 py-2 text-xs bg-[#070b14] text-white focus:outline-none focus:border-cyan-500"
              >
                {PATIOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Estado GPS</label>
              <select 
                value={form.estado_gps} 
                onChange={e=>set("estado_gps",e.target.value)}
                className="w-full border border-slate-800 rounded-xl px-3 py-2 text-xs bg-[#070b14] text-white focus:outline-none focus:border-cyan-500"
              >
                {Object.keys(GPS_CFG).map(k => <option key={k} value={k}>{GPS_CFG[k].label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Hora Entrada</label>
              <input 
                type="time" 
                value={form.hora_entrada} 
                onChange={e=>set("hora_entrada",e.target.value)} 
                className="w-full border border-slate-800 rounded-xl px-3 py-2 text-xs bg-[#070b14] text-white focus:outline-none focus:border-cyan-500" 
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Estado Genesis</label>
              <select 
                value={form.estado_genesis} 
                onChange={e=>set("estado_genesis",e.target.value)}
                className="w-full border border-slate-800 rounded-xl px-3 py-2 text-xs bg-[#070b14] text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Operativo">Operativo</option>
                <option value="Inoperativo">Inoperativo</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-800 bg-[#070b14]/80">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">
            Cancelar
          </button>
          <button 
            onClick={() => mut.mutate(form)} 
            disabled={mut.isPending || !form.bus_movil}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-md shadow-cyan-600/25 disabled:opacity-50"
          >
            {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>} 
            Guardar Móvil
          </button>
        </div>
      </div>
    </div>
  );
}

function ColumnConfigModal({ columns, onSave, onClose, moduleKey }) {
  const [localColumns, setLocalColumns] = useState(columns);
  const [showAll, setShowAll] = useState(true);

  const handleToggle = (key) => {
    setLocalColumns(prev => prev.map(c => 
      c.key === key ? { ...c, visible: !c.visible } : c
    ));
  };

  const handleMove = (index, direction) => {
    const newColumns = [...localColumns];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newColumns.length) return;
    [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
    setLocalColumns(newColumns);
  };

  const handleLabelChange = (key, label) => {
    setLocalColumns(prev => prev.map(c => 
      c.key === key ? { ...c, label } : c
    ));
  };

  const handleWidthChange = (key, width) => {
    setLocalColumns(prev => prev.map(c => 
      c.key === key ? { ...c, width } : c
    ));
  };

  const handleAlignChange = (key, align) => {
    setLocalColumns(prev => prev.map(c => 
      c.key === key ? { ...c, align } : c
    ));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative bg-[#0b1329] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] border border-slate-700/80 overflow-hidden ring-1 ring-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#070b14]/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Columns className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Diseñador de Columnas · {moduleKey}</h3>
              <p className="text-[11px] text-slate-400">Configura visibilidad, orden, título y ancho de cada columna</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
          <div className="flex items-center gap-3 text-xs text-slate-400 px-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showAll} onChange={e=>setShowAll(e.target.checked)} className="h-3.5 w-3.5 rounded bg-slate-800 border-slate-700 text-cyan-500" />
              Mostrar columnas ocultas
            </label>
            <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-300 rounded border border-cyan-500/20 font-mono">
              Arrastra para reordenar
            </span>
          </div>

          {localColumns.map((col, idx) => (
            <div key={col.key} className={`bg-[#070b14]/70 border rounded-xl p-3 transition-all ${!col.visible && !showAll ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <button onClick={() => handleMove(idx, 'up')} disabled={idx === 0} className="p-0.5 text-slate-500 hover:text-cyan-300 disabled:opacity-20" title="Subir"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleMove(idx, 'down')} disabled={idx === localColumns.length - 1} className="p-0.5 text-slate-500 hover:text-cyan-300 disabled:opacity-20" title="Bajar"><ChevronDown className="h-3.5 w-3.5" /></button>
                </div>
                <div className="w-8 text-center text-[10px] font-mono text-slate-400">{idx + 1}</div>
                <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={col.visible} 
                    onChange={() => handleToggle(col.key)}
                    className="h-4 w-4 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500 shrink-0"
                  />
                  <input 
                    type="text" 
                    value={col.label} 
                    onChange={e => handleLabelChange(col.key, e.target.value)}
                    className="text-xs bg-[#070b14] border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-cyan-500 min-w-[120px]"
                  />
                </label>
                <select 
                  value={col.width} 
                  onChange={e => handleWidthChange(col.key, e.target.value)}
                  className="text-[10px] bg-[#070b14] border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="compact">Compacto</option>
                  <option value="normal">Normal</option>
                  <option value="wide">Ancho</option>
                </select>
                <select 
                  value={col.align} 
                  onChange={e => handleAlignChange(col.key, e.target.value)}
                  className="text-[10px] bg-[#070b14] border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="left">Izquierda</option>
                  <option value="center">Centro</option>
                  <option value="right">Derecha</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-800 bg-[#070b14]/80">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">
            Cancelar
          </button>
          <button 
            onClick={() => onSave(localColumns)}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Save className="w-4 h-4" /> Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BitacoraPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [search, setSearch] = useState(initialSearch);
  const [patio, setPatio] = useState("");
  const [estadoGps, setEstadoGps] = useState("");
  const [estadoGenesis, setEstadoGenesis] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [atencionBus, setAtencionBus] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [tableColumns, setTableColumns] = useState(null);
  const [columnsLoading, setColumnsLoading] = useState(true);
  const [sortKey, setSortKey] = useState("bus");
  const [sortDir, setSortDir] = useState("asc");

  const queryClient = useQueryClient();

  useEffect(() => {
    fetchTableConfig('bitacora').then(cols => {
      setTableColumns(cols);
      setColumnsLoading(false);
    });
  }, []);

  useEffect(() => {
    const q = searchParams.get("search");
    if (q !== null && q !== search) {
      setSearch(q);
      setPage(1);
    }
  }, [searchParams]);

    const qp = {
    search,
    patio,
    estado_gps: estadoGps,
    estado_genesis: estadoGenesis,
    page,
    page_size: pageSize,
    ordering: sortDir === "desc" ? `-${sortKey}` : sortKey,
  };

  const {
    data,
    isLoading,
    isFetching,
    isError,        // ← tiene que estar
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["bitacora-tabla", qp],
    queryFn: () => apiClient.get("/bitacora/tabla/", { params: qp }),
    staleTime: 20_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const rows = data?.results || [];
  const total = data?.count || 0;
  const totalPages = data?.total_pages || 1;
  const clearFilters = () => {
    setSearch("");
    setPatio("");
    setEstadoGps("");
    setEstadoGenesis("");
    setPage(1);
    setSearchParams({});
  };
  const hasFilters = search || patio || estadoGps || estadoGenesis;

  const handleSaveColumns = async (newColumns) => {
    const success = await saveTableConfig('bitacora', newColumns);
    if (success) {
      setTableColumns(newColumns);
      setShowColumnConfig(false);
    }
  };

  const visibleColumns = useMemo(() => {
    if (!tableColumns || columnsLoading) return DEFAULT_COLUMNS_BITACORA;
    return tableColumns.filter(c => c.visible);
  }, [tableColumns, columnsLoading]);

  const getColumnWidth = (width) => {
    switch (width) {
      case 'compact': return 'w-20';
      case 'wide': return 'w-48';
      default: return 'w-32';
    }
  };

  const getAlignClass = (align) => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#070b14] space-y-4">
      {atencionBus && <AtencionModal bus={atencionBus} onClose={() => setAtencionBus(null)} />}
      {showAdd && <AgregarBusModal onClose={() => setShowAdd(false)} />}
      {showUpload && <CargaMasivaModal onClose={() => setShowUpload(false)} />}
      {showColumnConfig && tableColumns && (
        <ColumnConfigModal 
          columns={tableColumns} 
          onSave={handleSaveColumns} 
          onClose={() => setShowColumnConfig(false)}
          moduleKey="Bitácora"
        />
      )}

      {/* Page Header */}
      <div className="bg-[#0b1329]/90 border border-slate-800 rounded-2xl p-5 shadow-xl ring-1 ring-white/5 shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                Workstation Operativa
              </span>
              <span className="text-xs text-slate-400">· Monitoreo & Bitácora de Telemetría GPS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Radio className="w-6 h-6 text-cyan-400" />
              <span>Bitácora Técnica de Flota</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              <span className="font-mono text-cyan-300 font-bold">{total.toLocaleString()}</span> móviles monitoreados
              {isFetching && <span className="ml-2 text-cyan-400 animate-pulse font-mono">· Sincronizando en vivo...</span>}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button 
              onClick={() => refetch()} 
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
              title="Refrescar datos"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <button 
              onClick={() => setShowUpload(true)} 
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-900/80 hover:bg-slate-800 rounded-xl transition-all shadow-sm"
            >
              <Upload className="w-4 h-4 text-cyan-400" /> Carga Masiva
            </button>
            <button 
              onClick={() => setShowAdd(true)} 
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Agregar Móvil
            </button>
            <button 
              onClick={() => setShowColumnConfig(true)}
              disabled={columnsLoading}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-900/80 hover:bg-slate-800 rounded-xl transition-all shadow-sm"
            >
              <Columns className="w-4 h-4 text-cyan-400" /> Columnas
            </button>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-[#0b1329]/90 border border-slate-800 rounded-2xl p-4 shadow-xl ring-1 ring-white/5 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }} 
              placeholder="Buscar móvil (806 o 0806), placa, patio..."
              className="w-full border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs bg-[#070b14] text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500" 
            />
          </div>

          {[
            { label: "Todos los Patios", val: patio, setVal: v => { setPatio(v); setPage(1); }, opts: PATIOS },
            { label: "Estado GPS (Todos)", val: estadoGps, setVal: v => { setEstadoGps(v); setPage(1); }, opts: Object.keys(GPS_CFG) },
            { label: "Estado Genesis", val: estadoGenesis, setVal: v => { setEstadoGenesis(v); setPage(1); }, opts: ["Operativo", "Inoperativo"] },
          ].map(({ label, val, setVal, opts }) => (
            <div key={label} className="relative">
              <select 
                value={val} 
                onChange={e => setVal(e.target.value)}
                className="border border-slate-800 rounded-xl px-3.5 py-2 text-xs bg-[#070b14] appearance-none pr-8 text-slate-200 focus:outline-none focus:border-cyan-500 min-w-[150px]"
              >
                <option value="" className="bg-slate-900 text-slate-400">{label}</option>
                {opts.map(o => <option key={o} value={o} className="bg-slate-900 text-white">{o}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            </div>
          ))}

          {hasFilters && (
            <button 
              onClick={clearFilters} 
              className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}

          <div className="ml-auto flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>Ver:</span>
            {PAGE_SIZES.map(n => (
              <button 
                key={n} 
                onClick={() => { setPageSize(n); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  pageSize === n 
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" 
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 bg-[#0b1329]/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/5 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <p className="text-xs text-slate-400 font-medium font-mono">Cargando telemetría de flota...</p>
              </div>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center h-64 text-center">
              <div>
                <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
                <p className="font-semibold text-white text-sm">Error de sincronización</p>
                <button 
                  onClick={() => refetch()} 
                  className="mt-3 px-4 py-2 text-xs font-bold text-cyan-400 border border-cyan-500/40 rounded-xl hover:bg-cyan-500/10 transition-colors"
                >
                  Reintentar Consulta
                </button>
              </div>
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead className="bg-[#070b14] border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  {visibleColumns.map(col => (
                    <SortableTh
                      key={col.key}
                      label={col.label}
                      column={col.key === 'movil' ? 'bus' : col.key}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={(column) => {
                        const next = nextSort(sortKey, sortDir, column);
                        setSortKey(next.key);
                        setSortDir(next.dir);
                        setPage(1);
                      }}
                      className={`px-3 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap ${getAlignClass(col.align)} ${getColumnWidth(col.width)}`}
                    />
                  ))}
                  <th className="px-3 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap w-28">
                    ACCIONES
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="text-center py-20 text-slate-400 text-xs">
                      <Bus className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                      No se encontraron móviles con los filtros especificados
                    </td>
                  </tr>
                ) : rows.map(row => (
                  <tr key={row.bus} className="hover:bg-slate-800/40 transition-colors group">
                    {visibleColumns.map(col => {
                      const alignClass = getAlignClass(col.align);
                      const widthClass = getColumnWidth(col.width);
                      switch (col.key) {
                        case 'movil':
                        case 'bus':
                          return (
                            <td key={col.key} className={`px-3 py-3 font-mono font-bold text-white tabular-nums ${alignClass} ${widthClass}`}>
                              <span className="text-cyan-400 font-bold">{formatBusNumber(row.bus)}</span>
                            </td>
                          );
                        case 'placa':
                          return <td key={col.key} className={`px-3 py-3 font-mono text-slate-300 text-[11px] ${alignClass} ${widthClass}`}>{row.placa || '-'}</td>;
                        case 'estado_gps':
                          return <td key={col.key} className={`px-3 py-3 ${alignClass} ${widthClass}`}><Pill config={GPS_CFG} value={row.estado_gps} /></td>;
                        case 'manos_libres':
                          return <td key={col.key} className={`px-3 py-3 ${alignClass} ${widthClass}`}><Pill config={ML_CFG} value={row.manos_libres} /></td>;
                        case 'estado_genesis':
                          return <td key={col.key} className={`px-3 py-3 ${alignClass} ${widthClass}`}><Pill config={GEN_CFG} value={row.estado_genesis} /></td>;
                        case 'patio':
                        case 'patio_ubicacion':
                          return (
                            <td key={col.key} className={`px-3 py-3 ${alignClass} ${widthClass}`}>
                              <span className="flex items-center gap-1.5 text-slate-200 font-medium">
                                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span className="truncate max-w-[120px]">{row.patio_ubicacion || row.patio || '-'}</span>
                              </span>
                            </td>
                          );
                        case 'hora_entrada':
                          return (
                            <td key={col.key} className={`px-3 py-3 font-mono text-slate-400 text-[11px] ${alignClass} ${widthClass}`}>
                              {row.hora_entrada && row.hora_entrada !== "-" ? (
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  {row.hora_entrada}
                                </span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                          );
                        case 'ultima_revision':
                          return (
                            <td key={col.key} className={`px-3 py-3 text-slate-400 font-mono text-[11px] ${alignClass} ${widthClass}`}>
                              {row.ultima_revision === "Sin revision" || !row.ultima_revision ? (
                                <span className="text-slate-600 italic">Sin revisión</span>
                              ) : (
                                row.ultima_revision
                              )}
                            </td>
                          );
                        case 'tecnico':
                          return (
                            <td key={col.key} className={`px-3 py-3 ${alignClass} ${widthClass}`}>
                              {row.tecnico && row.tecnico !== "-" ? (
                                <span className="flex items-center gap-1.5 text-slate-200">
                                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate max-w-[110px] font-medium">{row.tecnico}</span>
                                </span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                          );
                        case 'velocidad':
                          return <td key={col.key} className={`px-3 py-3 font-mono text-[11px] text-slate-300 ${alignClass} ${widthClass}`}>{row.velocidad != null ? `${row.velocidad} km/h` : '-'}</td>;
                        case 'odometro':
                          return <td key={col.key} className={`px-3 py-3 font-mono text-[11px] text-slate-300 ${alignClass} ${widthClass}`}>{row.odometro != null ? `${row.odometro.toLocaleString()} km` : '-'}</td>;
                        case 'modelo':
                          return <td key={col.key} className={`px-3 py-3 text-[11px] text-slate-300 ${alignClass} ${widthClass}`}>{row.modelo || '-'}</td>;
                        case 'chasis':
                          return <td key={col.key} className={`px-3 py-3 font-mono text-[11px] text-slate-300 ${alignClass} ${widthClass}`}>{row.chasis || '-'}</td>;
                        case 'motivo_reporte':
                          return <td key={col.key} className={`px-3 py-3 text-[11px] text-slate-300 ${alignClass} ${widthClass}`}>{row.motivo_reporte || '-'}</td>;
                        case 'origen':
                          return <td key={col.key} className={`px-3 py-3 text-[11px] text-slate-300 ${alignClass} ${widthClass}`}>{row.origen || '-'}</td>;
                        case 'destino':
                          return <td key={col.key} className={`px-3 py-3 text-[11px] text-slate-300 ${alignClass} ${widthClass}`}>{row.destino || '-'}</td>;
                        default:
                          return <td key={col.key} className={`px-3 py-3 text-[11px] text-slate-400 ${alignClass} ${widthClass}`}>{row[col.key] || '-'}</td>;
                      }
                    })}
                    <td className="px-3 py-3">
                      <button 
                        onClick={() => setAtencionBus(row)}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xl shadow-md shadow-amber-500/20 transition-all whitespace-nowrap"
                      >
                        <Pencil className="w-3 h-3" /> Atender Móvil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {!isLoading && !isError && totalPages > 1 && (
          <div className="bg-[#070b14] border-t border-slate-800 px-6 py-3.5 flex items-center justify-between shrink-0">
            <p className="text-xs text-slate-400 font-mono">
              Mostrando <span className="font-bold text-white">{((page-1)*pageSize)+1}-{Math.min(page*pageSize,total)}</span> de{" "}
              <span className="font-bold text-cyan-400">{total.toLocaleString()}</span> móviles
            </p>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setPage(1)} 
                disabled={page === 1} 
                className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 text-slate-400"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                let p = totalPages <= 7 ? i+1 : page <= 4 ? i+1 : page >= totalPages-3 ? totalPages-6+i : page-3+i;
                return (
                  <button 
                    key={p} 
                    onClick={() => setPage(p)} 
                    className={`w-7 h-7 text-xs font-mono font-bold rounded-lg transition-colors ${
                      page === p 
                        ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/30" 
                        : "text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button 
                onClick={() => setPage(totalPages)} 
                disabled={page === totalPages} 
                className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 text-slate-400"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}