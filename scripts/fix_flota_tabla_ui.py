#!/usr/bin/env python3
"""Corrige tabla Inventario Flota: columnas, alineación, GPS/Genesis, estilo."""
from pathlib import Path
import re
import sys

P = Path(__file__).resolve().parent.parent / "frontend" / "src" / "pages" / "InventarioPage.jsx"
if not P.exists():
    print("ERROR: no InventarioPage.jsx"); sys.exit(1)

src = P.read_text(encoding="utf-8")

# 1) Columnas por defecto correctas
NEW_COLS = """const DEFAULT_COLUMNS_FLOTA = [
  { key: 'bus_movil', label: 'MÓVIL', visible: true, width: 'w-24', align: 'left', source: 'flota' },
  { key: 'placa', label: 'PLACA', visible: true, width: 'w-28', align: 'left', source: 'flota' },
  { key: 'tipo_flota', label: 'TIPO', visible: true, width: 'w-28', align: 'left', source: 'flota' },
  { key: 'estado_operativo', label: 'ESTADO FLOTA', visible: true, width: 'w-28', align: 'center', source: 'flota' },
  { key: 'estado_gps', label: 'ESTADO GPS', visible: true, width: 'w-32', align: 'center', source: 'flota' },
  { key: 'patio_genesis', label: 'PATIO', visible: true, width: 'w-32', align: 'left', source: 'flota' },
  { key: 'hora_entrada', label: 'HORA ENTRADA', visible: true, width: 'w-28', align: 'center', source: 'flota' },
  { key: 'estado_genesis', label: 'ESTADO GÉNESIS', visible: true, width: 'w-32', align: 'center', source: 'flota' },
  { key: 'ultima_transmision', label: 'ÚLT. TRANSMISIÓN', visible: true, width: 'w-40', align: 'left', source: 'flota' },
];"""

src, n = re.subn(
    r"const DEFAULT_COLUMNS_FLOTA = \[[\s\S]*?\];",
    NEW_COLS,
    src,
    count=1,
)
print("OK: DEFAULT_COLUMNS_FLOTA" if n else "AVISO: no se reemplazó DEFAULT_COLUMNS_FLOTA")

# 2) fetchTableConfig: validar keys de flota; si no cuadran, usar default
OLD_FETCH = """async function fetchTableConfig(module) {
  try {
    const res = await apiClient.get(`/configuracion/distribucion-tabla/${module}/`);
    return res?.columnas || (module === 'inventario-flota' ? DEFAULT_COLUMNS_FLOTA : DEFAULT_COLUMNS_EE);
  } catch {
    return module === 'inventario-flota' ? DEFAULT_COLUMNS_FLOTA : DEFAULT_COLUMNS_EE;
  }
}"""

NEW_FETCH = """async function fetchTableConfig(module) {
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
}"""

if "keys.has('estado_gps')" not in src:
    if OLD_FETCH in src:
        src = src.replace(OLD_FETCH, NEW_FETCH)
        print("OK: fetchTableConfig valida keys")
    else:
        # intento flexible
        src2, n2 = re.subn(
            r"async function fetchTableConfig\(module\) \{[\s\S]*?\n\}",
            NEW_FETCH,
            src,
            count=1,
        )
        if n2:
            src = src2
            print("OK: fetchTableConfig (regex)")
        else:
            print("AVISO: no se pudo reemplazar fetchTableConfig")

# 3) query page_size
if "page_size: 2000" not in src:
    src = src.replace(
        'queryFn: () => apiClient.get("/inventario-flota/"),',
        'queryFn: () => apiClient.get("/inventario-flota/", { params: { page_size: 2000 } }),',
        1,
    )
    print("OK: page_size 2000")

# 4) Reemplazar renderCellFlota completo
NEW_RENDER = r'''  const renderCellFlota = (row, col) => {
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
'''

src2, n3 = re.subn(
    r"  const renderCellFlota = \(row, col\) => \{[\s\S]*?\n  \};\n\n  const renderCellEE",
    NEW_RENDER + "\n  const renderCellEE",
    src,
    count=1,
)
if n3:
    src = src2
    print("OK: renderCellFlota reescrito")
else:
    print("AVISO: no se reemplazó renderCellFlota")

# 5) Estilo tabla en TabFlota: sticky header + denser rows
src = src.replace(
    '<div className="bg-[#0b1329]/90 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">\n          <table className="w-full text-xs border-collapse">\n            <thead className="bg-[#070b14] border-b border-slate-800">',
    '<div className="bg-[#0b1329]/90 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto">\n          <table className="w-full text-xs border-collapse table-fixed">\n            <thead className="bg-[#070b14] border-b border-slate-800 sticky top-0 z-10">',
    1,
)
print("OK: estilo tabla (sticky + scroll)")

P.write_text(src, encoding="utf-8")
print("=" * 50)
print("LISTO. Reinicia Vite y Ctrl+F5 en /inventario")
print("=" * 50)