import { cx } from "../nueva/utils";

interface ModalFooterProps {
  puedeCrear: boolean;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export function ModalFooter({ puedeCrear, submitting, onCancel, onSubmit }: ModalFooterProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-800 px-5 py-4">
      <span className="text-xs text-slate-500">
        Estado inicial: <span className="text-orange-400">Recepción</span>
      </span>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
        >
          Cancelar
        </button>
        <button
          onClick={onSubmit}
          disabled={!puedeCrear || submitting}
          className={cx(
            "rounded-lg px-4 py-2 text-sm font-semibold text-white transition",
            puedeCrear && !submitting
              ? "bg-orange-600 hover:bg-orange-500 active:scale-[0.98]"
              : "cursor-not-allowed bg-slate-700 text-slate-400"
          )}
        >
          {submitting ? "Creando..." : "Crear orden"}
        </button>
      </div>
    </div>
  );
}
