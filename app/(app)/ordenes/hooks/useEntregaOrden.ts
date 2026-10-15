"use client";

import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { supabase } from "../lib/supabase";
import type {
  HistorialItem,
  OrdenDetalle,
  RepuestoItem,
} from "../lib/types";

// -----------------------------------------------------------------
// ENTREGA DE LA MÁQUINA (solo admin)
// -----------------------------------------------------------------
//
// Una orden puede pasar a "lista_para_entrega" sin bloqueos cuando ya
// no quedan repuestos pendientes de autorización, ni autorizados sin
// recibir/instalar (los rechazados NUNCA bloquean, sea cual sea su
// cantidad — incluido el caso "todos los repuestos rechazados").
//
// `repuestos_pendientes_entrega` es una función de Postgres que
// replica exactamente esa regla, y además queda validada a nivel de
// base de datos (trigger `trg_validar_entrega_orden`) para no
// depender solo de que el frontend calcule bien.
//
// Si SÍ hay pendientes, el admin puede igual forzar la entrega (ej:
// el cliente no autoriza el costo y retira la máquina así como está),
// pero debe dejar un motivo, que la BD exige.
export function useEntregaOrden({
  orden,
  setOrden,
  setHistorial,
  repuestos,
}: {
  orden: OrdenDetalle | null;
  setOrden: Dispatch<SetStateAction<OrdenDetalle | null>>;
  setHistorial: Dispatch<SetStateAction<HistorialItem[] | null>>;
  repuestos: RepuestoItem[] | null;
}) {
  const [pendientesEntrega, setPendientesEntrega] = useState<boolean | null>(
    null,
  );

  const [modalEntregaAbierto, setModalEntregaAbierto] = useState(false);

  const [motivoEntrega, setMotivoEntrega] = useState("");

  const [marcandoEntrega, setMarcandoEntrega] = useState(false);

  const checkPendientesEntrega = useCallback(async () => {
    if (!orden) {
      setPendientesEntrega(null);
      return;
    }

    const { data, error } = await supabase.rpc("repuestos_pendientes_entrega", {
      p_orden_id: orden.id,
    });

    if (error) {
      console.error("Error verificando repuestos pendientes:", error);
      // Ante la duda, tratamos la orden como "con pendientes" para no
      // dejar pasar una entrega sin motivo por un error transitorio.
      setPendientesEntrega(true);
      return;
    }

    setPendientesEntrega(Boolean(data));
  }, [orden]);

  // Revisamos apenas tenemos la orden, y también cada vez que la lista
  // de repuestos se recarga (recibido/instalado/autorizado cambia).
  useEffect(() => {
    checkPendientesEntrega();
  }, [checkPendientesEntrega, repuestos]);

  const yaEntregable =
    orden !== null &&
    orden.estado !== "lista_para_entrega" &&
    orden.estado !== "entregada";

  async function marcarListaParaEntrega(forzada: boolean, motivo?: string) {
    if (!orden) return;

    setMarcandoEntrega(true);

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();

      if (authError || !auth.user) {
        throw new Error("No se pudo identificar al usuario actual.");
      }

      const { error } = await supabase
        .from("ordenes_servicio")
        .update({
          estado: "lista_para_entrega",
          entrega_forzada: forzada,
          motivo_entrega_forzada: forzada ? (motivo ?? null) : null,
          entrega_marcada_por: auth.user.id,
          entrega_marcada_en: new Date().toISOString(),
        })
        .eq("id", orden.id);

      if (error) throw error;

      // -------------------------------------------------------------
      // NOTIFICAR AL CLIENTE
      // -------------------------------------------------------------

      const notificacionResponse = await fetch(
        "/ordenes/notificar-lista-entrega",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ordenId: orden.id,
          }),
        },
      );

      const notificacionText = await notificacionResponse.text();

      let notificacionResult;

      try {
        notificacionResult = JSON.parse(notificacionText);
      } catch {
        notificacionResult = null;
      }

      if (!notificacionResponse.ok) {
        console.error(
          "La orden quedó lista para entrega, pero falló el correo:",
          notificacionResult ?? notificacionText,
        );

        alert(
          notificacionResult?.error ??
            "La máquina quedó lista para entregar, pero no se pudo enviar el correo al cliente.",
        );
      }

      setModalEntregaAbierto(false);
      setMotivoEntrega("");

      setOrden((prev) =>
        prev
          ? {
              ...prev,
              estado: "lista_para_entrega",
              entrega_forzada: forzada,
              motivo_entrega_forzada: forzada ? (motivo?.trim() ?? null) : null,
              entrega_marcada_en: new Date().toISOString(),
              entrega_marcada_por: auth.user.id,
              entrega_marcada_por_usuario: null,
            }
          : prev,
      );

      // Recargar historial para que aparezca el cambio de estado.
      setHistorial(null);
    } catch (error) {
      console.error("Error marcando la orden como lista para entrega:", error);
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo marcar la orden como lista para entrega.",
      );
    } finally {
      setMarcandoEntrega(false);
    }
  }

  function handleClickListaParaEntrega() {
    const requiereMotivo =
      pendientesEntrega || orden?.estado === "esperando_autorizacion_cliente";

    if (requiereMotivo) {
      setMotivoEntrega("");
      setModalEntregaAbierto(true);
      return;
    }

    marcarListaParaEntrega(false);
  }

  return {
    pendientesEntrega,
    modalEntregaAbierto,
    setModalEntregaAbierto,
    motivoEntrega,
    setMotivoEntrega,
    marcandoEntrega,
    yaEntregable,
    marcarListaParaEntrega,
    handleClickListaParaEntrega,
  };
}

export type EntregaOrdenState = ReturnType<typeof useEntregaOrden>;
