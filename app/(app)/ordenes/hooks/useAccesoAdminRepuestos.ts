"use client";

import { useState } from "react";

// -------------------------------------------------------------
// BLOQUEO DE SOLICITUD DE REPUESTOS EN MÁQUINAS LISTAS
// -------------------------------------------------------------
export function useAccesoAdminRepuestos(ordenId: string) {
  const [mostrarAccesoAdminRepuestos, setMostrarAccesoAdminRepuestos] =
    useState(false);

  const [usuarioAdminRepuestos, setUsuarioAdminRepuestos] = useState("");
  const [passwordAdminRepuestos, setPasswordAdminRepuestos] = useState("");

  const [
    habilitacionExcepcionalRepuestos,
    setHabilitacionExcepcionalRepuestos,
  ] = useState(false);

  const [validandoAdminRepuestos, setValidandoAdminRepuestos] = useState(false);
  const [errorAdminRepuestos, setErrorAdminRepuestos] = useState("");

  async function validarAdminYHabilitarRepuestos(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();
    setErrorAdminRepuestos("");

    if (!usuarioAdminRepuestos.trim() || !passwordAdminRepuestos) {
      setErrorAdminRepuestos(
        "Ingresa el usuario y la contraseña del administrador.",
      );
      return;
    }

    setValidandoAdminRepuestos(true);

    try {
      const response = await fetch("/ordenes/lib/autorizar-reparacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ordenId,
          email: usuarioAdminRepuestos.trim(),
          password: passwordAdminRepuestos,
          motivo:
            "Autorización excepcional para solicitar repuestos en una orden lista para entrega.",
        }),
      });

      const responseText = await response.text();

      let data: { error?: string; message?: string } | null = null;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error(
          "La API de autorización devolvió una respuesta que no es JSON:",
          response.status,
          responseText,
        );

        throw new Error(
          `La API devolvió una respuesta inválida (HTTP ${response.status}). Revisa la ruta y los registros del servidor.`,
        );
      }

      console.log("Respuesta de autorización:", response.status, data);

      if (!response.ok) {
        throw new Error(
          data?.error ??
            data?.message ??
            `La autorización falló (HTTP ${response.status}).`,
        );
      }

      setHabilitacionExcepcionalRepuestos(true);
      setMostrarAccesoAdminRepuestos(false);
      setPasswordAdminRepuestos("");
      setUsuarioAdminRepuestos("");
    } catch (error) {
      setErrorAdminRepuestos(
        error instanceof Error
          ? error.message
          : "No se pudo autorizar la excepción.",
      );
    } finally {
      setValidandoAdminRepuestos(false);
    }
  }

  return {
    mostrarAccesoAdminRepuestos,
    setMostrarAccesoAdminRepuestos,
    usuarioAdminRepuestos,
    setUsuarioAdminRepuestos,
    passwordAdminRepuestos,
    setPasswordAdminRepuestos,
    habilitacionExcepcionalRepuestos,
    validandoAdminRepuestos,
    errorAdminRepuestos,
    setErrorAdminRepuestos,
    validarAdminYHabilitarRepuestos,
  };
}

export type AccesoAdminRepuestosState = ReturnType<
  typeof useAccesoAdminRepuestos
>;
