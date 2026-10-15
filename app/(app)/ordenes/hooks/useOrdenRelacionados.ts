"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type {
  DrawerTab,
  HistorialItem,
  PagoItem,
  RepuestoItem,
} from "../lib/types";

// Datos relacionados, cargados perezosamente por tab
export function useOrdenRelacionados(ordenId: string, activeTab: DrawerTab) {
  const [historial, setHistorial] = useState<HistorialItem[] | null>(null);
  const [repuestos, setRepuestos] = useState<RepuestoItem[] | null>(null);
  const [pagos, setPagos] = useState<PagoItem[] | null>(null);

  // Recarga la lista de repuestos de esta orden (se usa tanto en la carga
  // perezosa por tab como después de agregar uno nuevo desde el formulario,
  // y después de marcar un repuesto como recibido/instalado).
  const loadRepuestos = useCallback(async () => {
    const { data, error } = await supabase
      .from("repuestos_solicitados")
      .select(
        `
  id,
  nombre_repuesto,
  valor,
  cantidad,
  estado,
  garantia_cubre_repuesto,
  created_at,

  recibido,
  recibido_en,
  recibido_por,

  instalado,
  instalado_en,
  instalado_por,

  motivo_autorizacion,
  motivo_rechazo,

  autorizado_por,
  autorizado_en,
  rechazado_por,
  rechazado_en,

  autorizado_por_usuario:usuarios!repuestos_solicitados_autorizado_por_fkey (
    nombre
  ),

  rechazado_por_usuario:usuarios!repuestos_solicitados_rechazado_por_fkey (
    nombre
  ),

  recibido_por_usuario:usuarios!repuestos_solicitados_recibido_por_fkey (
    nombre
  ),

  instalado_por_usuario:usuarios!repuestos_solicitados_instalado_por_fkey (
    nombre
  )
`,
      )
      .eq("origen_tipo", "orden_servicio")
      .eq("origen_id", ordenId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando repuestos:", error);
      return;
    }

    setRepuestos((data as unknown as RepuestoItem[]) ?? []);
  }, [ordenId]);

  useEffect(() => {
    let cancelled = false;

    async function fetchRelacionados() {
      if (activeTab === "historial" && historial === null) {
        const { data } = await supabase
          .from("historial_estados")
          .select(
            "id, estado_anterior, estado_nuevo, created_at, usuario:usuarios(nombre)",
          )
          .eq("origen_tipo", "orden_servicio") // ⚠️ ajusta al valor real del enum
          .eq("origen_id", ordenId)
          .order("created_at", { ascending: true });
        if (!cancelled)
          setHistorial((data as unknown as HistorialItem[]) ?? []);
      }

      if (activeTab === "repuestos" && repuestos === null) {
        await loadRepuestos();
      }

      if (activeTab === "pagos" && pagos === null) {
        const { data } = await supabase
          .from("pagos")
          .select("id, tipo, numero_boleta, fecha_pago, monto")
          .eq("orden_id", ordenId)
          .order("fecha_pago", { ascending: false });
        if (!cancelled) setPagos((data as unknown as PagoItem[]) ?? []);
      }
    }

    fetchRelacionados();
    return () => {
      cancelled = true;
    };
  }, [activeTab, ordenId, historial, repuestos, pagos, loadRepuestos]);

  return { historial, setHistorial, repuestos, pagos, loadRepuestos };
}
