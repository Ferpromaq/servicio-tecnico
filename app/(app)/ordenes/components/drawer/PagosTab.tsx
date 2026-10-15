import type { PagoItem } from "../../lib/types";

export default function PagosTab({ pagos }: { pagos: PagoItem[] | null }) {
  return (
    <div className="space-y-2">
      {pagos === null && (
        <p className="text-sm text-gray-400">Cargando pagos...</p>
      )}
      {pagos !== null && pagos.length === 0 && (
        <p className="text-sm text-gray-400">No hay pagos registrados.</p>
      )}
      {pagos?.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between px-10 rounded-lg border border-gray-200 p-3 text-sm"
        >
          <div>
            <div className="font-medium text-gray-900">
              {p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1)}
            </div>
            <div className="text-xs text-gray-400">
              Boleta N° ${" "}
              {Number(p.numero_boleta).toLocaleString("es-CL")}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900">Fecha Pago</div>
            <div className="text-xs text-gray-400">
              {new Date(p.fecha_pago).toLocaleDateString("es-CL")}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900">
              Monto
              <div className="text-xs text-gray-400">
                ${" "}
                {p.monto ? Number(p.monto).toLocaleString("es-CL") : "0"}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
