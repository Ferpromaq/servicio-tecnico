"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { OrdenDetalle } from "../lib/types";

// Detalle principal de la orden
export function useOrdenDetalle(ordenId: string) {
  const [orden, setOrden] = useState<OrdenDetalle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchDetalle() {
      setLoading(true);
      const { data, error } = await supabase
        .from("ordenes_servicio")
        .select(
          `
  id,
  numero_orden,
  estado,
  created_at,
  updated_at,
  descripcion_problema,
  numero_boleta,
  diagnostico,
  garantia_ingreso,
  garantia_cubre_dano,
  razon_no_cubre,
  foto_dano_url,
  informe_no_reparada,
  entrega_forzada,
  motivo_entrega_forzada,
  entrega_marcada_en,
  entrega_marcada_por,
  entrega_marcada_por_usuario:usuarios!ordenes_servicio_entrega_marcada_por_fkey (
  nombre
),
  cliente:clientes (
    nombre_razon_social,
    rut,
    telefono,
    correo,
    direccion
  ),
  maquina:maquinas (
    id,
    nombre,
    marca,
    modelo,
    numero_serie,
    tipo
  ),
  tecnico:usuarios!ordenes_servicio_tecnico_id_fkey (
    nombre,
    telefono
  ),
  reparacion_autorizada_por,
  reparacion_autorizada_en,
  reparacion_autorizacion_motivo
  `,
        )
        .eq("id", ordenId)
        .single();

      if (!cancelled) {
        if (error) {
          console.error(error.message);
          setOrden(null);
        } else {
          setOrden(data as unknown as OrdenDetalle);
        }
        setLoading(false);
      }
    }

    fetchDetalle();
    return () => {
      cancelled = true;
    };
  }, [ordenId]);

  return { orden, setOrden, loading };
}
