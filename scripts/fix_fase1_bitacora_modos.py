#!/usr/bin/env python3
"""Bitácora: modos Reactivo / Preventivo / Todos + fix clsx. Idempotente."""
from pathlib import Path
import sys

P = Path(__file__).resolve().parent.parent / "frontend" / "src" / "pages" / "BitacoraPage.jsx"
src = P.read_text(encoding="utf-8")

# 1) Import clsx si falta
if "import clsx" not in src and "clsx(" in src:
    src = src.replace(
        'import SortableTh from "../components/SortableTh";',
        'import SortableTh from "../components/SortableTh";\nimport clsx from "clsx";',
        1,
    )
    print("OK: import clsx")

# 2) Estado modo
if "const [modo, setModo]" not in src:
    src = src.replace(
        '  const [estadoGenesis, setEstadoGenesis] = useState("");',
        '  const [estadoGenesis, setEstadoGenesis] = useState("");\n  const [modo, setModo] = useState("reactivo"); // reactivo | preventivo | todos',
        1,
    )
    print("OK: state modo")

# 3) Incluir modo en query params (buscar construcción de qp)
if 'modo,' not in src and "modo:" not in src.split("queryKey")[0][-500:]:
    # Patrón típico: const qp = { page, ...
    if "const qp = {" in src and "modo:" not in src[src.find("const qp"):src.find("const qp")+400]:
        src = src.replace(
            "const qp = {",
            "const qp = {\n    modo,\n",
            1,
        )
        print("OK: modo en qp (intento 1)")
    # Alternativa useMemo params
    if "params: {" in src and "modo" not in src[src.find("queryFn"):src.find("queryFn")+300]:
        pass

# Forzar filtro cliente si backend no soporta aún
if "rowsFiltradosPorModo" not in src:
    old = "  const rows = data?.results || [];"
    new = '''  const rowsRaw = data?.results || [];
  const rows = (() => {
    if (modo === "todos") return rowsRaw;
    if (modo === "reactivo") {
      return rowsRaw.filter(r => {
        const g = String(r.estado_gps || "").toLowerCase();
        return g.includes("offline") || g.includes("no record") || g === "off";
      });
    }
    // preventivo: GPS operativo (Active/Stopped) para revisión programada
    return rowsRaw.filter(r => {
      const g = String(r.estado_gps || "").toLowerCase();
      return g.includes("active") || g.includes("stopped") || g.includes("deten");
    });
  })();'''
    if old in src:
        src = src.replace(old, new, 1)
        print("OK: filtro cliente por modo")
    else:
        print("AVISO: no se encontró 'const rows = data?.results'")

# 4) UI selector de modo en barra de filtros
if 'setModo("reactivo")' not in src and "Modo de trabajo" not in src:
    marker = '      {/* Filter Controls Bar */}'
    ui = '''      {/* Modo Reactivo / Preventivo */}
      <div className="bg-[#0b1329]/90 border border-slate-800 rounded-2xl px-4 py-3 shadow-xl ring-1 ring-white/5 shrink-0 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">Modo</span>
        {[
          { id: "reactivo", label: "Reactivo", hint: "Solo sin GPS / críticos" },
          { id: "preventivo", label: "Preventivo", hint: "Flota operativa a revisar" },
          { id: "todos", label: "Todos", hint: "Sin filtro de modo" },
        ].map(m => (
          <button
            key={m.id}
            type="button"
            title={m.hint}
            onClick={() => { setModo(m.id); setPage(1); }}
            className={
              modo === m.id
                ? "px-3.5 py-1.5 rounded-xl text-[11px] font-bold border bg-cyan-500/20 border-cyan-500/50 text-cyan-200"
                : "px-3.5 py-1.5 rounded-xl text-[11px] font-semibold border border-slate-800 text-slate-400 hover:border-slate-600"
            }
          >
            {m.label}
          </button>
        ))}
        <span className="text-[10px] text-slate-600 font-mono ml-2 hidden sm:inline">
          {modo === "reactivo" && "Correctivos · Offline / No records"}
          {modo === "preventivo" && "Proactivo · Active / Stopped"}
          {modo === "todos" && "Vista completa de flota"}
        </span>
      </div>

'''
    if marker in src:
        src = src.replace(marker, ui + marker, 1)
        print("OK: UI modos insertada")
    else:
        print("AVISO: no se encontró Filter Controls Bar")

# 5) Tipo atención por defecto según modo al abrir modal — opcional
if 'tipoMant, setTipoMant] = useState("Revision por Bitacora")' in src:
    # dejar default; el usuario elige en modal
    pass

P.write_text(src, encoding="utf-8")
print("LISTO modos Bitácora")