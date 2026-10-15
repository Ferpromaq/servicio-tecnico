import type { HistorialItem } from "../../lib/types";
import EstadoBadge from "../EstadoBadge";

export default function HistorialTab({
  historial,
}: {
  historial: HistorialItem[] | null;
}) {
  return (
    <div>
      {historial === null && (
        <p className="text-sm text-gray-400">Cargando historial...</p>
      )}
      {historial !== null && historial.length === 0 && (
        <p className="text-sm text-gray-400">Sin movimientos registrados.</p>
      )}

      {historial !== null && historial.length > 0 && (
        <ul className="relative space-y-0">
          {historial.map((h, i) => {
            const esUltimo = i === historial.length - 1;

            return (
              <li key={h.id} className="relative flex gap-4 pb-6">
                {/* Línea vertical que conecta los puntos, excepto
                    en el último item de la lista. */}
                {!esUltimo && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[7px] top-4 h-full w-px bg-gray-200"
                  />
                )}

                {/* Punto del timeline */}
                <span className="relative z-10 mt-1.5 flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-orange-600 ring-1 ring-orange-100" />

                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {h.estado_anterior && (
                      <>
                        <EstadoBadge estado={h.estado_anterior} />
                        <span className="text-xs text-gray-300">→</span>
                      </>
                    )}
                    <EstadoBadge estado={h.estado_nuevo} />
                  </div>

                  <div className="mt-1.5 text-xs text-gray-400">
                    {new Date(h.created_at).toLocaleString("es-CL", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {h.usuario?.nombre && (
                      <>
                        {" · "}
                        <span className="font-medium text-gray-500">
                          {h.usuario.nombre}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
