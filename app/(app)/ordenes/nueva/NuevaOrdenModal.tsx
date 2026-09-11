"use client";

/**
 * NuevaOrdenModal
 * ---------------------------------------------------------------
 * Composición del flujo de creación de orden. Cada pieza de estado
 * vive en su propio hook (hooks/), y cada sección visual es su
 * propio componente (components/). Este archivo solo los conecta.
 *
 * Este es el modal REAL usado por dashboard/page.tsx y
 * OrdenesServicioView.tsx — acepta { open, onClose, onCreated }.
 * Si tienes otro NuevaOrdenModal.tsx en ordenes/components/ que NO
 * recibe estas props, ese es el huérfano: bórralo.
 * ---------------------------------------------------------------
 */

import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { esPendiente } from "./types";
import { useClienteSelection } from "../hooks/useClienteSelection";
import { useMaquinaSelection } from "../hooks/useMaquinaSelection";
import { useGarantia } from "../hooks/useGarantia";
import { useCrearOrden } from "../hooks/useCrearOrden";
import { ModalHeader } from "../components/ModalHeader";
import { OrdenCreadaSuccess } from "../components/OrdenCreadaSuccess";
import { ClienteField } from "../components/ClienteField";
import { MaquinaField } from "../components/MaquinaField";
import { GarantiaField } from "../components/GarantiaField";
import { DescripcionField } from "../components/DescripcionField";
import { ModalFooter } from "../components/ModalFooter";
import { useTecnicoSelection } from "../hooks/useTecnicoSelection";
import { TecnicoField } from "../components/TecnicoField";

interface NuevaOrdenModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}

export default function NuevaOrdenModal({
  open,
  onClose,
  onCreated,
}: NuevaOrdenModalProps) {
  const clienteState = useClienteSelection();
  const maquinaState = useMaquinaSelection();
  const tecnicoState = useTecnicoSelection();
  const garantiaState = useGarantia(maquinaState.maquina, maquinaState.creando);
  const {
    submitting,
    done,
    error,
    submit,
    reset: resetEnvio,
  } = useCrearOrden(onCreated);

  const [descripcion, setDescripcion] = useState("");

  const puedeCrear =
    !!clienteState.cliente &&
    !!maquinaState.maquina &&
    !!tecnicoState.tecnico &&
    descripcion.trim().length > 0 &&
    garantiaState.completa;

  function resetAll() {
    clienteState.reset();
    maquinaState.reset();
    tecnicoState.reset();
    garantiaState.reset();
    resetEnvio();
    setDescripcion("");
  }

  function handleClose() {
    onClose();
    setTimeout(resetAll, 200);
  }

  async function handleSubmit() {
    if (
      !puedeCrear ||
      !clienteState.cliente ||
      !maquinaState.maquina ||
      !tecnicoState.tecnico
    ) {
      return;
    }

    await submit({
      cliente: clienteState.cliente,
      maquina: maquinaState.maquina,
      tecnico: tecnicoState.tecnico,
      tieneGarantia: garantiaState.tieneGarantia,
      numeroBoletaCompra: garantiaState.numeroBoletaCompra,
      montoRevision: garantiaState.montoRevision,
      numeroBoletaRevision: garantiaState.numeroBoletaRevision,
      descripcion,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/60">
        <ModalHeader onClose={handleClose} />

        {done ? (
          <OrdenCreadaSuccess
            maquinaNombre={maquinaState.maquina?.nombre ?? ""}
            clienteNombre={clienteState.cliente?.nombre_razon_social ?? ""}
            onClose={handleClose}
          />
        ) : (
          <>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <ClienteField state={clienteState} />

              <MaquinaField
                state={maquinaState}
                clienteId={
                  clienteState.cliente && !esPendiente(clienteState.cliente)
                    ? clienteState.cliente.id
                    : undefined
                }
                disabled={!clienteState.cliente}
              />

              <GarantiaField state={garantiaState} />

              <TecnicoField state={tecnicoState} />

              <DescripcionField value={descripcion} onChange={setDescripcion} />

              {error && (
                <p className="flex items-start gap-1.5 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-400">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
                </p>
              )}
            </div>

            <ModalFooter
              puedeCrear={puedeCrear}
              submitting={submitting}
              onCancel={handleClose}
              onSubmit={handleSubmit}
            />
          </>
        )}
      </div>
    </div>
  );
}
