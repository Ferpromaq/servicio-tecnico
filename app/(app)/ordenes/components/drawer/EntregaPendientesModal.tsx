import { Truck } from "lucide-react";
import type { EntregaOrdenState } from "../../hooks/useEntregaOrden";

// =====================================================
// MODAL: ENTREGA CON REPUESTOS PENDIENTES
// =====================================================
export default function EntregaPendientesModal({
  numeroOrden,
  entrega,
}: {
  numeroOrden: string | undefined;
  entrega: EntregaOrdenState;
}) {
  const {
    marcandoEntrega,
    setModalEntregaAbierto,
    motivoEntrega,
    setMotivoEntrega,
    marcarListaParaEntrega,
  } = entrega;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-[2px]"
      onClick={() => !marcandoEntrega && setModalEntregaAbierto(false)}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Truck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-900">
              Entrega con repuestos pendientes
            </h3>
            <p className="text-[10px] text-gray-400">{numeroOrden}</p>
          </div>
        </div>

        <div className="px-4 py-4">
          <p className="text-[12px] text-gray-500 leading-relaxed mb-3">
            Esta orden todavía tiene repuestos sin autorizar, sin recibir o sin
            instalar. Indica el motivo por el cual la máquina se entrega de
            todos modos — por ejemplo, el cliente no autoriza el costo y decide
            retirarla como está.
          </p>

          <textarea
            value={motivoEntrega}
            onChange={(e) => setMotivoEntrega(e.target.value)}
            rows={3}
            placeholder="Motivo de la entrega..."
            className="w-full rounded-lg border border-gray-200 p-2 text-[12px] focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={() => setModalEntregaAbierto(false)}
            disabled={marcandoEntrega}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-slate-200 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={motivoEntrega.trim().length < 5 || marcandoEntrega}
            onClick={() => marcarListaParaEntrega(true, motivoEntrega)}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {marcandoEntrega ? "Guardando..." : "Confirmar entrega"}
          </button>
        </div>
      </div>
    </div>
  );
}
