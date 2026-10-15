import type { OrdenListItem } from "../lib/types";
import EstadoBadge from "./EstadoBadge";

export default function OrdenesTable({
  ordenes,
  loading,
  error,
  onSelect,
}: {
  ordenes: OrdenListItem[];
  loading: boolean;
  error: string | null;
  onSelect: (ordenId: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-gray-400">
            <th className="px-4 py-2 font-medium">N° Orden</th>
            <th className="px-4 py-2 font-medium">Fecha Ingreso</th>
            <th className="px-4 py-2 font-medium">Cliente</th>
            <th className="px-4 py-2 font-medium">Máquina</th>
            <th className="px-4 py-2 font-medium">Etapa</th>
            <th className="px-4 py-2 font-medium">Técnico</th>
            <th className="w-8 px-2 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                Cargando órdenes...
              </td>
            </tr>
          )}

          {!loading && error && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-red-500">
                Error al cargar órdenes: {error}
              </td>
            </tr>
          )}

          {!loading && !error && ordenes.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                No hay órdenes que coincidan con este filtro.
              </td>
            </tr>
          )}

          {!loading &&
            !error &&
            ordenes.map((orden) => (
              <tr
                key={orden.id}
                onClick={() => onSelect(orden.id)}
                className="group cursor-pointer transition-colors duration-150 hover:bg-blue-50 active:bg-orange-50"
              >
                <td className="px-4 py-1.5 font-semibold text-gray-900 transition-colors group-hover:text-orange-600">
                  {orden.numero_orden}
                </td>
                <td className="px-4 py-1.5 text-gray-500">
                  {new Date(orden.created_at).toLocaleDateString("es-CL")}
                </td>
                <td className="px-4 py-1.5 text-gray-700">
                  {orden.cliente?.nombre_razon_social ?? "—"}
                </td>
                <td className="px-4 py-1.5">
                  <div className="leading-tight text-gray-700">
                    {orden.maquina?.nombre ?? "—"}
                  </div>
                  {orden.maquina?.modelo && (
                    <div className="text-[10px] leading-tight text-gray-400">
                      {orden.maquina.modelo}
                    </div>
                  )}
                </td>
                <td className="px-4 py-1.5">
                  <EstadoBadge estado={orden.estado} />
                </td>
                <td className="px-4 py-1.5 text-gray-700">
                  {orden.tecnico?.nombre ?? "—"}
                </td>
                <td className="px-2 py-1.5 text-right text-gray-300 transition-colors group-hover:text-orange-500">
                  ›
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
