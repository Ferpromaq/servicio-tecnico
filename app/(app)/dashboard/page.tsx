"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import OrdersTable from "@/components/dashboard/Orderstable";
import StatsCards from "@/components/dashboard/StatsCards";
import MaintenanceScheduled from "@/components/dashboard/MaintenanceScheduled";
import MaintenanceOverdue from "@/components/dashboard/MaintenanceOverdue";
import OrderDetailPanel from "@/components/dashboard/OrderDetailPanel";
import NuevaOrdenModal from "../ordenes/nueva/NuevaOrdenModal";

export default function DashboardPage() {
  // `selectedOrderId`: qué orden está resaltada / se muestra en el
  // panel FIJO de desktop (xl+). Esto puede cambiar solo, por
  // ejemplo si `OrdersTable` auto-selecciona la primera orden
  // cuando no hay ninguna seleccionada — y eso está bien para
  // desktop, donde el panel derecho siempre debe mostrar algo.
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // `mobileDetailOpen`: si el panel DESLIZANTE de móvil está
  // visible. Es un estado aparte y deliberado: solo se activa
  // cuando el usuario toca una fila, y solo se desactiva cuando
  // el usuario toca la X o el fondo.
  //
  // Antes, el panel móvil se mostraba con la condición
  // `{selectedOrderId && (...)}`, usando el MISMO estado que el
  // panel de desktop. El problema: al tocar la X se limpiaba
  // `selectedOrderId`, y si en OrdersTable existe alguna lógica
  // que reselecciona una orden automáticamente cuando no hay
  // ninguna (algo común para que el panel de desktop nunca quede
  // vacío), esa reselección volvía a poner un valor en
  // `selectedOrderId` y el panel móvil se volvía a abrir solo.
  //
  // Al desacoplar los dos estados, cerrar el panel móvil ya NO
  // toca `selectedOrderId`, así que cualquier lógica de
  // auto-selección que exista en OrdersTable deja de tener efecto
  // sobre si el panel móvil está abierto o cerrado.
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const [openNuevaOrden, setOpenNuevaOrden] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSelectOrder(id: string | null) {
    setSelectedOrderId(id);
    if (id) setMobileDetailOpen(true);
  }

  function closeMobileDetail() {
    setMobileDetailOpen(false);
    // Nota: a propósito NO se hace `setSelectedOrderId(null)` aquí.
    // El panel de desktop debe seguir mostrando la última orden
    // seleccionada, y no tocar este valor es justamente lo que
    // evita el ciclo de reapertura automática.
  }

  // Bloquea el scroll del fondo mientras el panel móvil está abierto.
  useEffect(() => {
    if (!mobileDetailOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileDetailOpen]);

  // Cierre con Escape.
  useEffect(() => {
    if (!mobileDetailOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMobileDetail();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileDetailOpen]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-1 min-w-0">
        <main className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 sm:gap-6 items-start">
            {/* Columna izquierda */}
            <div className="space-y-4 sm:space-y-6 min-w-0">

              <OrdersTable
                key={refreshKey}
                selectedOrderId={selectedOrderId}
                onSelectOrder={handleSelectOrder}
                onNewOrder={() => setOpenNuevaOrden(true)}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <MaintenanceScheduled />
                <MaintenanceOverdue />
              </div>
            </div>

            {/* Columna derecha: detalle de orden (solo desktop, xl+) */}
            <div className="hidden xl:block xl:sticky xl:top-22">
              <OrderDetailPanel orderId={selectedOrderId} />
            </div>
          </div>
        </main>
      </div>

      {/* =====================================================
          DETALLE DE ORDEN EN MÓVIL/TABLET (< xl)
      ===================================================== */}
      {mobileDetailOpen && selectedOrderId && (
        <div
          className="xl:hidden fixed inset-0 z-[100] flex justify-end"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Cerrar detalle"
            onClick={closeMobileDetail}
            className="absolute inset-0 bg-black/40 cursor-default"
          />

          <div
            className="relative w-full sm:w-[440px] max-w-full bg-gray-50 shadow-xl flex flex-col"
            style={{ height: "100dvh" }}
          >
            {/* Header FIJO, fuera del scroll */}
            <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100 shrink-0">
              <span className="text-sm font-semibold text-gray-900">
                Detalle de orden
              </span>

              <button
                type="button"
                onClick={closeMobileDetail}
                className="p-2 -m-2 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-700 active:bg-gray-300 touch-manipulation"
                aria-label="Cerrar detalle"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido, único elemento con scroll */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 overscroll-contain">
              <OrderDetailPanel orderId={selectedOrderId} />
            </div>
          </div>
        </div>
      )}

      <NuevaOrdenModal
        open={openNuevaOrden}
        onClose={() => setOpenNuevaOrden(false)}
        onCreated={() => {
          // fuerza refetch de la tabla de órdenes del dashboard
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}