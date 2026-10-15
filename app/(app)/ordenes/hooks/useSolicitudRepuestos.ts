"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { OrdenDetalle, RepuestoFormItem } from "../lib/types";

// -----------------------------------------------------------------
// FORMULARIO: solicitar repuesto
// -----------------------------------------------------------------
export function useSolicitudRepuestos({
  ordenId,
  orden,
  puedeSolicitarRepuestos,
  habilitacionExcepcionalRepuestos,
  loadRepuestos,
}: {
  ordenId: string;
  orden: OrdenDetalle | null;
  puedeSolicitarRepuestos: boolean;
  habilitacionExcepcionalRepuestos: boolean;
  loadRepuestos: () => Promise<void>;
}) {
  const [repuestosForm, setRepuestosForm] = useState<RepuestoFormItem[]>([
    {
      id: crypto.randomUUID(),
      nombre: "",
      cantidad: "1",
      valor: "",
      garantia_cubre_repuesto: false,
    },
  ]);

  const [submittingRepuesto, setSubmittingRepuesto] = useState(false);

  const [formErrorRepuesto, setFormErrorRepuesto] = useState<string | null>(
    null,
  );

  const [formSuccessRepuesto, setFormSuccessRepuesto] = useState<string | null>(
    null,
  );

  function agregarLineaRepuesto() {
    setRepuestosForm((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nombre: "",
        cantidad: "1",
        valor: "",
        garantia_cubre_repuesto: false,
      },
    ]);
  }

  function eliminarLineaRepuesto(id: string) {
    setRepuestosForm((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }

  function actualizarLineaRepuesto(
    id: string,
    campo: keyof Omit<RepuestoFormItem, "id">,
    valor: string | boolean,
  ) {
    setRepuestosForm((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [campo]: valor,
            }
          : item,
      ),
    );
  }

  // -----------------------------------------------------------------
  // CREAR SOLICITUD DE REPUESTO
  // -----------------------------------------------------------------

  async function handleAgregarRepuesto(e: React.FormEvent) {
    e.preventDefault();

    setFormErrorRepuesto(null);
    setFormSuccessRepuesto(null);

    if (!puedeSolicitarRepuestos) {
      setFormErrorRepuesto("No tienes permiso para solicitar repuestos.");
      return;
    }

    if (!orden) {
      setFormErrorRepuesto("No se pudo obtener la información de la orden.");
      return;
    }

    if (
      orden.estado === "lista_para_entrega" &&
      !habilitacionExcepcionalRepuestos
    ) {
      setFormErrorRepuesto(
        "La máquina está lista para entrega. Se requiere autorización administrativa para solicitar más repuestos.",
      );
      return;
    }

    // ---------------------------------------------------------------
    // VALIDAR TODAS LAS LÍNEAS
    // ---------------------------------------------------------------

    const lineasValidas = repuestosForm.map((item) => ({
      ...item,
      nombre: item.nombre.trim(),
      cantidadNum: Number(item.cantidad),
      valorNum: Number(item.valor || 0),
    }));

    const lineaVacia = lineasValidas.find((item) => !item.nombre);

    if (lineaVacia) {
      setFormErrorRepuesto("Todos los repuestos deben tener un nombre.");
      return;
    }

    const cantidadInvalida = lineasValidas.find(
      (item) => !Number.isFinite(item.cantidadNum) || item.cantidadNum <= 0,
    );

    if (cantidadInvalida) {
      setFormErrorRepuesto(
        "La cantidad debe ser mayor a 0 en todos los repuestos.",
      );
      return;
    }

    const valorInvalido = lineasValidas.find(
      (item) => !Number.isFinite(item.valorNum) || item.valorNum < 0,
    );

    if (valorInvalido) {
      setFormErrorRepuesto(
        "El valor estimado no es válido en uno de los repuestos.",
      );
      return;
    }

    setSubmittingRepuesto(true);

    try {
      // -------------------------------------------------------------
      // USUARIO ACTUAL
      // -------------------------------------------------------------

      const { data: auth, error: authError } = await supabase.auth.getUser();

      if (authError || !auth.user) {
        throw new Error("No se pudo identificar al usuario actual.");
      }

      // -------------------------------------------------------------
      // PREPARAR LOS DATOS
      // -------------------------------------------------------------

      const repuestosParaInsertar = lineasValidas.map((item) => ({
        origen_tipo: "orden_servicio",
        origen_id: ordenId,
        maquina_id: orden.maquina?.id ?? null,
        nombre_repuesto: item.nombre,
        cantidad: item.cantidadNum,
        valor: item.valorNum,
        garantia_cubre_repuesto: item.garantia_cubre_repuesto,
        estado: "pendiente",
        solicitado_por: auth.user.id,
      }));

      // -------------------------------------------------------------
      // INSERTAR TODOS LOS REPUESTOS
      // -------------------------------------------------------------
      //
      // ⚠️ IMPORTANTE: `repuestosInsertados` es la ÚNICA fuente confiable
      // de `id` para lo que sigue. Los `id` de `repuestosForm` /
      // `lineasValidas` son UUIDs generados en el navegador (crypto.randomUUID())
      // solo para el `key` de React — nunca deben usarse para construir
      // enlaces ni para nada que dependa del id real en la base de datos.

      const { data: repuestosInsertados, error: insertError } = await supabase
        .from("repuestos_solicitados")
        .insert(repuestosParaInsertar)
        .select("id, nombre_repuesto, valor, cantidad, estado, created_at");

      if (insertError) {
        throw insertError;
      }

      if (!repuestosInsertados || repuestosInsertados.length === 0) {
        throw new Error(
          "Los repuestos no se pudieron confirmar en la base de datos.",
        );
      }

      // -------------------------------------------------------------
      // CALCULAR TOTAL
      // -------------------------------------------------------------

      const totalEstimado = repuestosInsertados.reduce(
        (total, item) => total + item.cantidad * Number(item.valor),
        0,
      );

      // -------------------------------------------------------------
      // ENVIAR CORREO
      // -------------------------------------------------------------
      // Usa SIEMPRE repuestosInsertados (ids reales de Supabase), nunca
      // lineasValidas / repuestosForm.

      const response = await fetch("/repuestos/solicitud", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ordenId: orden.id,
          repuestos: repuestosInsertados.map((item) => ({
            id: item.id,
            nombre: item.nombre_repuesto,
            cantidad: item.cantidad,
            valor: Number(item.valor),
            subtotal: item.cantidad * Number(item.valor),
          })),
          totalEstimado,
        }),
      });

      const responseText = await response.text();

      console.log("Respuesta de /api/repuestos/solicitud:", responseText);

      let emailResult;

      try {
        emailResult = JSON.parse(responseText);
      } catch {
        console.error("La API no devolvió JSON:", responseText);

        throw new Error(
          "Los repuestos se guardaron, pero la API de correo devolvió una respuesta inválida.",
        );
      }

      if (!response.ok) {
        console.error(
          "Los repuestos fueron guardados, pero falló el correo:",
          emailResult,
        );

        setFormSuccessRepuesto(
          "Los repuestos fueron registrados, pero no se pudo enviar la notificación por correo.",
        );
      } else {
        setFormSuccessRepuesto(
          `Solicitud confirmada con ${repuestosInsertados.length} repuesto(s).`,
        );
      }

      // -------------------------------------------------------------
      // ENVIAR CORREO AL CLIENTE
      // -------------------------------------------------------------
      // El servidor lee cliente, máquina y valores desde la base de datos.
      // Si falla, no se revierte la solicitud: solo se avisa.

      let avisoCliente = "";

      try {
        const clienteResponse = await fetch("/repuestos/solicitud-cliente", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ordenId: orden.id,
            repuestoIds: repuestosInsertados.map((item) => item.id),
          }),
        });

        const clienteResult = await clienteResponse.json().catch(() => null);

        if (!clienteResponse.ok) {
          console.error("Falló el correo al cliente:", clienteResult);
          avisoCliente = ` No se pudo enviar el correo al cliente: ${
            clienteResult?.error ?? "error desconocido"
          }`;
        } else {
          avisoCliente = " Se envió el detalle por correo al cliente.";
        }
      } catch (err) {
        console.error("Error llamando a /repuestos/solicitud-cliente:", err);
        avisoCliente = " No se pudo enviar el correo al cliente.";
      }

      setFormSuccessRepuesto((prev) => (prev ?? "") + avisoCliente);

      // -------------------------------------------------------------
      // LIMPIAR FORMULARIO
      // -------------------------------------------------------------

      setRepuestosForm([
        {
          id: crypto.randomUUID(),
          nombre: "",
          cantidad: "1",
          valor: "",
          garantia_cubre_repuesto: false,
        },
      ]);

      // -------------------------------------------------------------
      // RECARGAR LISTA
      // -------------------------------------------------------------

      await loadRepuestos();
    } catch (err) {
      console.error("Error creando solicitud de repuestos:", err);

      setFormErrorRepuesto(
        err instanceof Error
          ? err.message
          : "No se pudo registrar la solicitud de repuestos.",
      );
    } finally {
      setSubmittingRepuesto(false);
    }
  }

  return {
    repuestosForm,
    submittingRepuesto,
    formErrorRepuesto,
    formSuccessRepuesto,
    agregarLineaRepuesto,
    eliminarLineaRepuesto,
    actualizarLineaRepuesto,
    handleAgregarRepuesto,
  };
}

export type SolicitudRepuestosState = ReturnType<typeof useSolicitudRepuestos>;
