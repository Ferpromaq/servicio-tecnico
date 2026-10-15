import { Eye, X } from "lucide-react";
import type { MotivoModalState } from "../../lib/types";

export default function MotivoModal({
  motivoModal,
  onClose,
}: {
  motivoModal: MotivoModalState;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
                motivoModal.tipo === "autorizado"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-rose-50 text-rose-600"
              }`}
            >
              <Eye className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-gray-900">
                {motivoModal.tipo === "autorizado"
                  ? "Motivo de autorización"
                  : "Motivo del rechazo"}
              </h3>

              <p className="truncate text-[10px] text-gray-400">
                {motivoModal.repuestoNombre}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-4">
          <div
            className={`rounded-lg border p-3 ${
              motivoModal.tipo === "autorizado"
                ? "border-emerald-100 bg-emerald-50/50"
                : "border-rose-100 bg-rose-50/50"
            }`}
          >
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700">
              {motivoModal.motivo}
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-slate-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
