import React, { useState, useRef, useEffect, useMemo } from "react";
import { NavLink } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Package, 
  Cpu, 
  Plus, 
  Upload, 
  RefreshCw, 
  X, 
  ChevronDown, 
  Loader2, 
  AlertCircle, 
  Search, 
  Pencil, 
  Trash2, 
  Save, 
  FileSpreadsheet, 
  Wrench,
  Bus,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Columns,
  Eye,
  HardDrive,
  CalendarClock,
  X as XIcon
} from "lucide-react";
import apiClient from "../api/client";
import { useAuth } from "../hooks/useAuth";

const PATIOS = ["TODOS", "LOS PUEBLOS", "RELEVO CA", "CURUNDU", "OJO DE AGUA", "LA DONA", "CHORRILLO", "LA CABIMA"];
const TIPOS_FLOTA = ["Grand Viale", "Torino", "County", "Articulado", "Padron"];
const COMPONENTES = ["Modem GPS", "SIM Card", "Bocina Pasajero", "Regulador de Voltaje", "Boton de Panico", "Boton de Llamada", "Anillo Inductor", "CTAP", "Antena GPS", "Validador"];
const TIPOS_DANO = ["Falla de Alimentacion", "Conector Roto", "Sin Signal GSM/GPS", "Carcasa Rota", "Firmware Desactualizado", "Bocina Danada", "Boton Trabado", "SIM Card Inactiva"];

export const getAlignClass = (align) => {
  switch (align) {
    case 'center': return 'text-center';
    case 'right': return 'text-right';
    default: return '';
  }
};

const DEFAULT_COLUMNS_FLOTA = [
  { key: 'bus_movil', label: 'MÓVIL', visible: true, width: 'w-24', align: 'left', source: 'flota' },
  { key: 'placa', label: 'PLACA', visible: true, width: 'w-28', align: 'left', source: 'flota' },
  { key: 'tipo_flota', label: 'TIPO', visible: true, width: 'w-28', align: 'left', source: 'flota' },
  { key: 'estado_operativo', label: 'ESTADO FLOTA', visible: true, width: 'w-28', align: 'center', source: 'flota' },
  { key: 'estado_gps', label: 'ESTADO GPS', visible: true, width: 'w-32', align: 'center', source: 'flota' },
  { key: 'patio_genesis', label: 'PATIO', visible: true, width: 'w-32', align: 'left', source: 'flota' },
  { key: 'hora_entrada', label: 'HORA ENTRADA', visible: true, width: 'w-28', align: 'center', source: 'flota' },
  { key: 'estado_genesis', label: 'ESTADO GÉNESIS', visible: true, width: 'w-32', align: 'center', source: 'flota' },
  { key: 'ultima_transmision', label: 'ÚLT. TRANSMISIÓN', visible: true, width: 'w-40', align: 'left', source: 'flota' },
];

const DEFAULT_COLUMNS_EE = [
  { key: 'id', label: 'ID ÚNICO', visible: true, width: 'w-20', align: 'left', source: 'inventario-ee' },
  { key: 'bus_movil', label: 'BUS ASIGNADO', visible: true, width: 'w-24', align: 'left', source: 'inventario-ee' },
  { key: 'componente', label: 'COMPONENTE', visible: true, width: 'w-36', align: 'left', source: 'inventario-ee' },
  { key: 'serie', label: 'SERIE', visible: true, width: 'w-28', align: 'left', source: 'inventario-ee' },
  { key: 'imei', label: 'IMEI', visible: true, width: 'w-28', align: 'left', source: 'inventario-ee' },
  { key: 'funcional', label: 'ESTADO', visible: true, width: 'w-28', align: 'left', source: 'inventario-ee' },
  { key: 'tipo_dano', label: 'TIPO DAÑO', visible: true, width: 'w-32', align: 'left', source: 'inventario-ee' },
  { key: 'estado_accion', label: 'ESTADO ACCIÓN', visible: true, width: 'w-36', align: 'left', source: 'inventario-ee' },
  { key: 'observaciones', label: 'OBSERVACIONES', visible: true, width: 'w-48', align: 'left', source: 'inventario-ee' },
];

async function fetchTableConfig(module) {
  const defaults = module === 'inventario-flota' ? DEFAULT_COLUMNS_FLOTA : DEFAULT_COLUMNS_EE;
  try {
    const res = await apiClient.get(`/configuracion/distribucion-tabla/${module}/`);
    const cols = res?.columnas;
    if (!Array.isArray(cols) || !cols.length) return defaults;
    // Si la config guardada no tiene keys de Flota (p.ej. vino de Bitácora), ignorarla
    if (module === 'inventario-flota') {
      const keys = new Set(cols.map(c => c.key));
      const ok = keys.has('bus_movil') && (keys.has('estado_gps') || keys.has('estado_operativo') || keys.has('placa'));
      if (!ok) return defaults;
    }
    return cols;
  } catch {
    return defaults;
  }
}

function Badge({ children, cls = "bg-slate-800 text-slate-400 border-slate-700" }) {
  return (
    <span className={`inline-flex items-center border text-[10px] font-mono font-bold px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${cls}`}>
      {children}
    </span>
  );
}

function SF({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">{label}</label>
      <div className="relative">
        <select 
          value={value} 
          onChange={e => onChange(e.target.value)}
          className="w-full border border-slate-800 rounded-xl px-3.5 py-2 text-xs bg-[#070b14] appearance-none pr-8 text-white focus:outline-none focus:border-cyan-500"
        >
          {options.map(o => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
      </div>
    </div>
  );
}

function IF({ label, value, onChange, placeholder = "" }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">{label}</label>
      <input 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        placeholder={placeholder}
        className="w-full border border-slate-800 rounded-xl px-3.5 py-2 text-xs bg-[#070b14] text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500 font-mono" 
      />
    </div>
  );
}


function BajaReactivarButtons({ item }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const estado = (item.estado_operativo || item.estado || "").toUpperCase();
  const isBaja = estado === "BAJA";

  const run = async (action) => {
    if (action === "baja") {
      const motivo = window.prompt("Motivo de baja (obligatorio):");
      if (!motivo || !motivo.trim()) return;
      setBusy(true);
      try {
        await apiClient.post(`/inventario-flota/${item.id}/dar_de_baja/`, { motivo: motivo.trim() });
        queryClient.invalidateQueries({ queryKey: ["inventario-flota"] });
      } catch (e) {
        alert(e?.response?.data?.error || e?.message || "Error al dar de baja");
      } finally {
        setBusy(false);
      }
    } else {
      if (!window.confirm(`¿Reactivar bus ${item.bus_movil}?`)) return;
      setBusy(true);
      try {
        await apiClient.post(`/inventario-flota/${item.id}/reactivar/`, { notas: "Reactivado desde UI" });
        queryClient.invalidateQueries({ queryKey: ["inventario-flota"] });
      } catch (e) {
        alert(e?.response?.data?.error || e?.message || "Error al reactivar");
      } finally {
        setBusy(false);
      }
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {isBaja ? (
        <button type="button" disabled={busy} onClick={() => run("reactivar")}
          className="px-2 py-1 text-[10px] font-bold rounded-lg border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50">
          {busy ? "..." : "Reactivar"}
        </button>
      ) : (
        <button type="button" disabled={busy} onClick={() => run("baja")}
          className="px-2 py-1 text-[10px] font-bold rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/15 disabled:opacity-50">
          {busy ? "..." : "Baja"}
        </button>
      )}
    </div>
  );
}

function AddFlotaModal({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ bus_movil: "", placa: "", tipo_flota: "Torino", patio: "CURUNDU", estado: "OPERATIVO", estado_operativo: "ACTIVO" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  
  const mut = useMutation({
    mutationFn: d => apiClient.post("/inventario-flota/", d),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["inventario-flota"] }); 
      onClose(); 
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-[#0b1329] rounded-2xl shadow-2xl w-full max-w-md border border-slate-700/80 overflow-hidden ring-1 ring-white/10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#070b14]/80">
          <h2 className="font-bold text-white text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-cyan-400" /> Alta de Bus en Inventario
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3.5">
            <IF label="N° Bus" value={form.bus_movil} onChange={v=>set("bus_movil", v)} placeholder="ej. 1042" />
            <IF label="Placa" value={form.placa} onChange={v=>set("placa", v)} placeholder="MB1042" />
            <SF label="Tipo de Flota" value={form.tipo_flota} onChange={v=>set("tipo_flota", v)} options={TIPOS_FLOTA} />
            <SF label="Patio" value={form.patio} onChange={v=>set("patio", v)} options={PATIOS.filter(p=>p!=='TODOS')} />
            <div className="col-span-2">
              <SF label="Estado Operativo" value={form.estado_operativo || form.estado} onChange={v=>{ set("estado_operativo", v); set("estado", v === "ACTIVO" ? "OPERATIVO" : v); }} options={["ACTIVO", "MANTENIMIENTO", "BAJA"]} />
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
            {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} 
            Guardar Móvil
          </button>
        </div>
      </div>
    </div>
  );
}

function AddEEModal({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    bus_movil: "", 
    componente: "Modem GPS", 
    serie: "", 
    imei: "", 
    funcional: true, 
    danado: false, 
    tipo_dano: "", 
    estado_accion: "Pendiente de revision", 
    observaciones: ""
  });
  
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  
  const mut = useMutation({
    mutationFn: d => apiClient.post("/inventario-ee/", d),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["inventario-ee"] }); 
      onClose(); 
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-[#0b1329] rounded-2xl shadow-2xl w-full max-w-lg border border-slate-700/80 overflow-hidden ring-1 ring-white/10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#070b14]/80">
          <h2 className="font-bold text-white text-sm flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" /> Registro de Componente E.E.
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3.5">
            <IF label="N° Bus Asignado" value={form.bus_movil} onChange={v=>set("bus_movil", v)} placeholder="ej. 1042" />
            <SF label="Tipo de Componente" value={form.componente} onChange={v=>set("componente", v)} options={COMPONENTES} />
            <IF label="Número de Serie" value={form.serie} onChange={v=>set("serie", v)} placeholder="SN-00294" />
            <IF label="IMEI / MAC" value={form.imei} onChange={v=>set("imei", v)} placeholder="35824..." />
            <div className="col-span-2 flex items-center gap-6 p-3 rounded-xl bg-[#070b14] border border-slate-800">
              <label className="flex items-center gap-2 text-xs text-white font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={form.funcional} 
                  onChange={e => {
                    set("funcional", e.target.checked);
                    if (e.target.checked) set("danado", false);
                  }} 
                  className="h-4 w-4 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500" 
                />
                <span>Operativo / Funcional</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={form.danado} 
                  onChange={e => {
                    set("danado", e.target.checked);
                    if (e.target.checked) set("funcional", false);
                  }} 
                  className="h-4 w-4 rounded bg-slate-800 border-slate-700 text-rose-500 focus:ring-rose-500" 
                />
                <span className="text-rose-400">Reportado con Falla</span>
              </label>
            </div>
            {form.danado && (
              <div className="col-span-2">
                <SF label="Tipo de Falla / Daño" value={form.tipo_dano} onChange={v=>set("tipo_dano", v)} options={TIPOS_DANO} />
              </div>
            )}
            <div className="col-span-2">
              <IF label="Observaciones Técnicas" value={form.observaciones} onChange={v=>set("observaciones", v)} placeholder="Ubicación en rack, cable de alimentación revisado..." />
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
            {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} 
            Guardar Componente
          </button>
        </div>
      </div>
    </div>
  );
}

function EditFlotaModal({ item, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    bus_movil: item.bus_movil ?? "",
    placa: item.placa ?? "",
    tipo_flota: item.tipo_flota ?? "Torino",
    patio: item.patio ?? "CURUNDU",
    estado: item.estado ?? "OPERATIVO", estado_operativo: item.estado_operativo ?? "ACTIVO"
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: d => apiClient.patch(`/inventario-flota/${item.id}/`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventario-flota"] });
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-[#0b1329] rounded-2xl shadow-2xl w-full max-w-md border border-slate-700/80 overflow-hidden ring-1 ring-white/10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#070b14]/80">
          <h2 className="font-bold text-white text-sm flex items-center gap-2">
            <Pencil className="w-4 h-4 text-cyan-400" /> Editar Bus #{item.bus_movil}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3.5">
            <IF label="N° Bus" value={String(form.bus_movil)} onChange={v => set("bus_movil", v)} placeholder="ej. 1042" />
            <IF label="Placa" value={form.placa} onChange={v => set("placa", v)} placeholder="MB1042" />
            <SF label="Tipo de Flota" value={form.tipo_flota} onChange={v => set("tipo_flota", v)} options={TIPOS_FLOTA} />
            <SF label="Patio" value={form.patio} onChange={v => set("patio", v)} options={PATIOS.filter(p => p !== 'TODOS')} />
            <div className="col-span-2">
              <SF label="Estado Operativo" value={form.estado} onChange={v => set("estado", v)} options={["ACTIVO", "MANTENIMIENTO", "BAJA"]} />
            </div>
          </div>
          {mut.isError && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
              <AlertCircle className="w-4 h-4" /> Error al guardar cambios.
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-800 bg-[#070b14]/80">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">Cancelar</button>
          <button
            onClick={() => mut.mutate(form)}
            disabled={mut.isPending}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-md shadow-cyan-600/25 disabled:opacity-50"
          >
            {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function EditEEModal({ item, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    bus_movil: item.bus_movil ?? "",
    componente: item.componente ?? "Modem GPS",
    serie: item.serie ?? "",
    imei: item.imei ?? "",
    funcional: item.funcional ?? true,
    danado: item.danado ?? false,
    tipo_dano: item.tipo_dano ?? "",
    estado_accion: item.estado_accion ?? "Pendiente de revision",
    observaciones: item.observaciones ?? ""
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: d => apiClient.patch(`/inventario-ee/${item.id}/`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventario-ee"] });
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-[#0b1329] rounded-2xl shadow-2xl w-full max-w-lg border border-slate-700/80 overflow-hidden ring-1 ring-white/10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#070b14]/80">
          <h2 className="font-bold text-white text-sm flex items-center gap-2">
            <Pencil className="w-4 h-4 text-cyan-400" /> Editar — {item.componente} (Bus #{item.bus_movil})
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3.5">
            <IF label="N° Bus Asignado" value={String(form.bus_movil)} onChange={v => set("bus_movil", v)} placeholder="ej. 1042" />
            <SF label="Tipo de Componente" value={form.componente} onChange={v => set("componente", v)} options={COMPONENTES} />
            <IF label="Número de Serie" value={form.serie} onChange={v => set("serie", v)} placeholder="SN-00294" />
            <IF label="IMEI / MAC" value={form.imei} onChange={v => set("imei", v)} placeholder="35824..." />
            <div className="col-span-2 flex items-center gap-6 p-3 rounded-xl bg-[#070b14] border border-slate-800">
              <label className="flex items-center gap-2 text-xs text-white font-medium cursor-pointer">
                <input type="checkbox" checked={form.funcional} onChange={e => { set("funcional", e.target.checked); if (e.target.checked) set("danado", false); }} className="h-4 w-4 rounded bg-slate-800 border-slate-700 text-cyan-500" />
                <span>Operativo / Funcional</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer">
                <input type="checkbox" checked={form.danado} onChange={e => { set("danado", e.target.checked); if (e.target.checked) set("funcional", false); }} className="h-4 w-4 rounded bg-slate-800 border-slate-700 text-rose-500" />
                <span className="text-rose-400">Reportado con Falla</span>
              </label>
            </div>
            {form.danado && (
              <div className="col-span-2"><SF label="Tipo de Falla / Daño" value={form.tipo_dano} onChange={v => set("tipo_dano", v)} options={TIPOS_DANO} /></div>
            )}
            <div className="col-span-2">
              <SF label="Estado de Acción" value={form.estado_accion} onChange={v => set("estado_accion", v)} options={["Pendiente de revision", "Reparado", "Reemplazado", "Actualizado"]} />
            </div>
            <div className="col-span-2">
              <IF label="Observaciones Técnicas" value={form.observaciones} onChange={v => set("observaciones", v)} placeholder="Ubicación en rack..." />
            </div>
          </div>
          {mut.isError && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
              <AlertCircle className="w-4 h-4" /> Error al guardar cambios.
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-800 bg-[#070b14]/80">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">Cancelar</button>
          <button
            onClick={() => mut.mutate(form)}
            disabled={mut.isPending}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-md shadow-cyan-600/25 disabled:opacity-50"
          >
            {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ endpoint, title, onClose }) {
  const queryClient = useQueryClient();
  const fileRef = useRef();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  
  const mut = useMutation({
    mutationFn: async f => { 
      const fd = new FormData(); 
      fd.append("archivo", f); 
      return apiClient.post(endpoint, fd, { headers: { "Content-Type": "multipart/form-data" } }); 
    },
    onSuccess: d => { 
      setResult(d); 
      queryClient.invalidateQueries({ queryKey: ["inventario-flota"] }); 
      queryClient.invalidateQueries({ queryKey: ["inventario-ee"] }); 
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-[#0b1329] rounded-2xl shadow-2xl w-full max-w-md border border-slate-700/80 overflow-hidden ring-1 ring-white/10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#070b14]/80">
          <h2 className="font-bold text-white text-sm flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> {title}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-3">
            <p className="text-[10px] font-mono text-cyan-300">bus,placa,tipo_flota,patio,estado (para Flota)</p>
            <p className="text-[10px] font-mono text-cyan-300 mt-1">bus,componente,serie,imei,funcional,danado (para E.E.)</p>
          </div>
          {!result ? (
            <>
              <div 
                onClick={() => fileRef.current?.click()} 
                className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-950/10 transition-all"
              >
                <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-white">{file ? file.name : "Haga clic o arrastre su archivo"}</p>
                <p className="text-[10px] text-slate-500 mt-1">CSV, XLS o XLSX</p>
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
              <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1" />
              <p className="text-xs font-bold text-emerald-300">Carga completada</p>
              <p className="text-[11px] text-emerald-400/90 mt-0.5">Creados: {result.creados} · Actualizados: {result.actualizados}</p>
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
              Cargar Archivo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TabFlota({ visibleColumns, renderCell }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["inventario-flota"],
    queryFn: () => apiClient.get("/inventario-flota/", { params: { page_size: 2000 } }),
  });

  const delMut = useMutation({
    mutationFn: id => apiClient.delete(`/inventario-flota/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventario-flota"] })
  });

  const rows = (data?.results || data || []).filter(r => 
    !search || String(r.bus_movil).includes(search) || (r.placa||"").toLowerCase().includes(search.toLowerCase())
  );

  const tipoColor = {
    "Grand Viale": "bg-purple-500/15 text-purple-300 border-purple-500/30",
    "Torino":      "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    "County":      "bg-amber-500/15 text-amber-300 border-amber-500/30",
    "Articulado":  "bg-rose-500/15 text-rose-300 border-rose-500/30",
    "Padron":      "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  };

  return (
    <div className="flex flex-col gap-4">
      {showAdd && <AddFlotaModal onClose={() => setShowAdd(false)}/>}
      {showUpload && <UploadModal endpoint="/inventario-flota/carga_masiva/" title="Carga Masiva Flota" onClose={() => setShowUpload(false)}/>}
      {editItem && <EditFlotaModal item={editItem} onClose={() => setEditItem(null)}/>}
      
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
          <input 
            value={search} 
            onChange={e=>setSearch(e.target.value)} 
            placeholder="Buscar por bus o placa..."
            className="w-full border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs bg-[#070b14] text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500"
          />
        </div>
        <button onClick={() => refetch()} className="p-2 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white">
          <RefreshCw className="w-4 h-4"/>
        </button>
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 border border-slate-800 bg-[#070b14] hover:bg-slate-800 rounded-xl">
          <Upload className="w-4 h-4 text-cyan-400"/> Carga Masiva
        </button>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl shadow-lg shadow-cyan-500/20">
          <Plus className="w-4 h-4"/> Agregar Bus
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin"/>
        </div>
      ) : (
        <div className="bg-[#0b1329]/90 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto">
          <table className="w-full text-xs border-collapse table-fixed">
            <thead className="bg-[#070b14] border-b border-slate-800 sticky top-0 z-10">
              <tr>
                {visibleColumns.map(col => (
                  <th key={col.key} className={`px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider ${getAlignClass(col.align)} ${col.width}`}>
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="text-center py-12 text-slate-500 text-xs">
                    Sin buses en inventario. Agregue buses o realice una carga masiva.
                  </td>
                </tr>
              ) : rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                  {visibleColumns.map(col => renderCell(r, col))}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditItem(r)}
                        className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                        title="Editar bus"
                      >
                        <Pencil className="w-3.5 h-3.5"/>
                      </button>
                      <button 
                        onClick={() => { if (window.confirm("¿Eliminar bus " + r.bus_movil + " del inventario?")) delMut.mutate(r.id); }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Eliminar móvil"
                      >
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                      <BajaReactivarButtons item={r} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TabEE({ visibleColumns, renderCell }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["inventario-ee"],
    queryFn: () => apiClient.get("/inventario-ee/"),
  });

  const delMut = useMutation({
    mutationFn: id => apiClient.delete(`/inventario-ee/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventario-ee"] })
  });

  const rows = (data?.results || data || []).filter(r => 
    !search || String(r.bus_movil).includes(search) || (r.componente||"").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      {showAdd && <AddEEModal onClose={() => setShowAdd(false)}/>}
      {showUpload && <UploadModal endpoint="/inventario-ee/carga_masiva/" title="Carga Masiva E.E." onClose={() => setShowUpload(false)}/>}
      {editItem && <EditEEModal item={editItem} onClose={() => setEditItem(null)}/>}
      
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
          <input 
            value={search} 
            onChange={e=>setSearch(e.target.value)} 
            placeholder="Buscar por bus o componente..."
            className="w-full border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs bg-[#070b14] text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500"
          />
        </div>
        <button onClick={() => refetch()} className="p-2 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white">
          <RefreshCw className="w-4 h-4"/>
        </button>
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 border border-slate-800 bg-[#070b14] hover:bg-slate-800 rounded-xl">
          <Upload className="w-4 h-4 text-cyan-400"/> Carga Masiva
        </button>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-purple-500/20">
          <Plus className="w-4 h-4"/> Agregar Componente
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin"/>
        </div>
      ) : (
        <div className="bg-[#0b1329]/90 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-[#070b14] border-b border-slate-800">
              <tr>
                {visibleColumns.map(col => (
                  <th key={col.key} className={`px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap ${getAlignClass(col.align)} ${col.width}`}>
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap w-16">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="text-center py-12 text-slate-500 text-xs">
                    Sin componentes registrados en inventario.
                  </td>
                </tr>
              ) : rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                  {visibleColumns.map(col => renderCell(r, col))}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditItem(r)}
                        className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                        title="Editar componente"
                      >
                        <Pencil className="w-3.5 h-3.5"/>
                      </button>
                      <button 
                        onClick={() => { if (window.confirm("¿Eliminar componente?")) delMut.mutate(r.id); }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function InventarioPage() {
  const [tab, setTab] = useState("flota");
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [tableColumns, setTableColumns] = useState(null);
  const [columnsLoading, setColumnsLoading] = useState(true);

  useEffect(() => {
    fetchTableConfig(tab === 'flota' ? 'inventario-flota' : 'inventario-ee').then(cols => {
      setTableColumns(cols);
      setColumnsLoading(false);
    });
  }, [tab]);

  const visibleColumns = useMemo(() => {
    if (!tableColumns || columnsLoading) return tab === 'flota' ? DEFAULT_COLUMNS_FLOTA : DEFAULT_COLUMNS_EE;
    return tableColumns.filter(c => c.visible);
  }, [tableColumns, columnsLoading, tab]);

  const renderCellFlota = (row, col) => {
    const alignClass = getAlignClass(col.align);
    const w = col.width || "";
    const td = (content, extra = "") => (
      <td key={col.key} className={`px-3 py-2.5 text-xs ${alignClass} ${w} ${extra}`}>{content}</td>
    );
    const pill = (text, tone) => {
      const map = {
        ok: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        bad: "bg-rose-500/15 text-rose-300 border-rose-500/30",
        warn: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        mute: "bg-slate-800 text-slate-400 border-slate-700",
        info: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      };
      return (
        <span className={`inline-flex items-center border text-[10px] font-mono font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${map[tone] || map.mute}`}>
          {text || "—"}
        </span>
      );
    };
    const key = col.key;
    switch (key) {
      case "id":
        return td(<span className="font-mono text-slate-500">#{row.id}</span>);
      case "bus_movil":
      case "movil":
      case "bus":
        return td(
          <span className="font-mono font-bold text-cyan-400 tabular-nums">
            {String(row.bus_movil ?? "").padStart(4, "0")}
          </span>
        );
      case "placa":
        return td(<span className="font-mono text-slate-300">{row.placa || "—"}</span>);
      case "tipo_flota":
        return td(pill(row.tipo_flota || "—", "info"));
      case "estado":
      case "estado_operativo": {
        const eo = row.estado_operativo || row.estado || "—";
        const tone = eo === "ACTIVO" || eo === "OPERATIVO" ? "ok" : eo === "BAJA" ? "bad" : "warn";
        return td(pill(eo, tone));
      }
      case "estado_gps": {
        const g = row.estado_gps || "Sin datos";
        const bad = row.sin_senal || /offline|no record|off|sin datos/i.test(String(g));
        const warn = /stop/i.test(String(g));
        return td(pill(g, bad ? "bad" : warn ? "warn" : "ok"));
      }
      case "sin_senal":
        return td(row.sin_senal ? pill("SÍ", "bad") : pill("No", "ok"));
      case "patio":
      case "patio_genesis":
      case "patio_ubicacion":
        return td(<span className="text-slate-300">{row.patio_genesis || row.patio || "—"}</span>);
      case "hora_entrada":
        return td(<span className="font-mono text-slate-400">{row.hora_entrada || "—"}</span>);
      case "estado_genesis":
      case "estado_genesis":
        return td(pill(row.estado_genesis || "—", row.estado_genesis ? "info" : "mute"));
      case "ultima_transmision": {
        let label = "—";
        if (row.ultima_transmision) {
          try { label = new Date(row.ultima_transmision).toLocaleString("es-PA"); }
          catch { label = String(row.ultima_transmision); }
        }
        return td(<span className="font-mono text-[11px] text-slate-400">{label}</span>);
      }
      case "tecnico":
      case "tecnico_turno":
        return td(<span className="text-slate-500">—</span>);
      case "manos_libres":
        return td(<span className="text-slate-500">—</span>);
      case "ultima_revision":
        return td(<span className="text-slate-500">—</span>);
      default:
        // Nunca devolver null: evita columnas corridas
        return td(<span className="text-slate-600">—</span>);
    }
  };

  const renderCellEE = (row, col) => {
    const alignClass = getAlignClass(col.align);
    switch (col.key) {
      case 'id':
        return <td key={col.key} className={`px-4 py-3 font-mono text-slate-500 text-xs ${alignClass} ${col.width}`}>#{row.id}</td>;
      case 'bus_movil':
        return <td key={col.key} className={`px-4 py-3 font-mono font-bold text-white tabular-nums ${alignClass} ${col.width}`}><span className="text-cyan-400">Bus #{String(row.bus_movil).padStart(4, "0")}</span></td>;
      case 'componente':
        return <td key={col.key} className={`px-4 py-3 font-medium text-white ${alignClass} ${col.width}`}>{row.componente}</td>;
      case 'serie':
        return <td key={col.key} className={`px-4 py-3 font-mono text-slate-400 text-[11px] ${alignClass} ${col.width}`}>{row.serie || "-"}</td>;
      case 'imei':
        return <td key={col.key} className={`px-4 py-3 font-mono text-slate-400 text-[11px] ${alignClass} ${col.width}`}>{row.imei || "-"}</td>;
      case 'funcional':
        return <td key={col.key} className={`px-4 py-3 ${alignClass} ${col.width}`}><span className={`inline-flex items-center border text-[10px] font-mono font-bold px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${row.funcional ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30"}`}>{row.funcional ? "Funcional" : "Dañado"}</span></td>;
      case 'tipo_dano':
        return <td key={col.key} className={`px-4 py-3 text-slate-400 ${alignClass} ${col.width}`}>{row.tipo_dano || "-"}</td>;
      case 'estado_accion':
        return <td key={col.key} className={`px-4 py-3 ${alignClass} ${col.width}`}><span className={`inline-flex items-center border text-[10px] font-mono font-bold px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${row.estado_accion === "Reparado" || row.estado_accion === "Actualizado" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : row.estado_accion === "Reemplazado" ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30"}`}>{row.estado_accion}</span></td>;
      case 'observaciones':
        return <td key={col.key} className={`px-4 py-3 text-slate-400 max-w-[140px] truncate ${alignClass} ${col.width}`} title={row.observaciones}>{row.observaciones || "-"}</td>;
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
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Columns className="h-5 w-5 text-cyan-400" /> Diseñador de Columnas · {tab === 'flota' ? 'Inventario Flota' : 'Inventario E.E.'}</h3>
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
                <button onClick={() => apiClient.post(`/configuracion/distribucion-tabla/${tab === 'flota' ? 'inventario-flota' : 'inventario-ee'}/`, {columnas: tableColumns}).then(() => setShowColumnConfig(false))} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0b1329]/90 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-xl ring-1 ring-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
              Hardware & Spare Parts
            </span>
            <span className="text-xs text-slate-400">· Control de Activos & Stock de Repuestos</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Package className="h-6 w-6 text-cyan-400" />
            <span>Inventario de Flota & Hardware E.E.</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gestión y trazabilidad de buses del sistema y repuestos críticos de telemetría (módems, SIMs, cableados).
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Tab Switcher Pills */}
          <div className="flex items-center gap-1.5 bg-[#070b14] border border-slate-800 rounded-xl p-1 shadow-inner">
            {[
              { key: "flota", icon: Bus, label: "Inventario de Flota" },
              { key: "ee", icon: Cpu, label: "Repuestos & Periféricos E.E." },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tab === key 
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setShowColumnConfig(true)} disabled={columnsLoading} className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-900/80 hover:bg-slate-800 rounded-xl transition-all shadow-sm">
            <Columns className="w-4 h-4 text-cyan-400" /> Columnas
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {tab === "flota" ? <TabFlota visibleColumns={visibleColumns} renderCell={renderCellFlota} /> : <TabEE visibleColumns={visibleColumns} renderCell={renderCellEE} />}
      </div>
    </div>
  );
}
