import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Plus, Trash2, Save, RefreshCw, X, Loader2, AlertCircle, CheckCircle2, Users, Database, Layers, Shield, Radio } from "lucide-react";
import apiClient from "../api/client";
import { useAuth } from "../hooks/useAuth";

const SECTION_CLS = "bg-white rounded-2xl border border-slate-200 shadow-sm p-6";

function EditableCatalog({title, configKey, description, icon: Icon}) {
  const queryClient = useQueryClient();
  const [newItem, setNewItem] = useState("");
  const [saved, setSaved] = useState(false);

  const {data: cats, isLoading} = useQuery({
    queryKey: ["catalogos"],
    queryFn: () => apiClient.get("/configuracion/catalogos/"),
  });
  const saveMut = useMutation({
    mutationFn: d => apiClient.post("/configuracion/guardar_catalogo/", d),
    onSuccess: () => {queryClient.invalidateQueries({queryKey:["catalogos"]});setSaved(true);setTimeout(()=>setSaved(false),2000);}
  });

  const items = cats?.[configKey] || [];
  const addItem = () => {
    if(!newItem.trim()) return;
    saveMut.mutate({clave: configKey, valor: [...items, newItem.trim()]});
    setNewItem("");
  };
  const removeItem = idx => {
    const updated = items.filter((_,i) => i!==idx);
    saveMut.mutate({clave: configKey, valor: updated});
  };

  if(isLoading) return <div className="animate-pulse h-24 bg-slate-100 rounded-xl"/>;

  return (
    <div className={SECTION_CLS}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl border border-blue-200"><Icon className="w-4 h-4 text-blue-600"/></div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        {saved && <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><CheckCircle2 className="w-4 h-4"/> Guardado</span>}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {items.map((item, idx) => (
          <span key={idx} className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            {item}
            <button onClick={() => removeItem(idx)} className="hover:text-red-500 transition-colors ml-1"><X className="w-3 h-3"/></button>
          </span>
        ))}
        {items.length===0 && <p className="text-xs text-slate-400 italic">Sin elementos. Agregue items abajo.</p>}
      </div>
      <div className="flex gap-2">
        <input value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addItem()}
          placeholder={`Nuevo ${title.toLowerCase()}...`}
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"/>
        <button onClick={addItem} disabled={!newItem.trim()||saveMut.isPending}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm disabled:opacity-50 transition-colors">
          {saveMut.isPending?<Loader2 className="w-4 h-4 animate-spin"/>:<Plus className="w-4 h-4"/>} Agregar
        </button>
      </div>
    </div>
  );
}

function PollerControl() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const runPoller = async (servicio) => {
    setLoading(true); setStatus(null);
    try {
      const r = await apiClient.post("/poller/sync/", {servicio});
      setStatus({ok:true, msg:`Sincronizacion completada: ${JSON.stringify(r.resultado||r)}`});
    } catch(e) {
      setStatus({ok:false, msg:"Error al sincronizar: "+(e?.response?.data?.message||e.message)});
    } finally { setLoading(false); }
  };
  return (
    <div className={SECTION_CLS}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200"><Database className="w-4 h-4 text-emerald-600"/></div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Sincronizacion de Datos</h3>
          <p className="text-xs text-slate-500">Extrae datos actualizados de Genesis y BUSAE manualmente</p>
        </div>
      </div>
      {status && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium mb-4 ${status.ok?"bg-emerald-50 border border-emerald-200 text-emerald-700":"bg-red-50 border border-red-200 text-red-700"}`}>
          {status.ok?<CheckCircle2 className="w-4 h-4 shrink-0"/>:<AlertCircle className="w-4 h-4 shrink-0"/>}
          <span className="truncate">{status.msg}</span>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        {[
          {label:"Sincronizar Genesis", key:"genesis", cls:"bg-blue-600 hover:bg-blue-700"},
          {label:"Sincronizar BUSAE", key:"busae", cls:"bg-purple-600 hover:bg-purple-700"},
          {label:"Sincronizar Todo", key:"ambos", cls:"bg-slate-800 hover:bg-slate-900"},
        ].map(({label,key,cls}) => (
          <button key={key} onClick={() => runPoller(key)} disabled={loading}
            className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm disabled:opacity-60 transition-colors ${cls}`}>
            {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<RefreshCw className="w-4 h-4"/>}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BusaeCredentialsConfig() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);

  const {data: cats} = useQuery({
    queryKey: ["catalogos"],
    queryFn: () => apiClient.get("/configuracion/catalogos/"),
  });

  React.useEffect(() => {
    if (cats?.busae_credenciales) {
      setEmail(cats.busae_credenciales.email || "");
      setPassword(cats.busae_credenciales.password || "");
    }
  }, [cats]);

  const saveMut = useMutation({
    mutationFn: d => apiClient.post("/configuracion/guardar_catalogo/", d),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey:["catalogos"]});
      setSaved(true);
      setTimeout(()=>setSaved(false), 2500);
    }
  });

  return (
    <div className={SECTION_CLS}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-50 rounded-xl border border-rose-200">
            <Radio className="w-4 h-4 text-rose-600"/>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Credenciales BUSAE (Scraper Playwright en vivo)</h3>
            <p className="text-xs text-slate-500">Credenciales de login.busae.com para sincronización satelital automática</p>
          </div>
        </div>
        {saved && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 className="w-4 h-4"/> Guardado</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Usuario / Email BUSAE</label>
          <input
            type="text"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="ej: telemetria@mibus.com"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña BUSAE</label>
          <input
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => saveMut.mutate({clave: "busae_credenciales", valor: {email, password}})}
          disabled={!email || !password || saveMut.isPending}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm disabled:opacity-50 transition-colors"
        >
          {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Guardar Credenciales BUSAE
        </button>
      </div>
    </div>
  );
}

function FormConfig() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const {data: cats} = useQuery({queryKey:["catalogos"],queryFn:()=>apiClient.get("/configuracion/catalogos/")});
  const cfg = cats?.formulario_atencion || {};
  const saveMut = useMutation({
    mutationFn: d => apiClient.post("/configuracion/guardar_catalogo/", d),
    onSuccess: () => {queryClient.invalidateQueries({queryKey:["catalogos"]});setSaved(true);setTimeout(()=>setSaved(false),2000);}
  });
  const toggle = (key) => {
    const updated = {...cfg, [key]: !cfg[key]};
    saveMut.mutate({clave:"formulario_atencion", valor:updated});
  };
  const FIELDS = [
    {key:"solicitar_imei",label:"Solicitar IMEI BUSAE en formulario de atencion"},
    {key:"solicitar_serie_sim",label:"Solicitar Serie SIM Card"},
    {key:"solicitar_serie_ctap",label:"Solicitar Serie CTAP"},
    {key:"firmas_digitales_requeridas",label:"Habilitar firmas digitales al cerrar atencion"},
    {key:"permitir_edicion_tecnico",label:"Permitir que el tecnico edite datos de Genesis en el formulario"},
  ];
  return (
    <div className={SECTION_CLS}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-xl border border-amber-200"><Layers className="w-4 h-4 text-amber-600"/></div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Configuracion del Formulario de Atencion</h3>
            <p className="text-xs text-slate-500">Habilita o deshabilita campos del formulario de atencion tecnica</p>
          </div>
        </div>
        {saved && <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><CheckCircle2 className="w-4 h-4"/> Guardado</span>}
      </div>
      <div className="space-y-3">
        {FIELDS.map(({key,label}) => (
          <label key={key} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors">
            <span className="text-sm text-slate-700">{label}</span>
            <div className="relative">
              <input type="checkbox" checked={!!cfg[key]} onChange={() => toggle(key)} className="sr-only"/>
              <div onClick={() => toggle(key)}
                className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${cfg[key]?"bg-blue-600":"bg-slate-200"}`}>
                <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5 ${cfg[key]?"translate-x-5 ml-0.5":"translate-x-0.5"}`}/>
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function ConfiguracionPage() {
  const {user} = useAuth();
  if(!user) return null;
  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 p-6 gap-6 overflow-y-auto">
      <div>
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Settings className="w-5 h-5 text-blue-600"/> Configuracion del Sistema</h1>
        <p className="text-xs text-slate-500 mt-0.5">Administra catalogos, formularios y sincronizacion de datos</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <EditableCatalog title="Tipos de Flota" configKey="tipos_flota" description="Categorias de buses (Grand Viale, Torino, County...)" icon={Layers}/>
        <EditableCatalog title="Tipos de Dano" configKey="tipos_dano" description="Clasificacion de fallas en equipamiento E.E." icon={AlertCircle}/>
      </div>
      <FormConfig/>
      <BusaeCredentialsConfig/>
      <PollerControl/>
    </div>
  );
}
