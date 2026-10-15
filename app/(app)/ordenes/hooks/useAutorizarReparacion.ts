"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { HistorialItem, OrdenDetalle } from "../lib/types";

export function useAutorizarReparacion({
  ordenId,
  setOrden,
  setHistorial,
}: {
  ordenId: string;
  setOrden: Dispatch<SetStateAction<OrdenDetalle | null>>;
  setHistorial: Dispatch<SetStateAction<HistorialItem[] | null>>;
}) {
  const [autorizarReparacionModal, setAutorizarReparacionModal] =
    useState(false);

  const [emailAdmin, setEmailAdmin] = useState("");
  const [passwordAdmin, setPasswordAdmin] = useState("");
  const [motivoReparacion, setMotivoReparacion] = useState("");

  const [autorizandoReparacion, setAutorizandoReparacion] = useState(false);
  const [errorAutorizacionReparacion, setErrorAutorizacionReparacion] =
    useState<string | null>(null);

  function abrirAutorizacionReparacion() {
    setEmailAdmin("");
    setPasswordAdmin("");
    setMotivoReparacion("");
    setErrorAutorizacionReparacion(null);
    setAutorizarReparacionModal(true);
  }

  async function confirmarPasoAReparacion(e: React.FormEvent) {
    e.preventDefault();

    setErrorAutorizacionReparacion(null);

    if (!emailAdmin.trim()) {
      setErrorAutorizacionReparacion("Ingresa el correo del administrador.");
      return;
    }

    if (!passwordAdmin) {
      setErrorAutorizacionReparacion(
        "Ingresa la contraseña del administrador.",
      );
      return;
    }

    if (!motivoReparacion.trim()) {
      setErrorAutorizacionReparacion(
        "Debes indicar el motivo para iniciar la reparación.",
      );
      return;
    }

    setAutorizandoReparacion(true);

    try {
      const response = await fetch("/ordenes/lib/autorizar-reparacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ordenId: ordenId,
          email: emailAdmin.trim(),
          password: passwordAdmin,
          motivo: motivoReparacion.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ?? "No se pudo autorizar el inicio de la reparación.",
        );
      }

      setAutorizarReparacionModal(false);

      setOrden((prev) =>
        prev
          ? {
              ...prev,
              estado: "en_reparacion",
            }
          : prev,
      );

      // Recargar historial para que aparezca la autorización.
      setHistorial(null);
    } catch (err) {
      console.error("Error autorizando reparación:", err);

      setErrorAutorizacionReparacion(
        err instanceof Error
          ? err.message
          : "No se pudo autorizar el inicio de la reparación.",
      );
    } finally {
      setAutorizandoReparacion(false);
    }
  }

  return {
    autorizarReparacionModal,
    setAutorizarReparacionModal,
    emailAdmin,
    setEmailAdmin,
    passwordAdmin,
    setPasswordAdmin,
    motivoReparacion,
    setMotivoReparacion,
    autorizandoReparacion,
    errorAutorizacionReparacion,
    abrirAutorizacionReparacion,
    confirmarPasoAReparacion,
  };
}

export type AutorizarReparacionState = ReturnType<
  typeof useAutorizarReparacion
>;
