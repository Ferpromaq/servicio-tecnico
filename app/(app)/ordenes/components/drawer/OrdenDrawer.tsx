"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DrawerTab, MotivoModalState, Rol } from "../../lib/types";
import { ROLES_QUE_PUEDEN_SOLICITAR } from "../../lib/constants";
import { useOrdenDetalle } from "../../hooks/useOrdenDetalle";
import { useOrdenRelacionados } from "../../hooks/useOrdenRelacionados";
import { useAutorizarReparacion } from "../../hooks/useAutorizarReparacion";
import { useAccesoAdminRepuestos } from "../../hooks/useAccesoAdminRepuestos";
import { useSolicitudRepuestos } from "../../hooks/useSolicitudRepuestos";
import { useAccionesRepuesto } from "../../hooks/useAccionesRepuesto";
import { useEntregaOrden } from "../../hooks/useEntregaOrden";
import MotivoModal from "./MotivoModal";
import AutorizarReparacionModal from "./AutorizarReparacionModal";
import EntregaPendientesModal from "./EntregaPendientesModal";
import DrawerHeader from "./DrawerHeader";
import DrawerTabs from "./DrawerTabs";
import ResumenTab from "./ResumenTab";
import DiagnosticoTab from "./DiagnosticoTab";
import RepuestosTab from "./RepuestosTab";
import PagosTab from "./PagosTab";
import HistorialTab from "./HistorialTab";

// -----------------------------------------------------------------------
// Drawer de detalle
// -----------------------------------------------------------------------
export default function OrdenDrawer({
  ordenId,
  onClose,
  rol,
  checkingRol,
}: {
  ordenId: string;
  onClose: () => void;
  rol: Rol | null;
  checkingRol: boolean;
}) {
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");

  const activeTab: DrawerTab =
    tabParam === "resumen" ||
    tabParam === "diagnostico" ||
    tabParam === "repuestos" ||
    tabParam === "pagos" ||
    tabParam === "historial"
      ? tabParam
      : "resumen";

  const { orden, setOrden, loading } = useOrdenDetalle(ordenId);
  const { historial, setHistorial, repuestos, pagos, loadRepuestos } =
    useOrdenRelacionados(ordenId, activeTab);

  const [motivoModal, setMotivoModal] = useState<MotivoModalState | null>(
    null,
  );

  // ---------------------------------------------------------------------
  // ADMIN
  // ---------------------------------------------------------------------
  //
  // Solo el admin puede marcar repuestos como recibidos/instalados y solo
  // el admin puede marcar la orden como "lista para entrega".
  const isAdmin = rol === "admin";

  const puedeSolicitarRepuestos =
    rol !== null && ROLES_QUE_PUEDEN_SOLICITAR.includes(rol);

  const maquinaListaParaEntrega = orden?.estado === "lista_para_entrega";

  const reparacion = useAutorizarReparacion({
    ordenId,
    setOrden,
    setHistorial,
  });

  const accesoAdmin = useAccesoAdminRepuestos(ordenId);

  const solicitud = useSolicitudRepuestos({
    ordenId,
    orden,
    puedeSolicitarRepuestos,
    habilitacionExcepcionalRepuestos:
      accesoAdmin.habilitacionExcepcionalRepuestos,
    loadRepuestos,
  });

  const { accionRepuestoEnCurso, marcarRecibido, marcarInstalado } =
    useAccionesRepuesto(loadRepuestos);

  const entrega = useEntregaOrden({
    orden,
    setOrden,
    setHistorial,
    repuestos,
  });

  const repuestosActivos =
    repuestos?.filter((r) => r.estado !== "rechazado") ?? [];

  const repuestosRecibidos = repuestosActivos.filter(
    (r) => r.estado === "comprado" && r.recibido,
  ).length;

  const totalRepuestos = repuestosActivos.length;

  return (
    <>
      {motivoModal && (
        <MotivoModal
          motivoModal={motivoModal}
          onClose={() => setMotivoModal(null)}
        />
      )}

      {reparacion.autorizarReparacionModal && (
        <AutorizarReparacionModal
          numeroOrden={orden?.numero_orden}
          repuestosRecibidos={repuestosRecibidos}
          totalRepuestos={totalRepuestos}
          reparacion={reparacion}
        />
      )}

      {entrega.modalEntregaAbierto && (
        <EntregaPendientesModal
          numeroOrden={orden?.numero_orden}
          entrega={entrega}
        />
      )}

      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl sm:max-w-lg lg:max-w-2xl">
        <DrawerHeader
          orden={orden}
          isAdmin={isAdmin}
          entrega={entrega}
          onClose={onClose}
        />

        <DrawerTabs activeTab={activeTab} />

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <p className="text-sm text-gray-400">Cargando detalle...</p>
          )}

          {!loading && orden && activeTab === "resumen" && (
            <ResumenTab orden={orden} />
          )}

          {!loading && orden && activeTab === "diagnostico" && (
            <DiagnosticoTab orden={orden} setOrden={setOrden} />
          )}

          {activeTab === "repuestos" && (
            <RepuestosTab
              orden={orden}
              repuestos={repuestos}
              repuestosRecibidos={repuestosRecibidos}
              totalRepuestos={totalRepuestos}
              checkingRol={checkingRol}
              puedeSolicitarRepuestos={puedeSolicitarRepuestos}
              isAdmin={isAdmin}
              maquinaListaParaEntrega={maquinaListaParaEntrega}
              accesoAdmin={accesoAdmin}
              solicitud={solicitud}
              reparacion={reparacion}
              accionRepuestoEnCurso={accionRepuestoEnCurso}
              marcarRecibido={marcarRecibido}
              marcarInstalado={marcarInstalado}
              setMotivoModal={setMotivoModal}
            />
          )}

          {activeTab === "pagos" && <PagosTab pagos={pagos} />}

          {activeTab === "historial" && <HistorialTab historial={historial} />}
        </div>
      </div>
    </>
  );
}
