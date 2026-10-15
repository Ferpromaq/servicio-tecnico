import type { Dispatch, SetStateAction } from "react";
import type { AccesoAdminRepuestosState } from "../../hooks/useAccesoAdminRepuestos";
import type { AutorizarReparacionState } from "../../hooks/useAutorizarReparacion";
import type { SolicitudRepuestosState } from "../../hooks/useSolicitudRepuestos";
import type {
  MotivoModalState,
  OrdenDetalle,
  RepuestoItem,
} from "../../lib/types";
import AccesoAdminRepuestos from "./AccesoAdminRepuestos";
import RepuestoCard from "./RepuestoCard";
import RepuestosBannerReparacion from "./RepuestosBannerReparacion";
import SolicitudRepuestosForm from "./SolicitudRepuestosForm";

export default function RepuestosTab({
  orden,
  repuestos,
  repuestosRecibidos,
  totalRepuestos,
  checkingRol,
  puedeSolicitarRepuestos,
  isAdmin,
  maquinaListaParaEntrega,
  accesoAdmin,
  solicitud,
  reparacion,
  accionRepuestoEnCurso,
  marcarRecibido,
  marcarInstalado,
  setMotivoModal,
}: {
  orden: OrdenDetalle | null;
  repuestos: RepuestoItem[] | null;
  repuestosRecibidos: number;
  totalRepuestos: number;
  checkingRol: boolean;
  puedeSolicitarRepuestos: boolean;
  isAdmin: boolean;
  maquinaListaParaEntrega: boolean;
  accesoAdmin: AccesoAdminRepuestosState;
  solicitud: SolicitudRepuestosState;
  reparacion: AutorizarReparacionState;
  accionRepuestoEnCurso: string | null;
  marcarRecibido: (repuestoId: string) => void;
  marcarInstalado: (repuestoId: string) => void;
  setMotivoModal: Dispatch<SetStateAction<MotivoModalState | null>>;
}) {
  return (
    <div className="space-y-4">
      {orden?.estado === "esperando_repuestos" && (
        <RepuestosBannerReparacion
          totalRepuestos={totalRepuestos}
          repuestosRecibidos={repuestosRecibidos}
          reparacion={reparacion}
        />
      )}

      {/* ===========================================================
          FORMULARIO: solo técnico/supervisor pueden solicitar.
          La restricción real la da la policy RESTRICTIVE de RLS en
          repuestos_solicitados; este chequeo es solo UX.
      =========================================================== */}

      {!checkingRol && puedeSolicitarRepuestos && (
        <>
          {maquinaListaParaEntrega &&
          !accesoAdmin.habilitacionExcepcionalRepuestos ? (
            <AccesoAdminRepuestos acceso={accesoAdmin} />
          ) : (
            <SolicitudRepuestosForm solicitud={solicitud} />
          )}
        </>
      )}

      {!checkingRol && !puedeSolicitarRepuestos && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
          Solo técnicos o supervisores pueden solicitar repuestos.
        </div>
      )}

      {/* =========================================================
          LISTA (visible para todos los roles con acceso al drawer)
      ========================================================= */}

      {repuestos?.map((r) => (
        <RepuestoCard
          key={r.id}
          r={r}
          enCurso={accionRepuestoEnCurso === r.id}
          isAdmin={isAdmin}
          setMotivoModal={setMotivoModal}
          marcarRecibido={marcarRecibido}
          marcarInstalado={marcarInstalado}
        />
      ))}
    </div>
  );
}
