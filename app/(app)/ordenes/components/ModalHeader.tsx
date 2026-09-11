import { X } from "lucide-react";

export function ModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
      <div>
        <h2 className="text-base font-semibold text-slate-100">Nueva orden de servicio</h2>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
          N° de orden:
          <span className="font-mono-tech rounded bg-slate-800 px-1.5 py-0.5 text-orange-400">
            OS-{new Date().getFullYear()}-XXXXX
          </span>
          <span className="text-slate-600">(autogenerado)</span>
        </p>
      </div>
      <button
        onClick={onClose}
        className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
      >
        <X size={18} />
      </button>
    </div>
  );
}
