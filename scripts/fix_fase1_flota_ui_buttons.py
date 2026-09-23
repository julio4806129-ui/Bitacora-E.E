#!/usr/bin/env python3
"""Añade botones Baja / Reactivar en InventarioPage.jsx — idempotente."""
from pathlib import Path
import re
import sys

FRONT = Path(__file__).resolve().parent.parent / "frontend" / "src" / "pages" / "InventarioPage.jsx"
if not FRONT.exists():
    print("ERROR: no existe InventarioPage.jsx"); sys.exit(1)

src = FRONT.read_text(encoding="utf-8")

# 1) Columna estado_operativo
src = src.replace(
    "{ key: 'estado', label: 'ESTADO', visible: true, width: 'w-28', align: 'left', source: 'flota' },",
    "{ key: 'estado_operativo', label: 'ESTADO', visible: true, width: 'w-28', align: 'left', source: 'flota' },",
)

# 2) Formularios: options y campo estado_operativo
src = src.replace(
    'options={["OPERATIVO", "INOPERATIVO", "EN MANTENIMIENTO", "BAJA"]}',
    'options={["ACTIVO", "MANTENIMIENTO", "BAJA"]}',
)
src = src.replace(
    'estado: "OPERATIVO" });',
    'estado: "OPERATIVO", estado_operativo: "ACTIVO" });',
)
src = src.replace(
    'estado: item.estado ?? "OPERATIVO"',
    'estado: item.estado ?? "OPERATIVO", estado_operativo: item.estado_operativo ?? "ACTIVO"',
)

# 3) Insertar componente BajaReactivarButtons si no existe
MARKER = "function BajaReactivarButtons"
if MARKER not in src:
    component = r'''
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

'''
    # Insertar antes de AddFlotaModal
    src = src.replace("function AddFlotaModal", component + "function AddFlotaModal", 1)
    print("OK: componente BajaReactivarButtons insertado")
else:
    print("OK: BajaReactivarButtons ya existe")

# 4) Render en fila de acciones de flota — buscar patrones comunes
# Si hay botón de editar flota, añadir el componente al lado
if "BajaReactivarButtons item=" not in src and "<BajaReactivarButtons" not in src:
    # Intentar junto a EditFlota / Pencil en filas de flota
    patterns = [
        (r'(setEditFlota\(row\)[^}]*}[^<]*)', None),
    ]
    # Inserción genérica: después de botones de editar en tabla flota
    if "setEditItem" in src or "setEditFlota" in src or "EditFlotaModal" in src:
        # Buscar un bloque de acciones con Pencil en contexto flota
        if re.search(r'Pencil[\s\S]{0,200}?onClick=\{\(\)\s*=>\s*setEdit', src):
            src = re.sub(
                r'(onClick=\{\(\)\s*=>\s*setEdit(?:Flota|Item)\([^)]+\)\}[^>]*>[\s\S]*?</button>)',
                r'\1\n                    <BajaReactivarButtons item={row} />',
                src,
                count=1,
            )
            print("OK: botón Baja/Reactivar enlazado en fila (patrón setEdit)")
        else:
            print("AVISO: No se auto-inyectó el botón en la fila. Añádelo manualmente cerca del botón Editar:")
            print('  <BajaReactivarButtons item={row} />')
    else:
        print("AVISO: No se encontró patrón de edición. Añade manualmente: <BajaReactivarButtons item={row} />")

FRONT.write_text(src, encoding="utf-8")
print("LISTO UI Flota")
print("Revisa: git diff frontend/src/pages/InventarioPage.jsx")