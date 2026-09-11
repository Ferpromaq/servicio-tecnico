import { Check } from "lucide-react";

interface OrdenCreadaSuccessProps {
  maquinaNombre: string;
  clienteNombre: string;
  onClose: () => void;
}

export function OrdenCreadaSuccess({ maquinaNombre, clienteNombre, onClose }: OrdenCreadaSuccessProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
        <Check size={24} />
      </div>
      <p className="text-sm font-medium text-slate-100">Orden creada correctamente</p>
      <p className="max-w-xs text-xs text-slate-500">
        {maquinaNombre} de {clienteNombre} ingresó en estado <span className="text-orange-400">Recepción</span>.
      </p>
      <button
        onClick={onClose}
        className="mt-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
      >
        Cerrar
      </button>
    </div>
  );
}
