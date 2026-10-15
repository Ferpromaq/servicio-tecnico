import type { Dispatch, SetStateAction } from "react";
import type { OrdenDetalle } from "../../lib/types";
import DiagnosticoPanel from "../../DiagnosticoPanel";

export default function DiagnosticoTab({
  orden,
  setOrden,
}: {
  orden: OrdenDetalle;
  setOrden: Dispatch<SetStateAction<OrdenDetalle | null>>;
}) {
  return (
    <div className="space-y-6">
      <DiagnosticoPanel
        ordenId={orden.id}
        onUpdated={(patch) =>
          setOrden((prev) =>
            prev
              ? {
                  ...prev,
                  estado: patch.estado,
                  diagnostico: patch.diagnostico,
                }
              : prev,
          )
        }
      />

      {orden.razon_no_cubre && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-900">
            Razón no cubre
          </h3>
          <p className="text-sm text-gray-600">{orden.razon_no_cubre}</p>
        </section>
      )}
      {orden.informe_no_reparada && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-900">
            Informe (no reparada)
          </h3>
          <p className="text-sm text-gray-600">{orden.informe_no_reparada}</p>
        </section>
      )}
      {orden.foto_dano_url && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-900">
            Foto del daño
          </h3>
          <img
            src={orden.foto_dano_url}
            alt="Foto del daño"
            className="rounded-lg border border-gray-200"
          />
        </section>
      )}
    </div>
  );
}
