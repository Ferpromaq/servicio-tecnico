import { Truck } from "lucide-react";
import type { EntregaOrdenState } from "../../hooks/useEntregaOrden";
import type { OrdenDetalle } from "../../lib/types";
import EstadoBadge from "../EstadoBadge";

export default function DrawerHeader({
  orden,
  isAdmin,
  entrega,
  onClose,
}: {
  orden: OrdenDetalle | null;
  isAdmin: boolean;
  entrega: EntregaOrdenState;
  onClose: () => void;
}) {
  const {
    yaEntregable,
    handleClickListaParaEntrega,
    marcandoEntrega,
    pendientesEntrega,
  } = entrega;

  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-4">
      <div className="min-w-0">
        <div className="text-xs text-gray-400">Orden de Servicio</div>
        <div className="truncate text-lg font-semibold text-gray-900">
          {orden?.numero_orden ?? "..."}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {/* =============================================
            BOTÓN: MARCAR LISTA PARA ENTREGA (solo admin)
        ============================================= */}
        {isAdmin && orden && yaEntregable && (
          <button
            type="button"
            onClick={handleClickListaParaEntrega}
            disabled={marcandoEntrega || pendientesEntrega === null}
            title={
              pendientesEntrega
                ? "Hay repuestos pendientes: se pedirá un motivo para forzar la entrega"
                : "Marcar la máquina como lista para entrega"
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Truck className="h-3.5 w-3.5" strokeWidth={2.5} />
            {marcandoEntrega ? "Marcando..." : "Lista para entrega"}
          </button>
        )}

        {orden && <EstadoBadge estado={orden.estado} />}
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
