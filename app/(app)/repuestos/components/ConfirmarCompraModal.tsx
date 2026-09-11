"use client";

import { ShoppingCart, X } from "lucide-react";

interface ConfirmarCompraModalProps {
  repuestoNombre: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function ConfirmarCompraModal({
  repuestoNombre,
  onClose,
  onConfirm,
}: ConfirmarCompraModalProps) {
  async function handleConfirm() {
    await onConfirm();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fondo */}{" "}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      ```
      {/* Modal */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShoppingCart className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Confirmar compra
              </h3>

              <p className="mt-0.5 text-xs text-gray-400">
                Esta acción cambiará el estado del repuesto.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition hover:bg-slate-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed text-gray-600">
            ¿Confirmas que el siguiente repuesto ya fue comprado?
          </p>

          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">
              Repuesto
            </div>

            <div className="mt-1 text-sm font-semibold text-gray-800">
              {repuestoNombre}
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-gray-400">
            El repuesto quedará registrado como comprado junto con tu usuario y
            la fecha y hora de esta acción.
          </p>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-slate-200"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
          >
            <ShoppingCart className="h-4 w-4" />
            Sí, marcar como comprado
          </button>
        </div>
      </div>
    </div>
  );
}
