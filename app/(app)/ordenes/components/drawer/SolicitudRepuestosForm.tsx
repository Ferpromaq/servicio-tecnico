import { Plus, Trash2 } from "lucide-react";
import type { SolicitudRepuestosState } from "../../hooks/useSolicitudRepuestos";

// Formulario para solicitar uno o varios repuestos de una orden.
// Todo el estado y los handlers vienen de useSolicitudRepuestos.
export default function SolicitudRepuestosForm({
  solicitud,
}: {
  solicitud: SolicitudRepuestosState;
}) {
  const {
    repuestosForm,
    submittingRepuesto,
    formErrorRepuesto,
    formSuccessRepuesto,
    agregarLineaRepuesto,
    eliminarLineaRepuesto,
    actualizarLineaRepuesto,
    handleAgregarRepuesto,
  } = solicitud;

  return (
    <form
      onSubmit={handleAgregarRepuesto}
      className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
    >
      <div>
        <h3 className="text-sm font-semibold text-gray-900">
          Solicitar repuestos
        </h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Agrega uno o más repuestos. Se enviará una sola solicitud.
        </p>
      </div>

      <div className="space-y-3">
        {repuestosForm.map((item, index) => (
          <div
            key={item.id}
            className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/50 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-500">
                Repuesto {index + 1}
              </span>

              {repuestosForm.length > 1 && (
                <button
                  type="button"
                  onClick={() => eliminarLineaRepuesto(item.id)}
                  disabled={submittingRepuesto}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  aria-label="Eliminar repuesto"
                  title="Eliminar repuesto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div>
              <label
                htmlFor={`repuesto-nombre-${item.id}`}
                className="mb-1 block text-xs font-medium text-gray-700"
              >
                Nombre del repuesto
              </label>
              <input
                id={`repuesto-nombre-${item.id}`}
                type="text"
                value={item.nombre}
                onChange={(e) =>
                  actualizarLineaRepuesto(item.id, "nombre", e.target.value)
                }
                placeholder="Ej: Carburador"
                disabled={submittingRepuesto}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor={`repuesto-cantidad-${item.id}`}
                  className="mb-1 block text-xs font-medium text-gray-700"
                >
                  Cantidad
                </label>
                <input
                  id={`repuesto-cantidad-${item.id}`}
                  type="number"
                  min={1}
                  step={1}
                  value={item.cantidad}
                  onChange={(e) =>
                    actualizarLineaRepuesto(item.id, "cantidad", e.target.value)
                  }
                  disabled={submittingRepuesto}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor={`repuesto-valor-${item.id}`}
                  className="mb-1 block text-xs font-medium text-gray-700"
                >
                  Valor estimado (unitario)
                </label>
                <input
                  id={`repuesto-valor-${item.id}`}
                  type="number"
                  min={0}
                  step="any"
                  value={item.valor}
                  onChange={(e) =>
                    actualizarLineaRepuesto(item.id, "valor", e.target.value)
                  }
                  placeholder="0"
                  disabled={submittingRepuesto}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-60"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={item.garantia_cubre_repuesto}
                onChange={(e) =>
                  actualizarLineaRepuesto(
                    item.id,
                    "garantia_cubre_repuesto",
                    e.target.checked,
                  )
                }
                disabled={submittingRepuesto}
                className="h-3.5 w-3.5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              La garantía cubre este repuesto
            </label>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={agregarLineaRepuesto}
        disabled={submittingRepuesto}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-orange-400 hover:text-orange-600 disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Agregar otro repuesto
      </button>

      {formErrorRepuesto && (
        <div
          role="alert"
          className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs text-rose-600"
        >
          {formErrorRepuesto}
        </div>
      )}

      {formSuccessRepuesto && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
          {formSuccessRepuesto}
        </div>
      )}

      <div className="flex justify-end border-t border-gray-100 pt-3">
        <button
          type="submit"
          disabled={submittingRepuesto}
          className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submittingRepuesto ? "Enviando..." : "Solicitar repuestos"}
        </button>
      </div>
    </form>
  );
}