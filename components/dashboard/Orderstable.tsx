"use client";

import { useEffect, useState } from "react";
import { Plus, MoreVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { getOrdenesServicio } from "@/lib/queries-ordenes";
import { supabase } from "@/lib/supabase/client";
import type { OrdenServicioListItem, TabOrdenes } from "@/types/ordenes";

const PAGE_SIZE = 5;

const tabs: { label: string; value: TabOrdenes }[] = [
  { label: "Todas", value: "todas" },
  { label: "Recepción", value: "recepcion" },
  { label: "Diagnóstico", value: "diagnostico" },
  { label: "Reparación", value: "reparacion" },
  { label: "Listas", value: "listas" },
  { label: "Entregadas", value: "entregadas" },
];

const statusStyles: Record<string, string> = {
  recepcion: "bg-orange-50 text-orange-700",
  esperando_pago_diagnostico: "bg-amber-50 text-amber-700",
  diagnostico: "bg-amber-50 text-amber-700",
  esperando_autorizacion_jefe: "bg-purple-50 text-purple-700",
  esperando_autorizacion_cliente: "bg-purple-50 text-purple-700",
  en_reparacion: "bg-orange-50 text-orange-700",
  lista_para_entrega: "bg-sky-50 text-sky-700",
  no_reparada: "bg-gray-100 text-gray-600",
  rechazada_por_cliente: "bg-red-50 text-red-700",
  entregada: "bg-gray-100 text-gray-600",
};

type OrdersTableProps = {
  selectedOrderId: string | null;
  onSelectOrder: (orderId: string) => void;
  onNewOrder: () => void;
};

function formatStatus(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-CL").format(new Date(date));
}

export default function OrdersTable({
  selectedOrderId,
  onSelectOrder,
  onNewOrder,
}: OrdersTableProps) {
  const [activeTab, setActiveTab] = useState<TabOrdenes>("todas");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<OrdenServicioListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openNuevaOrden, setOpenNuevaOrden] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      setError(null);

      try {
        const result = await getOrdenesServicio(supabase, {
          tab: activeTab,
          page,
          pageSize: PAGE_SIZE,
        });

        if (!cancelled) {
          setOrders(result.ordenes);
          setTotal(result.total);
        }
      } catch (loadError) {
        if (!cancelled) {
          setOrders([]);
          setTotal(0);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar las órdenes.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [activeTab, page]);

  useEffect(() => {
    if (
      orders.length > 0 &&
      !orders.some((order) => order.id === selectedOrderId)
    ) {
      onSelectOrder(orders[0].id);
    }
  }, [onSelectOrder, orders, selectedOrderId]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const visiblePages = Array.from(
    { length: Math.min(3, totalPages) },
    (_, index) => index + 1,
  );
  const startResult = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endResult = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3.5 lg:p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-900">
          Órdenes de Servicio
        </h2>
        <button
          onClick={() => setOpenNuevaOrden(true)}
          className="flex items-center cursor-pointer gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={14} />
          Nueva Orden
        </button>
      </div>

      <div className="flex items-center gap-4 border-b border-gray-100 mb-2.5 py-0.5 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setActiveTab(tab.value);
              setPage(1);
            }}
            className={`relative pb-1.5 text-xs whitespace-nowrap transition-colors ${
              activeTab === tab.value
                ? "text-blue-600 font-semibold"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {activeTab === tab.value && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-orange-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-400 text-[10px] uppercase tracking-wide">
              <th className="px-1 pb-1.5 font-medium">N° Orden</th>
              <th className="px-1 pb-1.5 font-medium">Fecha Ingreso</th>
              <th className="px-1 pb-1.5 font-medium">Cliente</th>
              <th className="px-1 pb-1.5 font-medium">Máquina</th>
              <th className="px-1 pb-1.5 font-medium">Estado</th>
              <th className="px-1 pb-1.5 font-medium">Técnico</th>
              <th className="px-1 pb-1.5 font-medium w-8" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-1 py-6 text-center text-gray-500">
                  Cargando órdenes...
                </td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td colSpan={7} className="px-1 py-6 text-center text-red-600">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-1 py-6 text-center text-gray-500">
                  No hay órdenes para mostrar.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => onSelectOrder(order.id)}
                  className={`cursor-pointer border-t border-gray-50 hover:bg-gray-50/80 transition-colors ${
                    selectedOrderId === order.id ? "bg-blue-50/60" : ""
                  }`}
                >
                  <td className="px-1 py-1.5 font-semibold text-gray-900">
                    {order.numero_orden}
                  </td>
                  <td className="px-1 py-1.5 text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-1 py-1.5 text-gray-700">
                    {order.cliente?.nombre_razon_social ?? "Sin cliente"}
                  </td>
                  <td className="px-1 py-1.5">
                    <p className="text-gray-700">
                      {order.maquina?.nombre ?? "Sin máquina"}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {order.maquina?.modelo ?? "-"}
                    </p>
                  </td>
                  <td className="px-1 py-1.5">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] font-medium ${
                        statusStyles[order.estado] ??
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {formatStatus(order.estado)}
                    </span>
                  </td>
                  <td className="px-1 py-1.5 text-gray-700">
                    {order.tecnico?.nombre ?? "Sin asignar"}
                  </td>
                  <td className="px-1 py-1.5 text-right">
                    <button
                      onClick={(event) => event.stopPropagation()}
                      className="p-0.5 rounded-md hover:bg-gray-100 text-gray-400"
                      aria-label="Más opciones"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-50 flex-wrap gap-2">
        <p className="text-xs text-gray-400">
          Mostrando {startResult} a {endResult} de {total} resultados
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              setPage((currentPage) => Math.max(1, currentPage - 1))
            }
            disabled={page === 1}
            className="flex items-center justify-center w-6.5 h-6.5 rounded-lg border border-gray-200 text-gray-400 disabled:opacity-40 hover:bg-gray-50"
            aria-label="Página anterior"
          >
            <ChevronLeft size={14} />
          </button>
          {visiblePages.map((pageNumber) => (
            <button
              key={pageNumber}
              onClick={() => setPage(pageNumber)}
              className={`w-6.5 h-6.5 rounded-lg text-xs font-medium transition-colors ${
                page === pageNumber
                  ? "bg-orange-600 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {pageNumber}
            </button>
          ))}
          {totalPages > 3 && <span className="px-1 text-gray-400">...</span>}
          {totalPages > 3 && (
            <button
              onClick={() => setPage(totalPages)}
              className={`w-6.5 h-6.5 rounded-lg text-xs font-medium transition-colors ${
                page === totalPages
                  ? "bg-orange-600 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {totalPages}
            </button>
          )}
          <button
            onClick={() =>
              setPage((currentPage) => Math.min(totalPages, currentPage + 1))
            }
            disabled={page === totalPages}
            className="flex items-center justify-center w-6.5 h-6.5 rounded-lg border border-gray-200 text-gray-400 disabled:opacity-40 hover:bg-gray-50"
            aria-label="Página siguiente"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
